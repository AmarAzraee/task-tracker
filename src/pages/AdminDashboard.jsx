import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, serverTimestamp, orderBy, limit, Timestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { sendEmailReminder, markReminderAsSent } from "../utils/emailReminder";
import { sendInAppReminder } from "../utils/notifications";

import "../styles/dashboard.css";

// Ringkas: komponen dashboard untuk admin
export default function AdminDashboard() {
  const [tasks, setTasks] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const formRef = useRef(null);
  // Image upload disabled to avoid storage billing
  const [users, setUsers] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
    const [theme, setTheme] = useState("noir");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: [],
    dueDate: "",
    priority: "medium",
  });
  const [modal, setModal] = useState({ show: false, type: "", message: "" });
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [loadingArchive, setLoadingArchive] = useState(true);

  // Ringkas: kira senarai task overdue bila tasks berubah
  useEffect(() => {
    // compute overdue tasks whenever tasks list updates
    const now = new Date();
    const overdue = tasks.filter(t => t.status === "pending" && t.dueDate && new Date(t.dueDate) < now);
    setOverdueTasks(overdue);
  }, [tasks]);

  // Silent send used for batch sending to avoid many modals
  // Ringkas: hantar reminder secara senyap untuk satu task
  const sendReminderSilent = async (task) => {
    try {
      const assignedUids = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
      if (assignedUids.length === 0) return;
      const assignedEmails = Array.isArray(task.assignedEmails) ? task.assignedEmails : (task.assignedEmail ? [task.assignedEmail] : []);
      const assignedNames = Array.isArray(task.assignedNames) ? task.assignedNames : (task.assignedName ? [task.assignedName] : []);

      for (const [i, uid] of assignedUids.entries()) {
        try {
          await sendInAppReminder(uid, `Reminder: ${task.title}`, `Please complete task: ${task.title}`, task.id);
        } catch (e) {
          console.warn(e);
        }

        const staffEmail = assignedEmails[i] || users.find(u => u.uid === uid)?.email;
        const staffName = assignedNames[i] || users.find(u => u.uid === uid)?.name || "";
        if (staffEmail) {
          try { await sendEmailReminder(uid || "", staffEmail, staffName, task.title); } catch (e) { console.warn(e); }
        }
      }

      await markReminderAsSent(task.id);
    } catch (err) {
      console.error("sendReminderSilent err", err);
    }
  };

  // Ringkas: hantar reminder untuk semua task overdue
  const sendRemindersToAll = async () => {
    if (overdueTasks.length === 0) {
      setModal({ show: true, type: "info", message: "No overdue tasks." });
      setTimeout(() => setModal({ show: false, type: "", message: "" }), 2000);
      return;
    }

    try {
      for (const t of overdueTasks) {
        // don't await user-visible modals
        await sendReminderSilent(t);
      }

      await logActivity({
        type: "batch",
        message: `Batch reminders sent for ${overdueTasks.length} overdue tasks`,
        meta: { count: overdueTasks.length },
      });

      setModal({ show: true, type: "success", message: "Reminders sent to all overdue tasks." });
      setTimeout(() => {
        setModal({ show: false, type: "", message: "" });
        fetchTasks();
        fetchActivityLogs();
      }, 2000);
    } catch (err) {
      console.error(err);
      setModal({ show: true, type: "error", message: "Failed to send some reminders." });
    }
  };

  // Ringkas: load data utama bila user login/bertukar
  useEffect(() => {
    if (auth.currentUser) {
      fetchTasks();
      fetchUsers();
      fetchActivityLogs();
      fetchArchivedTasks();
    }
  }, [auth.currentUser?.uid]);

  // Ringkas: simpan rekod aktiviti admin ke Firestore
  const logActivity = async ({ type, message, taskId = null, meta = {} }) => {
    try {
      await addDoc(collection(db, "activityLogs"), {
        type,
        message,
        taskId: taskId || null,
        meta,
        actorId: auth.currentUser?.uid || "system",
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Activity log failed:", err);
    }
  };

  // Ringkas: ambil semua tasks dari Firestore
  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      const tasksRef = collection(db, "tasks");
      const querySnapshot = await getDocs(tasksRef);
      const tasksData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTasks(tasksData);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  // Ringkas: ambil log aktiviti terkini
  const fetchActivityLogs = async () => {
    try {
      setLoadingActivity(true);
      const activityRef = collection(db, "activityLogs");
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
      const q = query(
        activityRef,
        where("createdAt", ">=", cutoffTimestamp),
        orderBy("createdAt", "desc"),
        limit(20)
      );
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setActivityLogs(logs);
    } catch (err) {
      console.error("Error fetching activity logs:", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  // Ringkas: ambil arkib task yang telah dipadam
  const fetchArchivedTasks = async () => {
    try {
      setLoadingArchive(true);
      const archiveRef = collection(db, "tasksArchive");
      const q = query(archiveRef, orderBy("deletedAt", "desc"), limit(50));
      const snapshot = await getDocs(q);
      const archives = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setArchivedTasks(archives);
    } catch (err) {
      console.error("Error fetching archived tasks:", err);
    } finally {
      setLoadingArchive(false);
    }
  };

  // Ringkas: ambil senarai staff untuk assign task
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("role", "==", "staff"));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

    // Ringkas: create/update task berdasarkan form
    const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      if (!taskForm.title || !taskForm.assignedTo || (Array.isArray(taskForm.assignedTo) && taskForm.assignedTo.length === 0)) {
        setModal({
          show: true,
          type: "error",
          message: "Sila isi semua field yang wajib.",
        });
        return;
      }

      // Resolve assigned user(s) info so reminders can be sent later
      const assignedUids = Array.isArray(taskForm.assignedTo) ? taskForm.assignedTo : (taskForm.assignedTo ? [taskForm.assignedTo] : []);
      const assignedEmails = assignedUids.map(uid => users.find(u => u.uid === uid)?.email || "");
      const assignedNames = assignedUids.map(uid => users.find(u => u.uid === uid)?.name || "");

      if (editingTask) {
        // Update existing task
        const taskRef = doc(db, "tasks", editingTask.id);
        await updateDoc(taskRef, {
          ...taskForm,
          assignedTo: assignedUids,
          assignedEmails,
          assignedNames,
          updatedAt: serverTimestamp(),
        });
        await logActivity({
          type: "update",
          message: `Task updated: ${taskForm.title}`,
          taskId: editingTask.id,
        });
        setModal({
          show: true,
          type: "success",
          message: "Task berjaya dikemaskini! ✅",
        });
      } else {
        // Create new task
        const docRef = await addDoc(collection(db, "tasks"), {
          ...taskForm,
          assignedTo: assignedUids,
          assignedEmails,
          assignedNames,
          status: "pending",
          createdBy: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        });
        await logActivity({
          type: "create",
          message: `Task created: ${taskForm.title}`,
          taskId: docRef.id,
        });
        // Send immediate in-app notification to each assigned staff (if any)
        if (assignedUids.length > 0) {
          for (const uid of assignedUids) {
            try {
              await sendInAppReminder(uid, `New Task: ${taskForm.title}`, `You have been assigned a new task: ${taskForm.title}`, docRef.id);
            } catch (e) {
              console.warn("Failed to send in-app notification on create to", uid, e);
            }
          }
        }
        setModal({
          show: true,
          type: "success",
          message: "Task berjaya ditambah! ✅",
        });
      }

      setTaskForm({
        title: "",
        description: "",
        assignedTo: [],
        dueDate: "",
        priority: "medium",
      });
      setEditingTask(null);
      setShowTaskForm(false);

      setTimeout(() => {
        setModal({ show: false, type: "", message: "" });
        fetchTasks();
        fetchActivityLogs();
      }, 2000);
    } catch (err) {
      console.error("Error:", err);
      setModal({
        show: true,
        type: "error",
        message: "Gagal menyimpan task. Cuba lagi.",
      });
    }
  };

    // Ringkas: padam task dan log aktiviti
    const handleDeleteTask = async (taskId) => {
    if (window.confirm("Yakin nak delete task ni?")) {
      try {
        const taskToDelete = tasks.find((task) => task.id === taskId);
          if (taskToDelete) {
            await addDoc(collection(db, "tasksArchive"), {
              ...taskToDelete,
              originalTaskId: taskToDelete.id,
              deletedBy: auth.currentUser?.uid || "system",
              deletedAt: serverTimestamp(),
            });
          }
        await deleteDoc(doc(db, "tasks", taskId));
        await logActivity({
          type: "delete",
          message: `Task deleted: ${taskToDelete?.title || "Untitled Task"}`,
          taskId,
        });
        setModal({
          show: true,
          type: "success",
          message: "Task berjaya didelete! 🗑️",
        });
        setTimeout(() => {
          setModal({ show: false, type: "", message: "" });
          fetchTasks();
          fetchActivityLogs();
            fetchArchivedTasks();
        }, 2000);
      } catch (err) {
        console.error("Error deleting task:", err);
      }
    }
  };

  // Ringkas: buka form edit dan prefill data task
  const handleEditTask = (task) => {
    console.log("handleEditTask: opening form for task", task.id);
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []),
      dueDate: task.dueDate,
      priority: task.priority,
    });
    setShowTaskForm(true);

    // allow render then scroll into view for better UX
    setTimeout(() => {
      try { 
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = formRef.current?.querySelector('input, textarea, select');
        firstInput?.focus();
      } catch { /* ignore */ }
    }, 80);
  };

  // Ringkas: bina nama staff yang ditugaskan
  const getAssignedNames = (task) => {
    if (Array.isArray(task.assignedNames) && task.assignedNames.length) return task.assignedNames.join(", ");
    if (Array.isArray(task.assignedTo) && task.assignedTo.length) return task.assignedTo.map(uid => users.find(u => u.uid === uid)?.name).filter(Boolean).join(", ");
    if (task.assignedName) return task.assignedName;
    return "Unknown";
  };

  const navigate = useNavigate();

  // Ringkas: log keluar dan kembali ke halaman utama
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Error logging out:", err);
    }
  };

    // Ringkas: hantar reminder untuk satu task
    const handleSendReminder = async (task) => {
    try {
      // Prefer explicit data saved on task, otherwise fallback to users lookup
      const assignedUids = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
      if (assignedUids.length === 0) {
        setModal({ show: true, type: "error", message: "Staff UID not found to send in-app reminder." });
        return;
      }

      const assignedEmails = Array.isArray(task.assignedEmails) ? task.assignedEmails : (task.assignedEmail ? [task.assignedEmail] : []);
      const assignedNames = Array.isArray(task.assignedNames) ? task.assignedNames : (task.assignedName ? [task.assignedName] : []);

      for (const [i, uid] of assignedUids.entries()) {
        try {
          await sendInAppReminder(uid, `Reminder: ${task.title}`, `Please complete task: ${task.title}`, task.id);
        } catch (e) {
          console.warn("In-app reminder failed for", uid, e);
        }

        const staffEmail = assignedEmails[i] || users.find(u => u.uid === uid)?.email;
        const staffName = assignedNames[i] || users.find(u => u.uid === uid)?.name || "";
        if (staffEmail) {
          try {
            await sendEmailReminder(uid || "", staffEmail, staffName, task.title);
          } catch (e) {
            console.warn("Email reminder failed (fallback):", e);
          }
        }
      }

      // Mark reminder as sent
      await markReminderAsSent(task.id);
      await logActivity({
        type: "reminder",
        message: `Reminder sent: ${task.title}`,
        taskId: task.id,
        meta: { count: assignedUids.length },
      });

      setModal({ show: true, type: "success", message: `In-app reminder(s) sent to ${assignedUids.length} staff(s)! 🔔` });

      setTimeout(() => {
        setModal({ show: false, type: "", message: "" });
        fetchTasks();
        fetchActivityLogs();
      }, 2000);
    } catch (err) {
      console.error("Error sending reminder:", err);
      setModal({ show: true, type: "error", message: "Failed to send reminder. Please try again." });
    }
  };
  // Ringkas: format masa aktiviti untuk paparan
  const getActivityTime = (log) => {
    if (!log?.createdAt) return "Unknown time";
    if (log.createdAt.toDate) return log.createdAt.toDate().toLocaleString();
    if (typeof log.createdAt === "string") return log.createdAt;
    try {
      return new Date(log.createdAt).toLocaleString();
    } catch {
      return "Unknown time";
    }
  };

  // Ringkas: format masa arkib task
  const getArchiveTime = (archive) => {
    if (!archive?.deletedAt) return "Unknown time";
    if (archive.deletedAt.toDate) return archive.deletedAt.toDate().toLocaleString();
    if (typeof archive.deletedAt === "string") return archive.deletedAt;
    try {
      return new Date(archive.deletedAt).toLocaleString();
    } catch {
      return "Unknown time";
    }
  };

  // Ringkas: label ringkas untuk jenis aktiviti
  const getActivityLabel = (type) => {
    switch (type) {
      case "create":
        return "Created";
      case "update":
        return "Updated";
      case "delete":
        return "Deleted";
      case "reminder":
        return "Reminder";
      case "batch":
        return "Batch";
      default:
        return "Event";
    }
  };

  // Ringkas: tentukan nama pelaku aktiviti
  const getActorLabel = (log) => {
    const actorId = log?.actorId;
    if (!actorId) return "system";
    if (actorId === auth.currentUser?.uid) {
      return auth.currentUser?.email || "Admin";
    }
    const matchedUser = users.find((u) => u.uid === actorId || u.id === actorId);
    return matchedUser?.name || matchedUser?.email || actorId;
  };

  // Ringkas: parse tarikh yyyy-mm-dd ke Date
  const parseDate = (value) => {
    if (!value) return null;
    const parts = value.split("-").map(Number);
    if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  const todayLocal = new Date();
  const startOfToday = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter((task) => task.status === "pending").length;
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const overdueCount = tasks.filter((task) => {
    if (task.status !== "pending" || !task.dueDate) return false;
    const due = parseDate(task.dueDate);
    return due && due < startOfToday;
  }).length;
  const dueTodayCount = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const due = parseDate(task.dueDate);
    return due && due.getTime() === startOfToday.getTime();
  }).length;
  const dueWeekCount = tasks.filter((task) => {
    if (task.status !== "pending" || !task.dueDate) return false;
    const due = parseDate(task.dueDate);
    return due && due >= startOfToday && due <= endOfWeek;
  }).length;
  const highPriorityCount = tasks.filter((task) => task.priority === "high").length;
  const mediumPriorityCount = tasks.filter((task) => task.priority === "medium").length;
  const lowPriorityCount = tasks.filter((task) => task.priority === "low").length;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const pendingRate = totalTasks ? Math.round((pendingTasks / totalTasks) * 100) : 0;
  const completedRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const isAnalyticsLoading = loadingTasks || loadingUsers;

  const dueSeries = Array.from({ length: 7 }, (_, idx) => {
    const day = new Date(startOfTomorrow);
    day.setDate(day.getDate() + idx);
    const dayKey = day.toDateString();
    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const due = parseDate(task.dueDate);
      return due && due.toDateString() === dayKey;
    }).length;
  });
  const dueSeriesMax = Math.max(...dueSeries, 1);

  const staggerWrap = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
  };

  const fadeUpItem = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  return (
    <motion.div className={`dashboard-layout admin-layout theme-${theme}`}>
  {/* SIDEBAR */}
  <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
    <div className="sidebar-header">
      <h2>🛠 Admin</h2>
      <button
        className="close-btn"
        onClick={() => setSidebarOpen(false)}
      >
        ✕
      </button>
    </div>

    <nav className="sidebar-nav">
      <button
        className={activeTab === "overview" ? "active" : ""}
        onClick={() => {
          setActiveTab("overview");
          setSidebarOpen(false);
        }}
      >
        
        📊 Overview
      </button>

      <button
        className={activeTab === "tasks" ? "active" : ""}
        onClick={() => {
          setActiveTab("tasks");
          setSidebarOpen(false);
        }}
      >
        📋 Tasks
      </button>

      <button
        className={activeTab === "activity" ? "active" : ""}
        onClick={() => {
          setActiveTab("activity");
          setSidebarOpen(false);
        }}
      >
        🕒 Activity
      </button>
    </nav>

    <div className="sidebar-footer">
      <button onClick={handleLogout} className="logout-btn">
        🚪 Logout
      </button>
    </div>
  </aside>

  {/* MAIN CONTENT */}
  <div className="main-content">
    <header className="topbar">
      <button
        className="menu-btn"
        onClick={() => setSidebarOpen(true)}
      >
        ☰
      </button>
      <h1>Admin Dashboard</h1>
      <button
        type="button"
        className="theme-btn"
        onClick={() => setTheme((prev) => (prev === "noir" ? "aurora" : "noir"))}
      >
        Theme: {theme === "noir" ? "Noir" : "Aurora"}
      </button>
    </header>
    


      <div className="dashboard-content">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              
              {/* ANALYTICS SECTION */}
              <div className="section analytics-section">
                <h2>Analytics Overview</h2>
                {isAnalyticsLoading ? (
                  <div className="analytics-grid skeleton-grid">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div className="skeleton-card" key={`sk1-${idx}`} />
                    ))}
                  </div>
                ) : (
                  <motion.div className="analytics-grid" variants={staggerWrap} initial="hidden" animate="show">
                    <motion.div className="analytics-card" variants={fadeUpItem} data-tip="All tasks in the system.">
                      <div className="analytics-label">Total Tasks</div>
                      <div className="analytics-value">{totalTasks}</div>
                      <div className="analytics-sub">Staff: {users.length}</div>
                    </motion.div>
                    <motion.div className="analytics-card" variants={fadeUpItem} data-tip="Pending tasks.">
                      <div className="analytics-label">Pending</div>
                      <div className="analytics-value">{pendingTasks}</div>
                      <div className="analytics-sub">{pendingRate}% of total</div>
                    </motion.div>
                    <motion.div className="analytics-card" variants={fadeUpItem} data-tip="Completed tasks.">
                      <div className="analytics-label">Completed</div>
                      <div className="analytics-value">{completedTasks}</div>
                      <div className="analytics-sub">{completedRate}% of total</div>
                    </motion.div>
                    <motion.div className="analytics-card" variants={fadeUpItem} data-tip="Overdue tasks.">
                      <div className="analytics-label">Overdue</div>
                      <div className="analytics-value">{overdueCount}</div>
                      <div className="analytics-sub">Needs attention</div>
                    </motion.div>
                  </motion.div>
                )}

                {isAnalyticsLoading ? (
                  <div className="analytics-grid secondary skeleton-grid">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div className="skeleton-card" key={`sk2-${idx}`} />
                    ))}
                  </div>
                ) : (
                  <motion.div className="analytics-grid secondary" variants={staggerWrap} initial="hidden" animate="show">
                    <motion.div className="analytics-card" variants={fadeUpItem} data-tip="Tasks due today.">
                      <div className="analytics-label">Due Today</div>
                      <div className="analytics-value">{dueTodayCount}</div>
                      <div className="analytics-sub">All statuses</div>
                    </motion.div>
                    <motion.div className="analytics-card" variants={fadeUpItem} data-tip="Pending tasks due in the next 7 days.">
                      <div className="analytics-label">Due This Week</div>
                      <div className="analytics-value">{dueWeekCount}</div>
                      <div className="analytics-sub">Pending only</div>
                    </motion.div>
                    <motion.div className="analytics-card" variants={fadeUpItem} data-tip="High priority tasks.">
                      <div className="analytics-label">High Priority</div>
                      <div className="analytics-value">{highPriorityCount}</div>
                      <div className="analytics-sub">Across all tasks</div>
                    </motion.div>
                    <motion.div className="analytics-card" variants={fadeUpItem} data-tip="Completed tasks rate.">
                      <div className="analytics-label">Completion Rate</div>
                      <div className="analytics-value">{completionRate}%</div>
                      <div className="analytics-sub">All tasks</div>
                    </motion.div>
                  </motion.div>
                )}

                <motion.div className="analytics-panels" variants={staggerWrap} initial="hidden" animate="show">
                  <motion.div className="analytics-panel" variants={fadeUpItem}>
                    <div className="panel-header">
                      <h3>Status Breakdown</h3>
                      <span className="panel-badge">Live</span>
                    </div>
                    <div className="bar-row">
                      <span className="bar-label">Pending</span>
                      <div className="bar-track">
                        <div className="bar-fill pending" style={{ width: `${pendingRate}%` }} />
                      </div>
                      <span className="bar-value">{pendingTasks}</span>
                    </div>
                    <div className="bar-row">
                      <span className="bar-label">Completed</span>
                      <div className="bar-track">
                        <div className="bar-fill completed" style={{ width: `${completedRate}%` }} />
                      </div>
                      <span className="bar-value">{completedTasks}</span>
                    </div>
                    <div className="sparkline">
                      <span className="sparkline-label">Due next 7 days</span>
                      <svg viewBox="0 0 140 40" preserveAspectRatio="none">
                        {dueSeries.map((value, idx) => {
                          const x = (idx / 6) * 140;
                          const y = 40 - (value / dueSeriesMax) * 32 - 4;
                          return <circle key={`pt-${idx}`} cx={x} cy={y} r="2.6" />;
                        })}
                        <polyline
                          points={dueSeries
                            .map((value, idx) => {
                              const x = (idx / 6) * 140;
                              const y = 40 - (value / dueSeriesMax) * 32 - 4;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                          fill="none"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  </motion.div>

                  <motion.div className="analytics-panel" variants={fadeUpItem}>
                    <div className="panel-header">
                      <h3>Priority Split</h3>
                      <span className="panel-badge">Auto</span>
                    </div>
                    <div className="bar-row">
                      <span className="bar-label">High</span>
                      <div className="bar-track">
                        <div className="bar-fill high" style={{ width: `${totalTasks ? Math.round((highPriorityCount / totalTasks) * 100) : 0}%` }} />
                      </div>
                      <span className="bar-value">{highPriorityCount}</span>
                    </div>
                    <div className="bar-row">
                      <span className="bar-label">Medium</span>
                      <div className="bar-track">
                        <div className="bar-fill medium" style={{ width: `${totalTasks ? Math.round((mediumPriorityCount / totalTasks) * 100) : 0}%` }} />
                      </div>
                      <span className="bar-value">{mediumPriorityCount}</span>
                    </div>
                    <div className="bar-row">
                      <span className="bar-label">Low</span>
                      <div className="bar-track">
                        <div className="bar-fill low" style={{ width: `${totalTasks ? Math.round((lowPriorityCount / totalTasks) * 100) : 0}%` }} />
                      </div>
                      <span className="bar-value">{lowPriorityCount}</span>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === "tasks" && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* CREATE TASK SECTION */}
              <div className="section">
                <h2>Manage Tasks</h2>
                <button
                  onClick={() => {
                    if (showTaskForm) {
                      setShowTaskForm(false);
                      setEditingTask(null);
                      setTaskForm({
                        title: "",
                        description: "",
                        assignedTo: [],
                        dueDate: "",
                        priority: "medium",
                      });
                    } else {
                      setShowTaskForm(true);
                    }
                  }}
                  className="primary-btn"
                >
                  {showTaskForm ? "Cancel" : "+ Create New Task"}
                </button>

                {showTaskForm && (
                  <motion.form
                    ref={formRef}
                    onSubmit={handleCreateTask}
                    className="task-form"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="form-group">
                      <label>Task Title</label>
                      <input
                        type="text"
                        placeholder="Enter task title"
                        value={taskForm.title}
                        onChange={(e) =>
                          setTaskForm({ ...taskForm, title: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Description</label>
                      <textarea
                        placeholder="Enter task description"
                        value={taskForm.description}
                        onChange={(e) =>
                          setTaskForm({ ...taskForm, description: e.target.value })
                        }
                        rows="3"
                      />
                    </div>

                    <div className="form-group">
                      <label>Assign To</label>
                      <select
                        value={taskForm.assignedTo}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                          setTaskForm({ ...taskForm, assignedTo: selected });
                        }}
                        multiple
                        required
                      >
                        <option value="">Select Staff</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.uid}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Due Date</label>
                      <input
                        type="date"
                        value={taskForm.dueDate}
                        onChange={(e) =>
                          setTaskForm({ ...taskForm, dueDate: e.target.value })
                        }
                      />
                    </div>

                    <div className="form-group">
                      <label>Priority</label>
                      <select
                        value={taskForm.priority}
                        onChange={(e) =>
                          setTaskForm({ ...taskForm, priority: e.target.value })
                        }
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    <button type="submit" className="primary-btn">
                      {editingTask ? "Update Task" : "Create Task"}
                    </button>
                  </motion.form>
                )}

                {/* REMINDERS SECTION */}
                <div className="section">
                  <h2>🔔 Reminders</h2>
                  <p className="hint">Overdue pending tasks that may need reminders.</p>
                  <button type="button" className="primary-btn" onClick={sendRemindersToAll} style={{ marginBottom: 12 }}>
                    Send Reminders to All Overdue
                  </button>

                  {overdueTasks.length === 0 ? (
                    <p className="no-tasks">No overdue tasks.</p>
                  ) : (
                    <div className="reminders-list">
                      {overdueTasks.map((ot) => (
                        <div key={ot.id} className="reminder-item">
                          <div className="reminder-main">
                            <strong>{ot.title}</strong>
                            <div className="reminder-meta">Assigned: {getAssignedNames(ot)} • Due: {ot.dueDate}</div>
                          </div>
                          <div className="reminder-actions">
                            <button className="primary-btn" onClick={() => handleSendReminder(ot)}>Send</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* TASKS LIST */}
              <div className="section">
                <h2>All Tasks</h2>
                {loadingTasks ? (
                  <div className="tasks-list skeleton-grid">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div className="skeleton-card tall" key={`tsk-${idx}`} />
                    ))}
                  </div>
                ) : tasks.length === 0 ? (
                  <p className="no-tasks">No tasks created yet</p>
                ) : (
                  <div className="tasks-list">
                    {tasks.map((task) => (
                      <motion.div
                        key={task.id}
                        className={`task-item priority-${task.priority}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
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
                        <div className="task-meta">
                          <span>👤 {getAssignedNames(task)}</span>
                          {task.dueDate && <span>📅 {task.dueDate}</span>}
                          {task.lastReminderSent && (
                            <span>⏰ Last reminder: {task.lastReminderSent.toDate ? task.lastReminderSent.toDate().toLocaleString() : task.lastReminderSent}</span>
                          )}
                          <span className={`priority ${task.priority}`}>
                            Priority: {task.priority.toUpperCase()}
                          </span>
                        </div>

                        <div className="task-actions">
                          <button
                            type="button"
                            onClick={() => handleEditTask(task)}
                            className="edit-btn"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleSendReminder(task)}
                            className="reminder-btn"
                          >
                            📧 Send Reminder
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="delete-btn"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {/* ACTIVITY LOG */}
              <div className="section">
                <h2>Activity Log</h2>
                {loadingActivity ? (
                  <div className="activity-list skeleton-grid">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div className="skeleton-card" key={`act-${idx}`} />
                    ))}
                  </div>
                ) : activityLogs.length === 0 ? (
                  <p className="no-tasks">No activity yet</p>
                ) : (
                  <motion.div className="activity-list" variants={staggerWrap} initial="hidden" animate="show">
                    {activityLogs.map((log) => (
                      <motion.div key={log.id} className={`activity-item ${log.type || "event"}`} variants={fadeUpItem}>
                        <div className="activity-main">
                          <div className="activity-title">{log.message}</div>
                          <div className="activity-meta">{getActivityTime(log)} • {getActorLabel(log)}</div>
                        </div>
                        <span className={`activity-chip ${log.type || "event"}`}>{getActivityLabel(log.type)}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* ARCHIVED TASKS */}
              <div className="section">
                <h2>Task Archive</h2>
                {loadingArchive ? (
                  <div className="activity-list skeleton-grid">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div className="skeleton-card" key={`arc-${idx}`} />
                    ))}
                  </div>
                ) : archivedTasks.length === 0 ? (
                  <p className="no-tasks">No archived tasks</p>
                ) : (
                  <motion.div className="activity-list" variants={staggerWrap} initial="hidden" animate="show">
                    {archivedTasks.map((archive) => (
                      <motion.div key={archive.id} className="activity-item delete" variants={fadeUpItem}>
                        <div className="activity-main">
                          <div className="activity-title">{archive.title || "Untitled Task"}</div>
                          <div className="activity-meta">
                            Deleted: {getArchiveTime(archive)} • By: {archive.deletedBy || "system"}
                          </div>
                          {archive.description && (
                            <div className="activity-meta">{archive.description}</div>
                          )}
                        </div>
                        <span className="activity-chip delete">Archived</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
    </div>
    </motion.div>
  );
}









