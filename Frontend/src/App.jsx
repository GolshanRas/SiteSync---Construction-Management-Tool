import { useEffect, useState } from "react";
import CreateProject from "./CreateProject";
import ManageProjects from "./ManageProjects";
import RoleManagement from "./RoleManagement";
import Login from "./Login";
import Dashboard from "./Dashboard";
import "./App.css";

function App() {
  const [message, setMessage] = useState("Connecting...");
  const [page, setPage] = useState("");
  const [manageKey, setManageKey] = useState(0);
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
    setPage("dashboard");
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

          <button onClick={() => setPage("dashboard")}>
            Dashboard
          </button>

          <button
            onClick={() => {
              setPage("manage");
              setManageKey((key) => key + 1);
            }}
          >
            Manage Projects
          </button>

          {["Admin", "Project Manager"].includes(user.role) && (
            <button onClick={() => setPage("create")}>
              Create Project
            </button>
          )}
          {user.role === "Admin" && (
            <button onClick={() => setPage("roles")}>
              Role Management
            </button>
          )}
          <button onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </nav>

      <p className="backend-status">{message}</p>

      {page === "dashboard" && (
        <Dashboard user={user} setPage={setPage} />
      )}

      {page === "manage" && <ManageProjects key={manageKey} user={user} />}

      {page === "create" &&
        ["Admin", "Project Manager"].includes(user.role) && (
          <CreateProject user={user} />
        )}

      {page === "roles" && user.role === "Admin" && (
        <RoleManagement user={user} />
      )}
    </div>
  );
}

export default App;

