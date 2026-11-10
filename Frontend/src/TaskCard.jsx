import { useEffect, useState } from "react";
import TaskForm from "./TaskForm";

function TaskCard({ task, user, canManage, onTaskUpdated, onProgressSaved }) {
  const [editing, setEditing] = useState(false);
  // What has been typed in the quick progress box (null = nothing typed yet)
  // const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftStatus, setDraftStatus] = useState(task.status || "Not Started");
  useEffect(() => {setDraftStatus(task.status || "Not Started");}, [task.status]);
  // const value = draft === null ? String(task.progress) : draft;
  // const newProgress = Number(value);
  // const isValid =
  //   value.trim() !== "" &&
  //   Number.isInteger(newProgress) &&
  //   newProgress >= 0 &&
  //   newProgress <= 100;

  const saveStatus = async (event) => {
    event.preventDefault();

    // if (!isValid) {
    //   setError("Enter a whole number from 0 to 100.");
    //   return;
    // }
    setError("");
    setSaving(true);

    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${task.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": user.role,
          },
          body: JSON.stringify({
            status: draftStatus,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        onTaskUpdated(data);
      } else {
        setError(data.message || "Could not update status.");
      }
    } catch (error) {
      console.error(error);
      setError("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaved = (updatedTask) => {
    setError("");
    setEditing(false);
    onTaskUpdated(updatedTask);
  };

  if (editing) {
    return (
      <TaskForm
        task={task}
        user={user}
        onSaved={handleSaved}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const renderPeople = (people) =>
    people.length === 0 ? (
      <span className="task-none">None assigned</span>
    ) : (
      people.map((person) => (
        <span className="person-chip" key={person.id}>
          {person.firstname} {person.lastname}
        </span>
      ))
    );

  return (
    <div className="task-card">

      <div className="task-card-top">
        <h3>{task.name}</h3>

        {canManage && (
          <button
            type="button"
            className="edit-button"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
        )}
      </div>

      {task.description && (
        <p className="task-description">{task.description}</p>
      )}

      <div className="task-meta">
        <div className="task-meta-row">
          <strong>Start Date:</strong>
          <span>{task.start_date || "Not set"}</span>
        </div>
        <div className="task-meta-row">
          <strong>Deadline:</strong>
          {task.deadline ? (
            <span>{task.deadline}</span>
          ) : (
            <span className="task-none">Not set</span>
          )}
        </div>

        <div className="task-meta-row">
          <strong>Workers:</strong>
          {renderPeople(task.workers)}
        </div>

        <div className="task-meta-row">
          <strong>Supervisors:</strong>
          {renderPeople(task.supervisors)}
        </div>
        <div className="task-meta-row">
          <strong>Status:</strong>
          <span
            className={`task-status status-${(task.status || "Not Started")
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            {task.status || "Not Started"}
          </span>
        </div>
      </div>
      

      {/* <div className="progress-row">
        <div
          className="progress-track"
          role="progressbar"
          aria-label={`Progress for ${task.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={task.progress}
        >
          <div
            className={
              task.progress === 100
                ? "progress-fill complete"
                : "progress-fill"
            }
            style={{ width: `${task.progress}%` }}
          />
        </div>

        <span className="progress-percent">{task.progress}%</span>
      </div> */}

      {canManage && (
        <form className="progress-form" onSubmit={saveStatus}>
          <label htmlFor={`status-${task.id}`}>Update status</label>

          <div className="progress-input">
            <select
              id={`status-${task.id}`}
              value={draftStatus}
              onChange={(event) => setDraftStatus(event.target.value)}
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving || draftStatus === (task.status || "Not Started")}
          >
            {saving ? "Saving..." : "Update"}
          </button>
        </form>
      )}

      {error && (
        <div className="message-error" role="alert">
          {error}
        </div>
      )}

    </div>
  );
}

export default TaskCard;
