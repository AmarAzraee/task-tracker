import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { motion } from "framer-motion";
import "../styles/login.css";

export default function CompleteProfile({ user, onComplete }) {
  const [name, setName] = useState(user.displayName || (user.email || "").split("@")[0] || "");
  const [role, setRole] = useState("staff");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setMessage("Please enter your name.");

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Update existing
        const userDocRef = doc(db, "users", querySnapshot.docs[0].id);
        await updateDoc(userDocRef, {
          name,
          role,
          email: user.email || "",
          updatedAt: serverTimestamp(),
        });
      } else {
        // Create new
        await addDoc(usersRef, {
          uid: user.uid,
          name,
          email: user.email || "",
          role,
          createdAt: serverTimestamp(),
        });
      }

      setMessage("Profile saved successfully! Redirecting...");
      onComplete(role);
      setTimeout(() => {
        navigate(role === "admin" ? "/admin-dashboard" : "/dashboard", { replace: true });
      }, 1200);
    } catch (err) {
      console.error("Error saving profile:", err);
      setMessage("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="login-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="glass-card"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2>Complete Your Profile</h2>
        <p className="login-subtitle">Please complete your profile information.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input
              type="text"
              placeholder=" "
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <label>Your Name</label>
          </div>

          <div className="input-group">
            <select value={role} onChange={(e) => setRole(e.target.value)} required className="role-select">
              <option value="staff">Staff (See Assigned Tasks)</option>
              <option value="admin">Admin (Create & Manage Tasks)</option>
            </select>
            <label>Your Role</label>
          </div>

          <motion.button type="submit" className="login-btn" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </motion.button>

          {message && <p style={{ marginTop: 12 }}>{message}</p>}
        </form>

      </motion.div>
    </motion.div>
  );
}
