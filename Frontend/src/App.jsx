import { useEffect, useState } from "react";
import CreateProject from "./CreateProject";
import ManageProjects from "./ManageProjects";
import "./App.css";

function App() {
  const [message, setMessage] = useState("Connecting...");
  const [page, setPage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/test")
      .then((response) => response.json())
      .then((data) => {
        setMessage(data.message);
      })
      .catch((error) => {
        console.error(error);
        setMessage("Could not connect to backend");
      });
  }, []);

  return (
    <div>
      <nav className="navbar">
        <h1>SiteSync</h1>

        <div>
          <button onClick={() => setPage("manage")}>
            Manage Projects
          </button>

          <button onClick={() => setPage("create")}>
            Create Project
          </button>
        </div>
      </nav>

      <p className="backend-status">{message}</p>

      {page === "manage" && <ManageProjects />}

      {page === "create" && <CreateProject />}
    </div>
  );
}

export default App;

