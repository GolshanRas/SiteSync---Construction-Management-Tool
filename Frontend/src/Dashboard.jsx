import { useEffect, useState } from "react";

function Dashboard({ user, setPage }) {
  const [projects, setProjects] = useState([]);
  const [accountCount, setAccountCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError("");

      try {
        // 1. Fetch Projects (Available to all roles with VIEW_PROJECT permission)
        const projectsRes = await fetch("http://localhost:5000/api/projects", {
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": user?.role || "",
          },
        });

        if (!projectsRes.ok) {
          throw new Error("Failed to load project metrics.");
        }
        const projectsData = await projectsRes.json();

        // 2. Fetch Accounts Count if caller is Admin
        let accountsTotal = null;
        if (user?.role === "Admin") {
          const accountsRes = await fetch("http://localhost:5000/api/accounts", {
            headers: {
              "Content-Type": "application/json",
              "X-User-Role": user?.role || "",
            },
          });
          if (accountsRes.ok) {
            const accountsData = await accountsRes.json();
            accountsTotal = accountsData.length;
          }
        }

        if (isMounted) {
          setProjects(projectsData);
          setAccountCount(accountsTotal);
        }
      } catch (err) {
        if (isMounted) {
          console.error(err);
          setError("Could not load dashboard data from server.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="page">
        <h2>Dashboard</h2>
        <p>Loading your overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <h2>Dashboard</h2>
        <p className="login-error">{error}</p>
      </div>
    );
  }

  const activeProjects = projects.filter(
    (p) => (p.status || "").toLowerCase() !== "completed"
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Welcome, {user.firstname}!</h1>
          <p>
            Role: <strong>{user.role}</strong> &middot; Overview and system
            metrics
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          margin: "1.5rem 0",
        }}
      >
        <div className="project-card">
          <h3>Total Projects</h3>
          <p style={{ fontSize: "1.75rem", fontWeight: "bold", margin: "0.5rem 0" }}>
            {projects.length}
          </p>
          <button type="button" onClick={() => setPage("manage")}>
            View All Projects
          </button>
        </div>

        <div className="project-card">
          <h3>Active Projects</h3>
          <p style={{ fontSize: "1.75rem", fontWeight: "bold", margin: "0.5rem 0" }}>
            {activeProjects.length}
          </p>
          <span>In-progress or scheduled</span>
        </div>

        {user.role === "Admin" && accountCount !== null && (
          <div className="project-card">
            <h3>Registered Accounts</h3>
            <p style={{ fontSize: "1.75rem", fontWeight: "bold", margin: "0.5rem 0" }}>
              {accountCount}
            </p>
            <button type="button" onClick={() => setPage("roles")}>
              Manage Roles
            </button>
          </div>
        )}

        {/* Requests & Issues Widget */}
        <div className="project-card">
          <h3>Material / Issue Requests</h3>
          <p style={{ fontSize: "0.95rem", color: "#666", marginTop: "0.5rem" }}>
            <em>No open requests</em>
          </p>
        </div>
      </div>

      {/* Role-Varying Quick Actions / Details */}
      <div style={{ marginTop: "2rem" }}>
        {["Admin", "Project Manager"].includes(user.role) && (
          <div
            style={{
              padding: "1rem",
              background: "#f4f6f8",
              borderRadius: "8px",
              marginBottom: "1.5rem",
            }}
          >
            <h3>Manager Actions</h3>
            <p>Start a new construction undertaking or allocate assets:</p>
            <button type="button" onClick={() => setPage("create")}>
              + Create New Project
            </button>
          </div>
        )}

        <h3>Recent Projects</h3>
        {projects.length === 0 ? (
          <p>No projects found in the system.</p>
        ) : (
          <div className="project-list">
            {projects.slice(0, 3).map((project) => (
              <div key={project.id} className="project-card">
                <h4>{project.name}</h4>
                <p>
                  <strong>Location:</strong> {project.location || "N/A"}
                </p>
                <p>
                  <strong>Status:</strong> {project.status || "Planned"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;