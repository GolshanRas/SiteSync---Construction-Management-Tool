
import { useEffect, useState } from "react";
import TaskForm from "./TaskForm";
import TaskCard from "./TaskCard";
import ProjectCosts from "./ProjectCosts";
import ProjectDashboard from "./ProjectDashboard";
import ProjectOverview from "./ProjectOverview";

// Roles allowed to create, edit, and manage tasks.
const TASK_MANAGER_ROLES = ["Admin", "PM", "Project Manager", "Supervisor"];

function ProjectDetail({ project, user, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("deadline");
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterPriority, setFilterPriority] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterUsers, setFilterUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
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


  // ---------- TASK SORTING AND FILTERING ----------

  const priorityOrder = {
    Urgent: 4,
    "High Priority": 3,
    Standard: 2,
    "Low Priority": 1,
  };

  // Get all assigned accounts from the project's tasks.
  const assignedUsers = Array.from(
    new Map(
      tasks
        .flatMap((task) => [
          ...(task.workers || []),
          ...(task.supervisors || []),
          ...(task.project_managers || []),
        ])
        .map((person) => [String(person.id), person])
    ).values()
  ).sort((a, b) =>
    `${a.firstname} ${a.lastname}`.localeCompare(
      `${b.firstname} ${b.lastname}`
    )
  );

  const toggleFilterValue = (setter, value) => {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const filteredTasks = [...tasks]
    .filter((task) => {
      const taskPriority = task.priority || "Standard";
      const taskStatus = task.status || "Not Started";

      const taskUsers = [
        ...(task.workers || []),
        ...(task.supervisors || []),
        ...(task.project_managers || []),
      ];

      const matchesPriority =
        filterPriority.length === 0 ||
        filterPriority.includes(taskPriority);

      const matchesStatus =
        filterStatus.length === 0 ||
        filterStatus.includes(taskStatus);

      const matchesUsers =
        filterUsers.length === 0 ||
        taskUsers.some((person) =>
          filterUsers.includes(String(person.id))
        );

      return matchesPriority && matchesStatus && matchesUsers;
    })
    .sort((a, b) => {
      let comparison = 0;

      if (sortBy === "priority") {
        comparison =
          (priorityOrder[a.priority || "Standard"] || 0) -
          (priorityOrder[b.priority || "Standard"] || 0);
      }

      if (sortBy === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      }

      if (sortBy === "status") {
        const statusOrder = {
          "Not Started": 1,
          "In Progress": 2,
          "On Hold": 3,
          "Completed": 4,
        };

        comparison =
          statusOrder[a.status || "Not Started"] -
          statusOrder[b.status || "Not Started"];
      }

      if (sortBy === "deadline") {
        // Keep tasks without a deadline at the end.
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;

        comparison = a.deadline.localeCompare(b.deadline);
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

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

        <button
          type="button"
          className={
            activeTab === "dashboard"
              ? "project-tab active"
              : "project-tab"
          }
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>

      </div>

      {/* ---------- OVERVIEW TAB ---------- */}
      {activeTab === "overview" && (
        loading ? (
          <p>Loading project overview...</p>
        ) : (
          <ProjectOverview
            project={project}
            tasks={tasks}
            user={user}
            onOpenTasks={() => setActiveTab("tasks")}
            onOpenCosts={() => setActiveTab("costs")}
          />
        )
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

          {/* ---------- SORT AND FILTER ---------- */}

  <div className="task-filter-section">
    <div className="task-filter-header">
      <h3>Project Tasks</h3>

      <button
        type="button"
        className="task-filter-button"
        onClick={() => setShowFilters(!showFilters)}
      >
        ☷ Sort & Filter {showFilters ? "▲" : "▼"}
      </button>
    </div>

    {showFilters && (
      <div className="task-filter-panel">

        <div className="task-filter-panel-header">
          <h4>Sort & Filter</h4>
          <button
            type="button"
            className="task-filter-close"
            onClick={() => setShowFilters(false)}
          >
            ×
          </button>
        </div>

        {/* SORT BY */}

        <label className="task-filter-label">Sort by</label>

        <div className="task-filter-fields">
          <div>
            <label htmlFor="task-sort-by">Metric</label>
            <select
              id="task-sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="deadline">Deadline</option>
              <option value="priority">Priority</option>
              <option value="name">Task Name</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div>
            <label htmlFor="task-sort-direction">Order</label>
            <select
              id="task-sort-direction"
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value)}
            >
              <option value="asc">Ascending ↑</option>
              <option value="desc">Descending ↓</option>
            </select>
          </div>
        </div>

        {/* PRIORITY FILTER */}

        <label className="task-filter-label">
          Filter by Priority
        </label>

        <div className="task-filter-checkboxes">
          {[
            "Urgent",
            "High Priority",
            "Standard",
            "Low Priority",
          ].map((priority) => (
            <label key={priority}>
              <input
                type="checkbox"
                checked={filterPriority.includes(priority)}
                onChange={() =>
                  toggleFilterValue(setFilterPriority, priority)
                }
              />
              {priority}
            </label>
          ))}
        </div>

        {/* STATUS FILTER */}

        <label className="task-filter-label">
          Filter by Status
        </label>

        <div className="task-filter-checkboxes">
          {[
            "Not Started",
            "In Progress",
            "On Hold",
            "Completed",
          ].map((status) => (
            <label key={status}>
              <input
                type="checkbox"
                checked={filterStatus.includes(status)}
                onChange={() =>
                  toggleFilterValue(setFilterStatus, status)
                }
              />
              {status}
            </label>
          ))}
        </div>

        {/* USER FILTER */}

        <label className="task-filter-label">
          Filter by Assigned User
        </label>

        <input
          type="text"
          className="task-user-search"
          placeholder="Search assigned users..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
        />

        <div className="task-filter-checkboxes task-user-filter-list">
          {assignedUsers
            .filter((person) =>
              `${person.firstname} ${person.lastname} ${person.role}`
                .toLowerCase()
                .includes(userSearch.toLowerCase())
            )
            .map((person) => (
              <label key={person.id}>
                <input
                  type="checkbox"
                  checked={filterUsers.includes(String(person.id))}
                  onChange={() =>
                    toggleFilterValue(
                      setFilterUsers,
                      String(person.id)
                    )
                  }
                />
                <span>
                  {person.firstname} {person.lastname}
                  <small className="task-user-role">
                    {person.role}
                  </small>
                </span>
              </label>
            ))}

          {assignedUsers.length === 0 && (
            <p>No assigned users found.</p>
          )}
        </div>

        {/* ACTION BUTTONS */}

        <div className="task-filter-actions">
          <button
            type="button"
            className="task-filter-reset"
            onClick={() => {
              setSortBy("deadline");
              setSortDirection("asc");
              setFilterPriority([]);
              setFilterStatus([]);
              setFilterUsers([]);
              setUserSearch("");
            }}
          >
            Reset all
          </button>

          <button
            type="button"
            className="task-filter-done"
            onClick={() => setShowFilters(false)}
          >
            Done
          </button>
        </div>

      </div>
    )}

    <p className="task-filter-count">
      Showing {filteredTasks.length} of {tasks.length} tasks
    </p>
  </div>
          {/* ---------- TASK LIST ---------- */}

          {loading ? (
            <p>Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p>
              No tasks have been created for this project yet.
            </p>
          ) : (
            <div className="task-list">
              {filteredTasks.length === 0 && (
                <p className="task-filter-empty">
                  No tasks match your selected filters.
                </p>
              )}
              {filteredTasks.map((task) => (
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


      {/* ---------- DASHBOARD TAB ---------- */}

      {activeTab === "dashboard" && (
        loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <ProjectDashboard tasks={tasks} />
        )
      )}
    </div>
  );
}

export default ProjectDetail;
