import { motion } from "framer-motion";
import TaskCard from "./TaskCard";
import "../styles/tasklist.css";

export default function TaskList({ tasks, onDeleteTask, onToggleTask }) {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <p>📭 No tasks found. Create one to get started!</p>
      </div>
    );
  }

  return (
    <motion.div className="task-list">
      {tasks.map((task, index) => (
        <TaskCard
          key={task.id}
          task={task}
          onDelete={onDeleteTask}
          onToggle={onToggleTask}
          index={index}
        />
      ))}
    </motion.div>
  );
}