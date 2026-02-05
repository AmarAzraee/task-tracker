import { motion } from "framer-motion";
import "../styles/taskcard.css";

export default function TaskCard({ task, onDelete, onToggle, index }) {
  const isOverdue =
    !task.completed && new Date(task.dueDate) < new Date();
  
  const priorityColors = {
    high: "var(--accent-pink)",
    medium: "var(--accent-pink-2)",
    low: "var(--muted)",
  };

  const categoryEmoji = {
    work: "💼",
    personal: "👤",
    urgent: "⚡",
  };

  return (
    <motion.div
      className={`task-card ${task.completed ? "completed" : ""} ${isOverdue ? "overdue" : ""}`}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div className="task-header">
        <div className="task-checkbox">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
          />
        </div>

        <div className="task-info">
          <h3 className="task-title">{task.title}</h3>
          {task.description && (
            <p className="task-description">{task.description}</p>
          )}
        </div>

        <button
          className="delete-btn"
          onClick={() => onDelete(task.id)}
        >
          ✕
        </button>
      </div>

      <div className="task-footer">
        <div className="task-meta">
          <span
            className="priority-badge"
            style={{ backgroundColor: priorityColors[task.priority] }}
          >
            {task.priority.toUpperCase()}
          </span>
          <span className="category-badge">
            {categoryEmoji[task.category]} {task.category}
          </span>
          <span className={`due-date ${isOverdue ? "overdue-text" : ""}`}>
            📅 {new Date(task.dueDate).toLocaleDateString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}