import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/login.css"; // can reuse CSS for login
import { auth, db } from "../firebase/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("staff"); // admin or staff
  const [modal, setModal] = useState({ show: false, type: "", message: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setModal({
        show: true,
        type: "error",
        message: "Please enter your name.",
      });
      return;
    }

    try {
      // Buat user account dengan email dan password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const userId = userCredential.user.uid;
      console.log("User signed up:", userCredential.user);

      // Simpan user data ke Firestore
      await addDoc(collection(db, "users"), {
        uid: userId,
        name: name,
        email: email,
        role: role, // admin or staff
        createdAt: serverTimestamp(),
      });

      console.log("User data saved to Firestore");

      setModal({
        show: true,
        type: "success",
        message: "Account created successfully! 🎉",
      });

      setEmail("");
      setPassword("");
      setName("");
      setRole("staff");

      setTimeout(() => {
        setModal({ show: false, type: "", message: "" });
        navigate("/login", { replace: true }); // back to login
      }, 2000);
    } catch (err) {
      console.error(err);
      setModal({
        show: true,
        type: "error",
        message: err.message || "Sign up failed. Please try again.",
      });

      setTimeout(
        () => setModal({ show: false, type: "", message: "" }),
        3000
      );
    }
  };

  return (
    <motion.div
      className="login-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.div
        className="glass-card"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h1>Task Tracker</h1>
        <p className="login-subtitle">Create a new account</p>

        <form onSubmit={handleSubmit} className="login-form">
          {/* NAME */}
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

          {/* EMAIL */}
          <div className="input-group">
            <input
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label>Email</label>
          </div>

          {/* PASSWORD */}
          <div className="input-group">
            <input
              type="password"
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <label>Password</label>
          </div>

          {/* ROLE SELECTION */}
          <div className="input-group">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="role-select"
              required
            >
              <option value="staff">Staff (Check Assigned Tasks)</option>
              <option value="admin">Admin/Manager (Create & Assign Tasks)</option>
            </select>
            
          </div>

          <motion.button
            type="submit"
            className="login-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Up
          </motion.button>
        </form>

        <p className="login-footer">
          <span className="hint">Already have an account? <Link to="/login">Login here</Link></span>
        </p>
      </motion.div>

      {/* MODAL */}
      <AnimatePresence>
        {modal.show && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() =>
              setModal({ show: false, type: "", message: "" })
            }
          >
            <motion.div
              className={`modal-content ${modal.type}`}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon">
                {modal.type === "success" ? "✅" : "❌"}
              </div>
              <p>{modal.message}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

