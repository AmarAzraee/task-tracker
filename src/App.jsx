import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "./firebase/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CompleteProfile from "./pages/CompleteProfile";

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);

  const handleProfileCompleted = (role) => {
    setUserRole(role);
    setNeedsProfile(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("onAuthStateChanged:", currentUser);
      try {
        if (currentUser) {
          setUser(currentUser);
          // Get user role from Firestore
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("uid", "==", currentUser.uid));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            setUserRole(userData.role);
            console.log("Fetched user role:", userData.role);
          } else {
            console.warn("No user document found for uid:", currentUser.uid);
            // Tandakan pengguna perlu lengkapkan profil
            setUserRole(null);
            setNeedsProfile(true);
            console.log("Redirecting user to complete profile:", currentUser.uid);
          }
        } else {
          setUser(null);
          setUserRole(null);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-darker) 50%, var(--accent-pink) 100%)",
        color: "var(--text)",
        fontSize: "24px",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        margin: 0,
        padding: 0
      }} >
        <div style={{
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "48px",
            marginBottom: "20px",
            animation: "spin 2s linear infinite"
          }}>⏳</div>
          <div>Loading your workspace...</div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  function RequireProfile({ children }) {
    const location = useLocation();
    // Force users with incomplete profile to /complete-profile (but allow access if already on that page)
    if (needsProfile && location.pathname !== "/complete-profile") {
      return <Navigate to="/complete-profile" replace />;
    }
    return children;
  }

  return (
    <Router>
      <RequireProfile>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              userRole ? (
                <Navigate to={userRole === "admin" ? "/admin-dashboard" : "/dashboard"} replace />
              ) : needsProfile ? (
                <Navigate to="/complete-profile" replace />
              ) : (
                <div style={{ padding: 20, textAlign: "center" }}>Loading profile...</div>
              )
            ) : (
              <Signup />
            )
          }
        />

        <Route
          path="/login"
          element={
            user ? (
              userRole ? (
                <Navigate to={userRole === "admin" ? "/admin-dashboard" : "/dashboard"} replace />
              ) : needsProfile ? (
                <Navigate to="/complete-profile" replace />
              ) : (
                <div style={{ padding: 20, textAlign: "center" }}>Loading profile...</div>
              )
            ) : (
              <Login />
            )
          }
        />

        <Route
          path="/complete-profile"
          element={
            user ? (
              needsProfile ? (
                <CompleteProfile user={user} onComplete={handleProfileCompleted} />
              ) : (
                <Navigate to={userRole === "admin" ? "/admin-dashboard" : "/dashboard"} replace />
              )
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            !user ? (
              <Navigate to="/" replace />
            ) : needsProfile ? (
              <Navigate to="/complete-profile" replace />
            ) : userRole === "staff" ? (
              <Dashboard />
            ) : userRole === null ? (
              <div style={{ padding: 20, textAlign: "center" }}>Loading profile...</div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/admin-dashboard"
          element={
            !user ? (
              <Navigate to="/" replace />
            ) : needsProfile ? (
              <Navigate to="/complete-profile" replace />
            ) : userRole === "admin" ? (
              <AdminDashboard />
            ) : userRole === null ? (
              <div style={{ padding: 20, textAlign: "center" }}>Loading profile...</div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </RequireProfile>
    </Router>
  );
}

export default App;
