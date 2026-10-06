import { useState } from "react";

function CreateProject() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const project = {
      name: name,
      description: description,
      location: location,
      start_date: startDate,
      end_date: endDate,
    };

    try {
      const response = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(project),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Project created successfully!");

        setName("");
        setDescription("");
        setLocation("");
        setStartDate("");
        setEndDate("");
      } else {
        setMessage("Could not create project.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  return (
    <div className="page">
      <h1>Create Project</h1>

      <form onSubmit={handleSubmit} className="project-form">

        <label>Project Name</label>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

        <label>Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <label>Location</label>
        <input
          type="text"
          value={location}
          onChange={(event) => setLocation(event.target.value)}
        />

        <label>Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <label>End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />

        <button type="submit">Create Project</button>

      </form>

      {message && <p>{message}</p>}
    </div>
  );
}

export default CreateProject;