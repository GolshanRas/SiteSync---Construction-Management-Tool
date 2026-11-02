import { useEffect, useState } from "react";
import ProjectDetail from "./ProjectDetail";

function ManageProjects({ user}) {
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);

  const getProjects = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/projects", {
        method: "GET",
        headers: {
          "X-User-Role": user.role,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setProjects(data);
      } else {
        setMessage("Could not load projects.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  useEffect(() => {
    getProjects();
  }, []);

  if (selectedProject) {
    return (
      <ProjectDetail
        project={selectedProject}
        user={user}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  return (
    <div className="page">
      <h1>Manage Projects</h1>

      {message && <p>{message}</p>}

      {projects.length === 0 ? (
        <p>No projects have been created yet.</p>
      ) : (
        <div className="project-list">

          {projects.map((project) => (
            <div
              className="project-card clickable"
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedProject(project)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedProject(project);
                }
              }}
            >

              <h2>{project.name}</h2>

              <p>
                <strong>Description:</strong> {project.description}
              </p>

              <p>
                <strong>Location:</strong> {project.location}
              </p>

              <p>
                <strong>Start Date:</strong> {project.start_date}
              </p>

              <p>
                <strong>End Date:</strong> {project.end_date}
              </p>

              <p>
                <strong>Status:</strong> {project.status}
              </p>

              <span className="project-card-link">View tasks &rarr;</span>

            </div>
          ))}

        </div>
      )}
    </div>
  );
}

export default ManageProjects;