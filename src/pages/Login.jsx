import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/login.css";
import { auth } from "../firebase/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

console.log("Firebase Auth:", auth);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modal, setModal] = useState({ show: false, type: "", message: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in:", userCredential.user);
      setModal({ show: true, type: "success", message: "Login successful! 🎉" });
      setEmail("");
      setPassword("");
      setTimeout(() => {
        setModal({ show: false, type: "", message: "" });
        navigate("/dashboard", { replace: true }); // Redirect to dashboard
      }, 2000);
    } catch (err) {
      console.error(err);
      setModal({ show: true, type: "error", message: "Login failed. Please check your email and password." });
      setTimeout(() => setModal({ show: false, type: "", message: "" }), 3000);
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
        <p className="login-subtitle">Welcome back. Please login.</p>

        <form onSubmit={handleSubmit} className="login-form">

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
            />
            <label>Password</label>
          </div>

          <motion.button
            type="submit"
            className="login-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign In
          </motion.button>

        </form>

        <span className="hint">Forgot password?</span>
        <p className="login-footer">
          <span className="hint">Don't have an account? <Link to="/signup">Sign up here</Link></span>
        </p>
        <p className="login-footer">© 2026 Task Tracker</p>
      </motion.div>

      {/* MODAL POPUP */}
      <AnimatePresence>
        {modal.show && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setModal({ show: false, type: "", message: "" })}
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



