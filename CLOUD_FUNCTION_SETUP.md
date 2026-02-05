# Email Reminder Cloud Function Setup Guide

## Overview

Email reminders are currently configured to send through **Firebase Cloud Functions**. This guide explains how to set up and deploy the Cloud Function to enable automated email reminders for pending tasks.

## Current Status

✅ **Frontend Ready**: The app has utility functions (`src/utils/emailReminder.js`) prepared for sending email reminders
✅ **Database Ready**: Firestore is configured to track reminder sending
⏳ **Cloud Function**: Not yet deployed - requires serverless function setup

## Why Cloud Functions?

Cloud Functions are Firebase's serverless compute solution that allows you to:
- Run background jobs without maintaining a server
- Scale automatically based on demand
- Pay only for what you use
- Trigger functions on Firestore changes or HTTP requests

## Step-by-Step Setup

### 1. **Install Firebase CLI**

```bash
npm install -g firebase-tools
```

### 2. **Initialize Cloud Functions in Your Project**

```bash
cd task-tracker
firebase init functions
```

Select:
- Use existing Firebase project
- JavaScript as your language
- Install dependencies with npm

### 3. **Create the Email Reminder Function**

Create a file: `functions/index.js`

```javascript
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

// Configure your email service (Gmail example)
// For Gmail: Enable "Less secure app access" or use App Passwords
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// HTTP-triggered function to send reminders
exports.sendTaskReminders = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore();
    
    // Get all pending tasks that are overdue
    const now = new Date();
    const tasksSnapshot = await db
      .collection("tasks")
      .where("status", "==", "pending")
      .where("dueDate", "<", now)
      .get();

    let remindersSent = 0;

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      
      // Check if reminder was already sent
      if (task.reminderSent) continue;

      // Get assigned user's email
      const userSnapshot = await db
        .collection("users")
        .doc(task.assignedTo)
        .get();
      
      if (!userSnapshot.exists) continue;

      const user = userSnapshot.data();
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Task Reminder: ${task.title}`,
        html: `
          <h2>Task Reminder</h2>
          <p>Hi ${user.name},</p>
          <p>You have a pending task that is overdue:</p>
          <p><strong>${task.title}</strong></p>
          <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
          <p>${task.description}</p>
          <p>Please log in to the app to update the status.</p>
          <br/>
          <p>Best regards,<br/>Task Tracker Team</p>
        `,
      };

      // Send email
      await transporter.sendMail(mailOptions);
      
      // Mark reminder as sent in Firestore
      await taskDoc.ref.update({
        reminderSent: true,
        reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      remindersSent++;
    }

    res.json({
      success: true,
      remindersSent: remindersSent,
      message: `${remindersSent} reminders sent successfully`,
    });
  } catch (error) {
    console.error("Error sending reminders:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Scheduled function to send reminders every day at 9 AM
exports.scheduledTaskReminders = functions.pubsub
  .schedule("0 9 * * *") // 9 AM daily (UTC)
  .onRun(async (context) => {
    try {
      const db = admin.firestore();
      
      const now = new Date();
      const tasksSnapshot = await db
        .collection("tasks")
        .where("status", "==", "pending")
        .where("dueDate", "<", now)
        .get();

      let remindersSent = 0;

      for (const taskDoc of tasksSnapshot.docs) {
        const task = taskDoc.data();
        
        if (task.reminderSent) continue;

        const userSnapshot = await db
          .collection("users")
          .doc(task.assignedTo)
          .get();
        
        if (!userSnapshot.exists) continue;

        const user = userSnapshot.data();
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: `Reminder: Task "${task.title}" is Overdue`,
          html: `
            <h2>⏰ Task Overdue Reminder</h2>
            <p>Hi ${user.name},</p>
            <p>You have an overdue task that needs attention:</p>
            <p><strong style="color: #f5576c; font-size: 18px;">${task.title}</strong></p>
            <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
            <p>${task.description}</p>
            <hr/>
            <p><a href="[YOUR_APP_URL]/dashboard" 
                   style="background-color: #667eea; color: white; padding: 10px 20px; 
                   text-decoration: none; border-radius: 5px; display: inline-block;">
              View Task in App
            </a></p>
            <br/>
            <p>Best regards,<br/>Task Tracker Team</p>
          `,
        };

        await transporter.sendMail(mailOptions);
        
        await taskDoc.ref.update({
          reminderSent: true,
          reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        remindersSent++;
      }

      console.log(`Scheduled reminder: ${remindersSent} emails sent`);
      return { remindersSent };
    } catch (error) {
      console.error("Error in scheduled reminders:", error);
      throw error;
    }
  });
```

### 4. **Update functions/package.json**

Add the nodemailer dependency:

```bash
cd functions
npm install nodemailer
cd ..
```

### 5. **Set Environment Variables**

Create `.env.local` in the `functions` directory:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**For Gmail:**
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Windows Computer" (or your device)
3. Generate an app password
4. Use this password in `EMAIL_PASSWORD`

### 6. **Deploy the Function**

```bash
firebase deploy --only functions
```

### 7. **Test the Function**

After deployment, you can trigger it manually:

```bash
# HTTP-triggered function
curl -X POST https://[REGION]-[PROJECT_ID].cloudfunctions.net/sendTaskReminders

# Or use Firebase Console → Functions → sendTaskReminders → Testing
```

## Alternative: Simple Solution (No Cloud Functions)

If you don't want to use Cloud Functions, you can use a third-party service:

### **Option A: Firebase Extensions - Stripe Email**
- Uses Firebase's pre-built email extension
- Minimal setup required
- Limited but functional

### **Option B: SendGrid**
Create a simple endpoint in your backend:

```javascript
// If you have a backend
app.post("/api/send-reminder", async (req, res) => {
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const msg = {
    to: req.body.email,
    from: "your-app@example.com",
    subject: req.body.subject,
    html: req.body.html,
  };

  try {
    await sgMail.send(msg);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **Option C: Browser-Based Solution**
For development/testing, modify `src/utils/emailReminder.js` to use a third-party email API:

```javascript
export const sendEmailReminder = async (userEmail, taskTitle, taskDueDate) => {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REACT_APP_RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "reminders@yourdomain.com",
        to: userEmail,
        subject: `Task Reminder: ${taskTitle}`,
        html: `<p>You have a pending task: <strong>${taskTitle}</strong></p>`,
      }),
    });
    return await response.json();
  } catch (error) {
    console.error("Error sending reminder:", error);
  }
};
```

## Current Frontend Implementation

Your app already has the groundwork:

**File:** `src/utils/emailReminder.js`
- `sendEmailReminder()` - Sends reminder to staff
- `getPendingOverdueTasks()` - Fetches overdue tasks
- `markReminderAsSent()` - Marks reminder as sent in Firestore

**Integration Points:**
- Admin Dashboard → "Send Reminder" button triggers the function
- Automatic checks for overdue tasks

## Cost Estimation

### Cloud Functions
- **Free Tier**: 2 million invocations per month
- **Cost**: $0.40 per million invocations
- For a typical company: Free or < $1/month

### Email Service
- **Gmail**: Free (limited to 500 emails/day)
- **SendGrid**: Free tier (100 emails/day), then $0.10-$9.99/month
- **Resend**: $20/month (unlimited)

## Troubleshooting

### "Email not sent"
- Check Firebase Console → Functions → Logs
- Verify email credentials are correct
- Check Firestore security rules allow the function to read/write

### "Function timeout"
- Increase function timeout in Firebase Console
- Default: 60 seconds (max: 540 seconds)

### "Permission denied"
- Update Firestore rules to allow Cloud Function access:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /tasks/{document=**} {
      allow read, write: if request.auth != null || request.auth.uid == null;
    }
  }
}
```

## Next Steps

1. Choose your email solution (Cloud Functions, SendGrid, or Resend)
2. Deploy the function
3. Test with a sample task
4. Monitor logs in Firebase Console

## Support

For questions about:
- **Firebase**: https://firebase.google.com/docs/functions
- **Nodemailer**: https://nodemailer.com
- **SendGrid**: https://sendgrid.com/docs
- **Resend**: https://resend.com/docs

---

**Note**: The email reminder feature is optional. Your app works perfectly without it. This guide is for implementing automated email notifications.
