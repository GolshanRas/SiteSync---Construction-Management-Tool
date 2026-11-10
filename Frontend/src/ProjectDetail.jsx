
import { useEffect, useState } from "react";
import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";
import ProjectCosts from "./ProjectCosts";

// Roles allowed to create, edit, and manage tasks.
const TASK_MANAGER_ROLES = ["Admin", "PM", "Project Manager", "Supervisor"];

function ProjectDetail({ project, user, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const canManage = TASK_MANAGER_ROLES.includes(user.role);

  // ---------- FETCH PROJECT TASKS ----------

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setMessage("");
    setTasks([]);
    setNotice("");
    setShowForm(false);
    setActiveTab("overview");

    fetch(`http://localhost:5000/api/projects/${project.id}/tasks`, {
      headers: {
        "X-User-Role": user.role,
      },
    })
      .then((response) =>
        response.json().then((data) => ({
          ok: response.ok,
          data,
        }))
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

  // ---------- TASK MANAGEMENT ----------

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
      current.map((task) =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );

    setNotice("Task updated successfully!");
  };

  // ---------- TASK STATISTICS ----------

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const inProgressTasks = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const onHoldTasks = tasks.filter(
    (task) => task.status === "On Hold"
  ).length;

  const notStartedTasks = tasks.filter(
    (task) => !task.status || task.status === "Not Started"
  ).length;

  // ---------- RENDER ----------

  return (
    <div className="page">

      {/* ---------- BACK BUTTON ---------- */}

      <button
        type="button"
        className="back-link"
        onClick={onBack}
      >
        &larr; Back to projects
      </button>

      {/* ---------- PROJECT SUMMARY ---------- */}

      <section className="project-summary">

        <div className="project-summary-top">
          <h1>{project.name}</h1>

          <span className="role-badge">
            {project.status}
          </span>
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

      {/* ---------- PROJECT TABS ---------- */}

      <div className="project-tabs">

        <button
          type="button"
          className={
            activeTab === "overview"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>

        <button
          type="button"
          className={
            activeTab === "tasks"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() => setActiveTab("tasks")}
        >
          Tasks
        </button>

        <button
          type="button"
          className={
            activeTab === "costs"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() => setActiveTab("costs")}
        >
          Costs
        </button>

      </div>

      {/* ---------- OVERVIEW TAB ---------- */}

      {activeTab === "overview" && (
        <div className="project-overview-panel">

          <h2>Project Overview</h2>

          <p>
            Overview of project progress and performance.
          </p>

          {loading ? (
            <p>Loading project statistics...</p>
          ) : (
            <div className="overview-stats">

              <div className="overview-stat">
                <span>Total Tasks</span>
                <strong>{totalTasks}</strong>
              </div>

              <div className="overview-stat">
                <span>Completed Tasks</span>
                <strong>{completedTasks}</strong>
              </div>

              <div className="overview-stat">
                <span>In Progress Tasks</span>
                <strong>{inProgressTasks}</strong>
              </div>

              <div className="overview-stat">
                <span>On Hold Tasks</span>
                <strong>{onHoldTasks}</strong>
              </div>

              <div className="overview-stat">
                <span>Not Started Tasks</span>
                <strong>{notStartedTasks}</strong>
              </div>

              <div className="overview-stat">
                <span>Project Status</span>
                <strong>{project.status}</strong>
              </div>

            </div>
          )}

          {message && (
            <div className="message-error" role="alert">
              {message}
            </div>
          )}

          {/* ---------- FUTURE VISUALIZATIONS ---------- */}

          <div className="overview-placeholder">
            <h3>Project Visualizations</h3>

            <p>
              Future charts and project performance
              visualizations will appear here.
            </p>
          </div>

        </div>
      )}

      {/* ---------- TASKS TAB ---------- */}

      {activeTab === "tasks" && (
        <>

          <div className="section-header">

            <h2>Tasks</h2>

            {canManage && (
              <button
                type="button"
                className={
                  showForm
                    ? "action-button secondary"
                    : "action-button"
                }
                onClick={toggleForm}
              >
                {showForm ? "Cancel" : "+ Create Task"}
              </button>
            )}

          </div>

          {/* ---------- CREATE TASK ---------- */}

          {showForm && canManage && (
            <TaskForm
              project={project}
              user={user}
              onSaved={handleCreated}
              onCancel={toggleForm}
            />
          )}

          {/* ---------- NOTIFICATIONS ---------- */}

          {notice && (
            <div className="message-success">
              {notice}
            </div>
          )}

          {message && (
            <div className="message-error" role="alert">
              {message}
            </div>
          )}

          {/* ---------- TASK LIST ---------- */}

          {loading ? (
            <p>Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p>
              No tasks have been created for this project yet.
            </p>
          ) : (
            <div className="task-list">

              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  user={user}
                  canManage={canManage}
                  onTaskUpdated={handleTaskUpdated}
                />
              ))}

            </div>
          )}

        </>
      )}

      {/* ---------- COSTS TAB ---------- */}

      {activeTab === "costs" && (
        <ProjectCosts
          project={project}
          user={user}
        />
      )}

    </div>
  );
}

export default ProjectDetail;
