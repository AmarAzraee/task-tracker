const functions = require("firebase-functions");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();
const db = admin.firestore();

// Configure SendGrid API key from functions config: functions.config().sendgrid.key
if (functions.config().sendgrid && functions.config().sendgrid.key) {
  sgMail.setApiKey(functions.config().sendgrid.key);
} else {
  console.warn("SendGrid API key not set. Set it with: firebase functions:config:set sendgrid.key=\"KEY\" sendgrid.from=\"from@domain.com\"");
}

/**
 * sendReminder
 * HTTP function that sends a single reminder email.
 * Expects Authorization: Bearer <Firebase ID token>
 * Body: { email, name, taskTitle }
 */
exports.sendReminder = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).send("Method not allowed");

    const authHeader = req.get("Authorization") || "";
    const match = authHeader.match(/^Bearer (.*)$/);
    if (!match) return res.status(401).send("Unauthorized: missing token");

    const idToken = match[1];
    await admin.auth().verifyIdToken(idToken);

    const { email, name, taskTitle } = req.body || {};
    if (!email || !taskTitle) return res.status(400).send("Missing required fields");

    const msg = {
      to: email,
      from: (functions.config().sendgrid && functions.config().sendgrid.from) || "no-reply@example.com",
      subject: `Reminder: ${taskTitle}`,
      text: `Hi ${name || ""},\n\nThis is a reminder for task: ${taskTitle}.\n\nRegards,\nTask Tracker`,
      html: `<p>Hi ${name || ""},</p><p>This is a reminder for task: <strong>${taskTitle}</strong>.</p><p>Regards,<br/>Task Tracker</p>`,
    };

    await sgMail.send(msg);

    return res.json({ success: true });
  } catch (err) {
    console.error("sendReminder error:", err);
    return res.status(500).send(err.message || "Internal error");
  }
});

/**
 * sendOverdueReminders
 * Scheduled function (daily) that finds overdue pending tasks and sends reminders (idempotent per lastReminderSent)
 */
exports.sendOverdueReminders = functions.pubsub.schedule('every 24 hours').onRun(async () => {
  try {
    if (!sgMail) {
      console.warn("SendGrid not configured - skipping scheduled reminders");
      return null;
    }

    const tasksRef = db.collection("tasks");
    const q = tasksRef.where("status", "==", "pending");
    const snapshot = await q.get();

    const jobs = [];

    snapshot.forEach((docSnap) => {
      const task = { id: docSnap.id, ...docSnap.data() };

      if (!task.dueDate) return;

      // Try to parse dueDate (support string dates used in client)
      const due = new Date(task.dueDate);
      if (isNaN(due.getTime())) return;

      if (due < new Date()) {
        // Check lastReminderSent
        const lastSent = task.lastReminderSent ? task.lastReminderSent.toDate() : null;
        const shouldSend = !lastSent || (new Date() - lastSent) > (24 * 60 * 60 * 1000);
        if (shouldSend && task.assignedTo && task.assignedEmail) {
          jobs.push({ taskId: task.id, email: task.assignedEmail, name: task.assignedName || "", title: task.title });
        }
      }
    });

    // Send emails sequentially (could be parallelized)
    for (const job of jobs) {
      try {
        const msg = {
          to: job.email,
          from: (functions.config().sendgrid && functions.config().sendgrid.from) || "no-reply@example.com",
          subject: `Reminder: ${job.title}`,
          text: `Hi ${job.name || ""},\n\nThis is a reminder for task: ${job.title}.\n\nRegards,\nTask Tracker`,
          html: `<p>Hi ${job.name || ""},</p><p>This is a reminder for task: <strong>${job.title}</strong>.</p><p>Regards,<br/>Task Tracker</p>`,
        };

        await sgMail.send(msg);
        await db.collection("tasks").doc(job.taskId).update({ lastReminderSent: admin.firestore.FieldValue.serverTimestamp() });
      } catch (err) {
        console.error("Failed sending reminder for task", job.taskId, err);
      }
    }

    return null;
  } catch (err) {
    console.error("sendOverdueReminders error:", err);
    return null;
  }
});
