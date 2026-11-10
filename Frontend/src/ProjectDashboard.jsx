
import { useState } from "react";

const DAY = 24 * 60 * 60 * 1000;

const statusColors = {
  Completed: "#16a34a",
  "In Progress": "#3b82f6",
  "On Hold": "#f59e0b",
  "Not Started": "#94a3b8",
};

function parseDate(value) {
  if (!value) return null;

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return date.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

function ProjectDashboard({ tasks }) {
  const [view, setView] = useState("week");

  const scheduledTasks = tasks
    .map((task) => ({
      ...task,
      start: parseDate(task.start_date),
      end: parseDate(task.deadline),
    }))
    .filter(
      (task) =>
        task.start &&
        task.end &&
        task.end >= task.start
    )
    .sort((a, b) => a.start - b.start);

  const unscheduledCount = tasks.length - scheduledTasks.length;

  const completed = tasks.filter(
    (task) => task.status === "Completed"
  ).length;

  const inProgress = tasks.filter(
    (task) => task.status === "In Progress"
  ).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const earliest = scheduledTasks.length
    ? new Date(Math.min(...scheduledTasks.map((t) => t.start.getTime())))
    : today;

  const latest = scheduledTasks.length
    ? new Date(Math.max(...scheduledTasks.map((t) => t.end.getTime())))
    : today;

  const unitDays = view === "week" ? 7 : 1;

  const timelineStart = new Date(earliest);
  timelineStart.setDate(
    timelineStart.getDate() -
    (view === "week" ? timelineStart.getDay() : 0)
  );

  const totalDays =
    Math.round((latest - timelineStart) / DAY) + 1;

  const columns = Math.max(
    1,
    Math.ceil(totalDays / unitDays)
  );

  const columnWidth = view === "week" ? 110 : 45;
  const timelineWidth = columns * columnWidth;

  const getLeft = (date) =>
    (Math.round((date - timelineStart) / DAY) / unitDays) *
    columnWidth;

  const getWidth = (start, end) =>
    ((Math.round((end - start) / DAY) + 1) / unitDays) *
    columnWidth;

  return (
    <div className="project-dashboard">
      <h2>Project Dashboard</h2>
      <p>Task schedule and project timeline.</p>

      <div className="gantt-summary">
        <div>
          <span>Total Tasks</span>
          <strong>{tasks.length}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>{completed}</strong>
        </div>
        <div>
          <span>In Progress</span>
          <strong>{inProgress}</strong>
        </div>
      </div>

      <div className="gantt-container">
        <div className="gantt-heading">
          <h3>Task Timeline</h3>

          <select
            value={view}
            onChange={(e) => setView(e.target.value)}
            aria-label="Timeline view"
          >
            <option value="week">Weekly View</option>
            <option value="day">Daily View</option>
          </select>
        </div>

        <div className="gantt-legend">
          {Object.entries(statusColors).map(([status, color]) => (
            <span key={status}>
              <i style={{ backgroundColor: color }} />
              {status}
            </span>
          ))}
        </div>

        {scheduledTasks.length === 0 ? (
          <p>
            No scheduled tasks yet. Add start dates and
            deadlines to your tasks to see the Gantt chart.
          </p>
        ) : (
          <div className="gantt-scroll">
            <div
              className="gantt-table"
              style={{ width: 200 + timelineWidth }}
            >
              <div className="gantt-row gantt-top-row">
                <div className="gantt-task-name">Task</div>

                <div
                  className="gantt-timeline"
                  style={{ width: timelineWidth }}
                >
                  {Array.from({ length: columns }, (_, index) => {
                    const date = new Date(timelineStart);
                    date.setDate(
                      date.getDate() + index * unitDays
                    );

                    return (
                      <div
                        key={index}
                        className="gantt-date-cell"
                        style={{ width: columnWidth }}
                      >
                        {formatDate(date)}
                      </div>
                    );
                  })}
                </div>
              </div>

              {scheduledTasks.map((task) => (
                <div className="gantt-row" key={task.id}>
                  <div
                    className="gantt-task-name"
                    title={task.name}
                  >
                    {task.name}
                  </div>

                  <div
                    className="gantt-timeline gantt-track"
                    style={{
                      width: timelineWidth,
                      backgroundSize: `${columnWidth}px 100%`,
                    }}
                  >
                    <div
                      className="gantt-bar"
                      title={`${task.name}: ${task.start_date} to ${task.deadline} (${task.status || "Not Started"})`}
                      style={{
                        left: getLeft(task.start),
                        width: Math.max(
                          4,
                          getWidth(task.start, task.end)
                        ),
                        backgroundColor:
                          statusColors[task.status] ||
                          statusColors["Not Started"],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {unscheduledCount > 0 && (
          <p className="gantt-note">
            {unscheduledCount} task(s) not shown because
            their start date or deadline is missing or invalid.
          </p>
        )}
      </div>
    </div>
  );
}

export default ProjectDashboard;
