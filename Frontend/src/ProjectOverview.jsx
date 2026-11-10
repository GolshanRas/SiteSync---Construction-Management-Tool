
import { useEffect, useState } from "react";

const API = "http://localhost:5000";
const CATEGORIES = ["Materials", "Labour", "Equipment", "Travel", "Other"];

const STATUS_COLORS = {
  Completed: "#16a34a",
  "In Progress": "#3b82f6",
  "On Hold": "#f59e0b",
  "Not Started": "#94a3b8",
};

const money = (cents) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

function localDate(value) {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ProjectOverview({ project, tasks, user, onOpenTasks, onOpenCosts }) {
  const [costs, setCosts] = useState(null);
  const [planned, setPlanned] = useState({});
  const [loadingCosts, setLoadingCosts] = useState(true);
  const [costError, setCostError] = useState("");

  useEffect(() => {
    let active = true;

    setLoadingCosts(true);
    setCostError("");
    setCosts(null);
    setPlanned({});

    const headers = { "X-User-Role": user.role };

    async function getJSON(path) {
      const response = await fetch(`${API}${path}`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load costs.");
      }

      return data;
    }

    Promise.all([
      getJSON(`/api/projects/${project.id}/costs`),
      getJSON(`/api/projects/${project.id}/planned-costs`),
    ])
      .then(([costData, plannedData]) => {
        if (!active) return;
        setCosts(costData);
        setPlanned(plannedData);
      })
      .catch((error) => {
        if (active) setCostError(error.message);
      })
      .finally(() => {
        if (active) setLoadingCosts(false);
      });

    return () => {
      active = false;
    };
  }, [project.id, user.role]);

  // TASK STATISTICS

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const onHold = tasks.filter((t) => t.status === "On Hold").length;
  const notStarted = total - completed - inProgress - onHold;

  const completionPercent = total
    ? Math.round((completed / total) * 100)
    : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const projectEnd = localDate(project.end_date);

  const daysRemaining = projectEnd
    ? Math.ceil((projectEnd - today) / 86400000)
    : null;

  const overdueTasks = tasks
    .filter((task) => {
      const deadline = localDate(task.deadline);
      return (
        deadline &&
        deadline < today &&
        task.status !== "Completed"
      );
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  const priorityRank = {
    Urgent: 4,
    "High Priority": 3,
    Standard: 2,
    "Low Priority": 1,
  };

  const attentionTasks = [...overdueTasks].sort((a, b) => {
    const priorityDifference =
      (priorityRank[b.priority] || 0) -
      (priorityRank[a.priority] || 0);

    return priorityDifference || a.deadline.localeCompare(b.deadline);
  });

  // COST STATISTICS

  const budget = costs?.budget_cents ?? 0;
  const spent = costs?.spent_cents ?? 0;
  const remaining = budget - spent;
  const utilization = budget > 0
    ? Math.round((spent / budget) * 100)
    : 0;

  const categoryData = CATEGORIES.map((category) => ({
    name: category,
    planned: planned[category] || 0,
    actual: costs?.category_totals?.[category] || 0,
  }));

  const chartMaximum = Math.max(
    1,
    ...categoryData.flatMap((c) => [c.planned, c.actual])
  );

  // DONUT CHART

  const statusData = [
    { name: "Completed", count: completed },
    { name: "In Progress", count: inProgress },
    { name: "On Hold", count: onHold },
    { name: "Not Started", count: notStarted },
  ];

  let donutPosition = 0;
  const donutSegments = statusData.map((item) => {
    const start = donutPosition;
    const portion = total ? (item.count / total) * 100 : 0;
    donutPosition += portion;

    return `${STATUS_COLORS[item.name]} ${start}% ${donutPosition}%`;
  });

  const donutBackground = total
    ? `conic-gradient(${donutSegments.join(", ")})`
    : "#e5e7eb";

  return (
    <div className="ss-overview">

      {/* HEADER */}

      <div className="ss-overview-heading">
        <div>
          <span className="ss-eyebrow">PROJECT OVERVIEW</span>
          <h2>{project.name}</h2>
          <p>Performance and financial summary</p>
        </div>

        <span className="ss-project-status">
          {project.status || "Not set"}
        </span>
      </div>

      {/* KPI CARDS */}

      <div className="ss-kpi-grid">

        <div className="ss-kpi-card">
          <span>Task Completion</span>
          <strong>{completionPercent}%</strong>
          <p>{completed} of {total} tasks</p>
          <div className="ss-progress-track">
            <div
              className="ss-progress-fill"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>

        <div className="ss-kpi-card">
          <span>Budget Used</span>
          <strong>
            {loadingCosts ? "..." : budget > 0 ? `${utilization}%` : "N/A"}
          </strong>
          <p>
            {loadingCosts
              ? "Loading costs..."
              : costError
                ? "Costs unavailable"
                : `${money(spent)} / ${money(budget)}`}
          </p>
          <div className="ss-progress-track">
            <div
              className="ss-progress-fill ss-budget-fill"
              style={{ width: `${Math.min(100, utilization)}%` }}
            />
          </div>
        </div>

        <div className="ss-kpi-card">
          <span>Overdue Tasks</span>
          <strong className={overdueTasks.length ? "ss-danger" : ""}>
            {overdueTasks.length}
          </strong>
          <p>
            {overdueTasks.length ? "Needs attention" : "All caught up"}
          </p>
        </div>

        <div className="ss-kpi-card">
          <span>Days Remaining</span>
          <strong className={daysRemaining < 0 ? "ss-danger" : ""}>
            {daysRemaining === null
              ? "N/A"
              : Math.max(0, daysRemaining)}
          </strong>
          <p>
            {daysRemaining === null
              ? "No project end date"
              : daysRemaining < 0
                ? `${Math.abs(daysRemaining)} days past deadline`
                : "Until project deadline"}
          </p>
        </div>

      </div>

      {/* TASK STATUS + BUDGET */}

      <div className="ss-overview-grid">

        <section className="ss-overview-card">
          <h3>Task Status Distribution</h3>
          <p>{total} tasks across four statuses</p>

          <div className="ss-donut-layout">
            <div
              className="ss-donut"
              style={{ background: donutBackground }}
              role="img"
              aria-label={`${completionPercent}% of tasks completed`}
            >
              <div className="ss-donut-center">
                <strong>{completionPercent}%</strong>
                <span>Completed</span>
              </div>
            </div>

            <div className="ss-status-legend">
              {statusData.map((item) => (
                <div key={item.name}>
                  <span
                    className="ss-legend-dot"
                    style={{
                      backgroundColor: STATUS_COLORS[item.name],
                    }}
                  />
                  <span>{item.name}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <button className="ss-text-button" onClick={onOpenTasks}>
            View all tasks →
          </button>
        </section>

        <section className="ss-overview-card">
          <h3>Budget Overview</h3>

          {loadingCosts ? (
            <p>Loading budget...</p>
          ) : costError ? (
            <p className="ss-danger">{costError}</p>
          ) : (
            <>
              <div className="ss-budget-total">
                <strong>{money(spent)}</strong>
                <span>of {money(budget)} budget</span>
              </div>

              <div className="ss-progress-track ss-large-track">
                <div
                  className="ss-progress-fill ss-budget-fill"
                  style={{
                    width: `${Math.min(100, utilization)}%`,
                  }}
                />
              </div>

              <div className="ss-budget-details">
                <span className={remaining < 0 ? "ss-danger" : ""}>
                  Remaining: {money(remaining)}
                </span>
                <span>
                  {budget > 0 ? `${utilization}% utilized` : "No budget set"}
                </span>
              </div>

              {remaining < 0 && (
                <p className="ss-warning">
                  Budget exceeded by {money(-remaining)}.
                </p>
              )}

              <button className="ss-text-button" onClick={onOpenCosts}>
                View cost details →
              </button>
            </>
          )}
        </section>

      </div>

      {/* SPENDING CHART */}

      <section className="ss-overview-card">
        <div className="ss-card-heading">
          <div>
            <h3>Spending by Category</h3>
            <p>Planned vs actual spending (CAD)</p>
          </div>

          <div className="ss-chart-legend">
            <span><i className="ss-planned-dot" /> Planned</span>
            <span><i className="ss-actual-dot" /> Actual</span>
          </div>
        </div>

        {loadingCosts ? (
          <p>Loading spending data...</p>
        ) : costError ? (
          <p className="ss-danger">{costError}</p>
        ) : (
          <div className="ss-category-chart">
            {categoryData.map((category) => (
              <div className="ss-category-row" key={category.name}>
                <span className="ss-category-name">
                  {category.name}
                </span>

                <div className="ss-category-bars">
                  <div className="ss-bar-track">
                    <div
                      className="ss-bar ss-planned-bar"
                      style={{
                        width: `${(category.planned / chartMaximum) * 100}%`,
                      }}
                      title={`Planned: ${money(category.planned)}`}
                    />
                  </div>
                  <div className="ss-bar-track">
                    <div
                      className="ss-bar ss-actual-bar"
                      style={{
                        width: `${(category.actual / chartMaximum) * 100}%`,
                      }}
                      title={`Actual: ${money(category.actual)}`}
                    />
                  </div>
                </div>

                <div className="ss-category-values">
                  <span>{money(category.planned)}</span>
                  <span>{money(category.actual)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ATTENTION LIST */}

      <section className="ss-overview-card">
        <div className="ss-card-heading">
          <h3>Tasks Requiring Attention</h3>
          <span className="ss-overdue-badge">
            {overdueTasks.length} overdue
          </span>
        </div>

        {attentionTasks.length === 0 ? (
          <p className="ss-empty">
            No overdue tasks. Your project is on track with its recorded deadlines.
          </p>
        ) : (
          <div className="ss-attention-list">
            {attentionTasks.slice(0, 5).map((task) => {
              const deadline = localDate(task.deadline);
              const daysOverdue = Math.round(
                (today - deadline) / 86400000
              );

              return (
                <div className="ss-attention-item" key={task.id}>
                  <span className="ss-alert-icon">!</span>

                  <div className="ss-attention-info">
                    <strong>{task.name}</strong>
                    <span>
                      Overdue by {daysOverdue} day{daysOverdue !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <span className={`ss-priority ss-priority-${
                    (task.priority || "Standard")
                      .toLowerCase()
                      .replace(/\s+/g, "-")
                  }`}>
                    {task.priority || "Standard"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <button className="ss-text-button" onClick={onOpenTasks}>
          View tasks →
        </button>
      </section>

    </div>
  );
}

export default ProjectOverview;
