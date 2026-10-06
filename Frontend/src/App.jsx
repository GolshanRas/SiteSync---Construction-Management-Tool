import { useEffect, useState } from "react";
import CreateProject from "./CreateProject";
import ManageProjects from "./ManageProjects";
import RoleManagement from "./RoleManagement";
import Login from "./Login";
import "./App.css";

function App() {
  const [message, setMessage] = useState("Connecting...");
  const [page, setPage] = useState("");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  });

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

  const handleLogin = (account) => {
    sessionStorage.setItem("user", JSON.stringify(account));
    setUser(account);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("user");
    setUser(null);
    setPage("");
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div>
      <nav className="navbar">
        <h1>SiteSync</h1>

        <div>
          <span className="nav-user">
            {user.firstname} {user.lastname} &middot; {user.role}
          </span>

          <button onClick={() => setPage("manage")}>
            Manage Projects
          </button>

          <button onClick={() => setPage("create")}>
            Create Project
          </button>
          <button onClick={() => setPage("roles")}>
            Role Management
          </button>
          <button onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </nav>

      <p className="backend-status">{message}</p>

      {page === "manage" && <ManageProjects />}

      {page === "create" && <CreateProject />}
      {page === "roles" && <RoleManagement />}
    </div>
  );
}

export default App;

