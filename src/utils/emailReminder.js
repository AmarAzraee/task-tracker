import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/firebase";

/**
 * Send email reminder to staff for pending tasks
 * - Requires a deployed Firebase Cloud Function `sendReminder` (HTTPS) that verifies Firebase ID token
 * - Use SendGrid or other email provider inside the Cloud Function
 */
export const sendEmailReminder = async (staffUid, staffEmail, staffName, taskTitle) => {
  try {
    // Get current user's ID token to authenticate the request to the Cloud Function
    const currentUser = auth.currentUser;
    const idToken = currentUser ? await currentUser.getIdToken(/* forceRefresh */ false) : null;

    const response = await fetch(
      "https://us-central1-task-tracker-auth-amar.cloudfunctions.net/sendReminder",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          email: staffEmail,
          name: staffName,
          taskTitle: taskTitle,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Cloud Function error response:", response.status, text);
      throw new Error(`Failed to send email (status ${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending email reminder:", error);
    throw error;
  }
};

/**
 * Get all pending tasks that are overdue
 */
export const getPendingOverdueTasks = async () => {
  try {
    const tasksRef = collection(db, "tasks");
    const q = query(tasksRef, where("status", "==", "pending"));
    const querySnapshot = await getDocs(q);
    
    const now = new Date();
    const overdueTasks = [];

    querySnapshot.forEach((doc) => {
      const task = { id: doc.id, ...doc.data() };
      if (task.dueDate && new Date(task.dueDate) < now) {
        overdueTasks.push(task);
      }
    });

    return overdueTasks;
  } catch (error) {
    console.error("Error getting overdue tasks:", error);
    throw error;
  }
};

/**
 * Mark reminder as sent for a task
 */
export const markReminderAsSent = async (taskId) => {
  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      lastReminderSent: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking reminder as sent:", error);
    throw error;
  }
};
