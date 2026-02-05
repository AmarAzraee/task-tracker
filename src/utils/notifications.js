import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/firebase";

export const sendInAppReminder = async (recipientUid, title, body, taskId = null) => {
  const notificationsRef = collection(db, "notifications");
  const docRef = await addDoc(notificationsRef, {
    recipientUid,
    title,
    body,
    taskId,
    read: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const markNotificationAsRead = async (notificationId) => {
  const ref = doc(db, "notifications", notificationId);
  await updateDoc(ref, { read: true, readAt: serverTimestamp() });
};
