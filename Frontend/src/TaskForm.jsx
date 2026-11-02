import { useEffect, useState } from "react";

// One form for both jobs:
//   - creating a task: pass `project` (no `task`)
//   - editing a task:  pass `task`
function TaskForm({ project, task, user, onSaved, onCancel }) {
  const isEdit = Boolean(task);

  const [name, setName] = useState(task ? task.name : "");
  const [description, setDescription] = useState(task ? task.description : "");
  const [deadline, setDeadline] = useState(task ? task.deadline : "");
  const [progress, setProgress] = useState(task ? String(task.progress) : "0");
  const [selected, setSelected] = useState(
    task
      ? [...task.workers, ...task.supervisors].map((person) => person.id)
      : []
  );
  const [people, setPeople] = useState([]);
  const [peopleLoaded, setPeopleLoaded] = useState(false);
  const [peopleError, setPeopleError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // Unique ids, in case several forms are open at once
  const idPrefix = isEdit ? `edit-${task.id}` : "new-task";

  // Load the workers and supervisors that tasks can be assigned to
  useEffect(() => {
    let ignore = false;

    fetch("http://localhost:5000/api/assignees", {
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
          setPeople(data);
        } else {
          setPeopleError(data.message || "Could not load workers and supervisors.");
        }

        setPeopleLoaded(true);
      })
      .catch((error) => {
        console.error(error);

        if (ignore) return;

        setPeopleError("Could not connect to the server.");
        setPeopleLoaded(true);
      });

    return () => {
      ignore = true;
    };
  }, [user.role]);

  const workers = people.filter((person) => person.role === "Worker");
  const supervisors = people.filter((person) => person.role === "Supervisor");
  const canPickPeople = peopleLoaded && !peopleError;

  // Editing any field clears an old error message
  const handleChange = (setter) => (event) => {
    setter(event.target.value);
    setMessage("");
  };

  const togglePerson = (id) => {
    setMessage("");
    setSelected((current) =>
      current.includes(id)
        ? current.filter((personId) => personId !== id)
        : [...current, id]
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");

    const progressNumber = Number(progress);

    if (
      isEdit &&
      (progress.trim() === "" ||
        !Number.isInteger(progressNumber) ||
        progressNumber < 0 ||
        progressNumber > 100)
    ) {
      setMessage("Progress must be a whole number from 0 to 100.");
      return;
    }

    const body = {
      name: name,
      description: description,
      deadline: deadline,
    };

    if (isEdit) {
      body.progress = progressNumber;
    }

    // If the list of people couldn't be loaded, leave the assignees alone
    if (canPickPeople) {
      body.assignee_ids = selected.filter((id) =>
        people.some((person) => person.id === id)
      );
    }

    setSaving(true);

    try {
      const response = await fetch(
        isEdit
          ? `http://localhost:5000/api/tasks/${task.id}`
          : `http://localhost:5000/api/projects/${project.id}/tasks`,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": user.role,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (response.ok) {
        onSaved(data);
      } else {
        setMessage(
          data.message ||
            (isEdit ? "Could not save changes." : "Could not create task.")
        );
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  const renderPeople = (list, groupLabelId, emptyText) => {
    if (!peopleLoaded) {
      return <div className="assignee-empty">Loading...</div>;
    }

    if (peopleError) {
      return <div className="assignee-empty">{peopleError}</div>;
    }

    if (list.length === 0) {
      return <div className="assignee-empty">{emptyText}</div>;
    }

    return (
      <div
        className="assignee-list"
        role="group"
        aria-labelledby={groupLabelId}
      >
        {list.map((person) => (
          <label className="assignee-option" key={person.id}>
            <input
              type="checkbox"
              checked={selected.includes(person.id)}
              onChange={() => togglePerson(person.id)}
            />

            <span>
              {person.firstname} {person.lastname}
            </span>

            <span className="assignee-id">ID {person.id}</span>
          </label>
        ))}
      </div>
    );
  };

  return (
    <div className="create-task">
      <form onSubmit={handleSubmit} className="project-form">

        <h3 className="form-title">{isEdit ? "Edit Task" : "New Task"}</h3>

        <label htmlFor={`${idPrefix}-name`}>Task Name</label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={handleChange(setName)}
          required
        />

        <label htmlFor={`${idPrefix}-description`}>Description</label>
        <textarea
          id={`${idPrefix}-description`}
          value={description}
          onChange={handleChange(setDescription)}
        />

        <label htmlFor={`${idPrefix}-deadline`}>Deadline</label>
        <input
          id={`${idPrefix}-deadline`}
          type="date"
          value={deadline}
          onChange={handleChange(setDeadline)}
        />

        {isEdit && (
          <>
            <label htmlFor={`${idPrefix}-progress`}>Progress (%)</label>
            <input
              id={`${idPrefix}-progress`}
              type="number"
              min="0"
              max="100"
              step="1"
              value={progress}
              onChange={handleChange(setProgress)}
              required
            />
          </>
        )}

        <div className="field-label" id={`${idPrefix}-workers-label`}>
          Assign Workers
        </div>
        {renderPeople(
          workers,
          `${idPrefix}-workers-label`,
          "There are no worker accounts yet."
        )}

        <div className="field-label" id={`${idPrefix}-supervisors-label`}>
          Assign Supervisors
        </div>
        {renderPeople(
          supervisors,
          `${idPrefix}-supervisors-label`,
          "There are no supervisor accounts yet. An admin can give someone the Supervisor role under Role Management."
        )}

        {message && (
          <div className="message-error" role="alert">
            {message}
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
              ? "Save Changes"
              : "Create Task"}
          </button>

          <button
            type="button"
            className="secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  );
}

export default TaskForm;
