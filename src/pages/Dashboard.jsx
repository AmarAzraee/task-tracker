import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, getDocs, getDoc, updateDoc, doc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/dashboard.css";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [myTasks, setMyTasks] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [modal, setModal] = useState({ show: false, type: "", message: "" });
  const [activeTab, setActiveTab] = useState("notifications");

  // In-app notifications
  const [notifications, setNotifications] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newNotifIds, setNewNotifIds] = useState([]);
  const newNotifTimersRef = useRef({});
  const prevNotifIdsRef = useRef([]);
  const [theme, setTheme] = useState("noir");
  const remindersSectionRef = useRef(null);
  const tasksSectionRef = useRef(null);


  useEffect(() => {
    if (!auth.currentUser) return;
    const notificationsRef = collection(db, "notifications");
    const q = query(notificationsRef, where("recipientUid", "==", auth.currentUser.uid), where("read", "==", false));
    const unsubscribe = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Detect newly arrived notifications compared to previous snapshot
      const currentIds = items.map(i => i.id);
      const added = currentIds.filter(id => !prevNotifIdsRef.current.includes(id));
      if (added.length > 0) {
        // mark as new to show pulse animation
        setNewNotifIds(prev => [...new Set([...prev, ...added])]);

        // remove pulse class after short delay per-notification
        added.forEach(id => {
          if (newNotifTimersRef.current[id]) clearTimeout(newNotifTimersRef.current[id]);
          newNotifTimersRef.current[id] = setTimeout(() => {
            setNewNotifIds(prev => prev.filter(x => x !== id));
            delete newNotifTimersRef.current[id];
          }, 2200);
        });
      }
      prevNotifIdsRef.current = currentIds;

      setNotifications(items);
      if (items.length > 0) {
        // show a quick modal/notice for the first new notification
        setModal({ show: true, type: "info", message: `${items[0].title} — ${items[0].body}` });
      }
    }, (err) => console.error("Notifications onSnapshot error:", err));

    return () => {
      unsubscribe();
      // clear any remaining timers on unmount
      Object.values(newNotifTimersRef.current).forEach(clearTimeout);
    };
  }, [auth.currentUser?.uid]);

  const markNotificationRead = async (id) => {
    try {
      const notifRef = doc(db, "notifications", id);
      await updateDoc(notifRef, { read: true, readAt: serverTimestamp() });
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("Error marking notification read", err);
    }
  };

  const openTaskFromNotification = async (n) => {
    try {
      await markNotificationRead(n.id);
      if (n.taskId) {
        const taskRef = doc(db, "tasks", n.taskId);
        const snap = await getDoc(taskRef);
        if (snap.exists()) {
          setSelectedTask({ id: snap.id, ...snap.data() });
        } else {
          setModal({ show: true, type: "error", message: "Task tidak ditemui." });
          setTimeout(() => setModal({ show: false, type: "", message: "" }), 2000);
        }
      } else {
        setModal({ show: true, type: "info", message: n.body });
        setTimeout(() => setModal({ show: false, type: "", message: "" }), 2000);
      }
    } catch (err) {
      console.error("Error opening task from notification:", err);
    }
  };

  useEffect(() => {
    if (!auth.currentUser) return;
    // Real-time tasks subscription so new tasks appear instantly

    const tasksRef = collection(db, "tasks");
    const unsubscribe = onSnapshot(tasksRef, (snap) => {
      const tasksData = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(t => t.assignedTo === auth.currentUser.uid || (Array.isArray(t.assignedTo) && t.assignedTo.includes(auth.currentUser.uid)));
      setMyTasks(tasksData);
    }, (err) => console.error("Tasks onSnapshot error:", err));

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  const fetchMyTasks = async () => {
    try {
      const tasksRef = collection(db, "tasks");
      const querySnapshot = await getDocs(tasksRef);
      
      const tasksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).filter(t => t.assignedTo === auth.currentUser.uid || (Array.isArray(t.assignedTo) && t.assignedTo.includes(auth.currentUser.uid)));
      
      setMyTasks(tasksData);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      
      setModal({
        show: true,
        type: "success",
        message: `Task status updated to ${newStatus.toUpperCase()} ✅`,
      });
      
      setTimeout(() => {
        setModal({ show: false, type: "", message: "" });
        fetchMyTasks();
      }, 2000);
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const parseDate = (value) => {
    if (!value) return null;
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endSoon = new Date(startOfToday);
  endSoon.setDate(endSoon.getDate() + 3);

  const overdueMyTasks = myTasks.filter((task) => {
    if (task.status !== "pending" || !task.dueDate) return false;
    const due = parseDate(task.dueDate);
    return due && due < startOfToday;
  });

  const dueSoonTasks = myTasks.filter((task) => {
    if (task.status !== "pending" || !task.dueDate) return false;
    const due = parseDate(task.dueDate);
    return due && due >= startOfToday && due <= endSoon;
  });

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString();
  };

  const filteredTasks = myTasks.filter(task => {
  if (filter === "all") return true;

  if (filter === "pending") {
    return task.status === "pending";
  }

  if (filter === "today") {
    if (task.status !== "pending" || !task.dueDate) return false;
    const due = parseDate(task.dueDate);
    return due && due >= startOfToday && due < endSoon;
  }

  return true;
});


  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

  

  return (
    <div className="dashboard-layout staff-layout">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>👤Staff Panel </h2>
          <button className="close-btn" onClick={() => setSidebarOpen(false)}>
            âœ•
          </button>
        </div>

        <nav className="sidebar-nav">
         <button
  className={activeTab === "notifications" ? "active" : ""}
  onClick={() => {
    setActiveTab("notifications");
    setSidebarOpen(false);
  }}
>
  Notifications
</button>

          <button
            onClick={() => {
              setActiveTab("reminders");
              remindersSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              setSidebarOpen(false);
            }}
          >
            Reminder Hub
          </button>
          <button
            onClick={() => {
              setActiveTab("tasks");
              tasksSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              setSidebarOpen(false);
            }}
          >
            Tasks
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
            â˜°
          </button>
          <h1>Staff Dashboard</h1>
        </header>

        <motion.div
      className={`dashboard theme-${theme}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="ambient-orbs">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
        <span className="orb orb-d" />
        <span className="orb orb-e" />
        <span className="orb orb-f" />
      </div>

      <div className="dashboard-header">
        <div className="header-left">
          <h1>👋 Welcome, {auth.currentUser?.displayName || auth.currentUser?.email || "User"}</h1>
          <p className="staff-subtitle">Your Assigned Tasks</p>
        </div>

        <div className="header-actions">
          {/* Notifications */}
          {notifications.length > 0 && (
            <button
              className={`notif-btn ${newNotifIds.length > 0 ? "pulse" : ""}`}
              onClick={() => {
                // mark all as read
                notifications.forEach(n => markNotificationRead(n.id));
                setModal({ show: true, type: "info", message: `${notifications.length} notification(s) marked read` });
                setTimeout(() => setModal({ show: false, type: "", message: "" }), 2000);
              }}
              title="Mark all notifications read"
            >
              🔔 {notifications.length}
            </button>
          )}
          <button
            type="button"
            className="theme-btn"
            onClick={() => setTheme((prev) => (prev === "noir" ? "aurora" : "noir"))}
          >
            Theme: {theme === "noir" ? "Noir" : "Aurora"}
          </button>
        </div>
      </div>

      {/* Notifications list section */}
      {activeTab === "notifications" && (
  <div className="section">
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
      <h2>Notifications</h2>
      {notifications.length > 0 && (
        <button
          type="button"
          className="open-btn"
          onClick={async () => {
            try {
              const ids = notifications.map(n => n.id);
              for (const id of ids) await markNotificationRead(id);
              setNotifications([]);
              setModal({ show: true, type: 'info', message: `${ids.length} notification(s) marked read` });
              setTimeout(() => setModal({ show: false, type: '', message: '' }), 2000);
            } catch (err) {
              console.error('Error marking all notifications read', err);
            }
          }}
        >
          Mark all read
        </button>
      )}
    </div>
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <h3>You are all caught up</h3>
            <p>No new notifications right now. Check your tasks for updates.</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map(n => (
              <div className={`notification-item ${newNotifIds.includes(n.id) ? 'pulse' : ''}`} key={n.id}>
                <div className="notif-info">
                  <div className="notif-title">
                    <strong>{n.title}</strong>
                    <span className="notif-time">{formatNotificationTime(n.createdAt)}</span>
                  </div>
                  <div>{n.body}</div>
                  <small>{n.createdAt && n.createdAt.toDate ? n.createdAt.toDate().toLocaleString() : ''}</small>
                </div>
                <div className="notif-actions">
                  <button className="primary-btn" onClick={() => markNotificationRead(n.id)}>Mark read</button>
                  <button className="open-btn" onClick={() => openTaskFromNotification(n)} aria-label={`Open notification ${n.title}`}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14" aria-hidden="true">
                      <path d="M5 12h14" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 5l7 7-7 7" stroke="var(--text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Open
                  </button>
                </div>
              </div>
            ))} 
          </div>
        )}
      </div>
    
    )}

      {activeTab === "reminders" && (
  <div className="section reminder-hub" ref={remindersSectionRef}>

        <div className="reminder-header">
          <h2>Reminder Hub</h2>
          <span className={`overdue-badge ${overdueMyTasks.length > 0 ? "pulse" : ""}`}>
            {overdueMyTasks.length}
          </span>
        </div>
        <div className="reminder-cards">
          <div className="reminder-card">
            <div className="reminder-label">Overdue</div>
            <div className="reminder-value">{overdueMyTasks.length}</div>
            <div className="reminder-sub">Pending tasks past due</div>
            <button  className="open-btn" onClick={() => {
              setFilter("pending");
              setActiveTab("tasks");
            }}
            >
              View Pending
            </button>
          </div>
          <div className="reminder-card">
            <div className="reminder-label">Due Soon</div>
            <div className="reminder-value">{dueSoonTasks.length}</div>
            <div className="reminder-sub">Next 3 days</div>
            <button  className="open-btn" onClick={() => {
              setFilter("today");
              setActiveTab("tasks");
            }}
            >
              Focus Today
            </button>
          </div>
        </div>
        <div className="reminder-list">
          {overdueMyTasks.length === 0 && dueSoonTasks.length === 0 ? (
            <div className="empty-state compact">
              <div className="empty-icon">✅</div>
              <p>No urgent tasks right now.</p>
            </div>
          ) : (
            [...overdueMyTasks, ...dueSoonTasks].slice(0, 3).map((task) => (
              <div className="reminder-item" key={task.id}>
                <div className="reminder-main">
                  <strong>{task.title}</strong>
                  <div className="reminder-meta">Due: {task.dueDate || "No date"}</div>
                </div>
                <button
  className="open-btn"
  onClick={() => {
    setSelectedTask(task);
    setActiveTab("tasks");
  }}
>
  Open
</button>

              </div>
            ))
          )}
        </div>
      
   </div>
   
   
)}


      {activeTab === "tasks" && (
  <div className="dashboard-content" ref={tasksSectionRef}>

        {/* FILTER SECTION */}
        <div className="filter-section">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All Tasks ({myTasks.length})
          </button>
          <button
            className={`filter-btn ${filter === "pending" ? "active" : ""}`}
            onClick={() => setFilter("pending")}
          >
            Pending ({myTasks.filter(t => t.status === "pending").length})
          </button>
          <button
            className={`filter-btn ${filter === "completed" ? "active" : ""}`}
            onClick={() => setFilter("completed")}
          >
            Completed ({myTasks.filter(t => t.status === "completed").length})
          </button>
        </div>

        {/* TASKS LIST */}
        <div className="tasks-container">
          {filteredTasks.length === 0 ? (
            <motion.div
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="empty-icon">🗂️</div>
              <h3>
                {filter === "all"
                  ? "Tiada tasks yang dipunyai."
                  : `Tiada ${filter} tasks.`}
              </h3>
              <p>Stay ready. New tasks will appear here automatically.</p>
              {filter !== "all" && (
                <button type="button" className="open-btn" onClick={() => setFilter("all")}>
                  View All Tasks
                </button>
              )}
            </motion.div>
          ) : (
            <div className="tasks-grid">
              {filteredTasks.map((task) => (
                <motion.div
                  key={task.id}
                  className={`task-card ${task.status}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="task-header">
                    <h3>{task.title}</h3>
                    <span className={`status-badge ${task.status}`}>
                      {task.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="task-description">
                    {task.description ? task.description.split('\n').filter(Boolean).map((line, idx) => (
                      <p key={idx}>{line}</p>
                    )) : null}
                  </div>

                  <div className="task-info">
                    {task.dueDate && (
                      <p>
                        📅 <strong>Due Date:</strong> {task.dueDate}
                      </p>
                    )}
                    <p>
                      🎯 <strong>Priority:</strong>{" "}
                      <span className={`priority-badge ${task.priority}`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </p>
                  </div>



                  {/* ACTION BUTTONS */}
                  <div className="task-actions">
                    {task.status === "pending" && (
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                        className="complete-btn"
                      >
                        ✅ Mark as Complete
                      </button>
                    )}
                    {task.status === "completed" && (
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, "pending")}
                        className="reopen-btn"
                      >
                        🔄 Reopen Task
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Task detail modal */}
        {selectedTask && (
          <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
            <div className="modal-content info" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon">📌</div>
              <h3>{selectedTask.title}</h3>
              <div>
                {selectedTask.description ? selectedTask.description.split('\n').filter(Boolean).map((line, idx) => (
                  <p key={idx}>{line}</p>
                )) : null}
              </div>
              {selectedTask.dueDate && <p>📅 <strong>Due:</strong> {selectedTask.dueDate}</p>}
              <p>🎯 <strong>Priority:</strong> {selectedTask.priority}</p>
              <p><strong>Status:</strong> {selectedTask.status}</p>
              <div style={{marginTop:12}}>
                {selectedTask.status === "pending" ? (
                  <button className="primary-btn" onClick={async () => {
                    await handleUpdateTaskStatus(selectedTask.id, "completed");
                    setSelectedTask(null);
                  }}>Mark Complete</button>
                ) : (
                  <button className="open-btn" onClick={async () => {
                    await handleUpdateTaskStatus(selectedTask.id, "pending");
                    setSelectedTask(null);
                  }}>Reopen Task</button>
                )}
                <button className="logout-btn" onClick={() => setSelectedTask(null)} style={{marginLeft:8}}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* MODAL */}
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
  </div>
  </div>
  );
}

