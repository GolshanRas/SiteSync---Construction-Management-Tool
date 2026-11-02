import { useEffect, useState } from "react";
import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";

// Roles allowed to create tasks, assign people and update progress.
// (The server checks this too; this only decides what to show.)
const TASK_MANAGER_ROLES = ["Admin", "Project Manager", "Supervisor"];

function ProjectDetail({ project, user, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);

  const canManage = TASK_MANAGER_ROLES.includes(user.role);

  useEffect(() => {
    let ignore = false;

    fetch(`http://localhost:5000/api/projects/${project.id}/tasks`, {
      headers: {
        "X-User-Role": user.role,
      },
    })
      .then((response) =>
        response.json().then((data) => ({ ok: response.ok, data }))
      )
      .then(({ ok, data }) => {
        if (ignore) return;

        if (ok) {
          setTasks(data);
        } else {
          setMessage(data.message || "Could not load tasks.");
        }

        setLoading(false);
      })
      .catch((error) => {
        console.error(error);

        if (ignore) return;

        setMessage("Could not connect to the server.");
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [project.id, user.role]);

  const toggleForm = () => {
    setNotice("");
    setShowForm((open) => !open);
  };

  const handleCreated = (task) => {
    setTasks((current) => [...current, task]);
    setShowForm(false);
    setNotice("Task created successfully!");
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((current) =>
      current.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    setNotice("Task updated successfully!");
  };

  const handleProgressSaved = (taskId, progress) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, progress: progress } : task
      )
    );
  };

  return (
    <div className="page">

      <button type="button" className="back-link" onClick={onBack}>
        &larr; Back to projects
      </button>

      <section className="project-summary">

        <div className="project-summary-top">
          <h1>{project.name}</h1>
          <span className="role-badge">{project.status}</span>
        </div>

        {project.description && (
          <p className="project-summary-description">
            {project.description}
          </p>
        )}

        <dl className="project-facts">
          <div>
            <dt>Location</dt>
            <dd>{project.location || "Not set"}</dd>
          </div>

          <div>
            <dt>Start Date</dt>
            <dd>{project.start_date || "Not set"}</dd>
          </div>

          <div>
            <dt>End Date</dt>
            <dd>{project.end_date || "Not set"}</dd>
          </div>
        </dl>

      </section>

      <div className="section-header">
        <h2>Tasks</h2>

        {canManage && (
          <button
            type="button"
            className={showForm ? "action-button secondary" : "action-button"}
            onClick={toggleForm}
          >
            {showForm ? "Cancel" : "+ Create Task"}
          </button>
        )}
      </div>

      {showForm && canManage && (
        <TaskForm
          project={project}
          user={user}
          onSaved={handleCreated}
          onCancel={toggleForm}
        />
      )}

      {notice && <div className="message-success">{notice}</div>}

      {message && <div className="message-error">{message}</div>}

      {loading ? (
        <p>Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p>No tasks have been created for this project yet.</p>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              user={user}
              canManage={canManage}
              onTaskUpdated={handleTaskUpdated}
              onProgressSaved={handleProgressSaved}
            />
          ))}
        </div>
      )}

    </div>
  );
}

export default ProjectDetail;
