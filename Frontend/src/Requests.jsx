import { useEffect, useState } from "react";

function getToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function Requests({ user }) {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [requests, setRequests] = useState([]);
  const [requestDate, setRequestDate] = useState(getToday);
  const [description, setDescription] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const canManageRequests = ["Admin", "Project Manager", "Supervisor"].includes(
    user.role
  );

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      setLoadingProjects(true);
      setError("");

      try {
        const response = await fetch("http://localhost:5000/api/projects", {
          headers: { "X-User-Role": user.role },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load projects.");
        }

        if (!cancelled) {
          setProjects(data);
          setProjectId((current) => current || String(data[0]?.id || ""));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not connect to the server.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    };

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [user.role]);

  useEffect(() => {
    if (!projectId) {
      setRequests([]);
      return undefined;
    }

    let cancelled = false;

    const loadRequests = async () => {
      setLoadingRequests(true);
      setError("");

      try {
        const response = await fetch(
          `http://localhost:5000/api/requests?project_id=${encodeURIComponent(projectId)}`,
          { headers: { "X-User-Role": user.role } }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load requests.");
        }

        if (!cancelled) {
          setRequests(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not connect to the server.");
        }
      } finally {
        if (!cancelled) {
          setLoadingRequests(false);
        }
      }
    };

    loadRequests();

    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey, user.role]);

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      const response = await fetch("http://localhost:5000/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": user.role,
        },
        body: JSON.stringify({
          project_id: Number(projectId),
          requester_id: user.id,
          request_date: requestDate,
          description: description.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not submit request.");
      }

      setDescription("");
      setNotice("Request submitted.");
      setRefreshKey((key) => key + 1);
    } catch (submitError) {
      setError(submitError.message || "Could not connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (requestId, newStatus) => {
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/requests/${requestId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-User-Role": user.role,
          },
          body: JSON.stringify({ new_status: newStatus }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update request.");
      }

      setNotice("Request status updated.");
      setRefreshKey((key) => key + 1);
    } catch (updateError) {
      setError(updateError.message || "Could not connect to the server.");
    }
  };

  const removeRequest = async (requestId) => {
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/requests/${requestId}`,
        {
          method: "DELETE",
          headers: { "X-User-Role": user.role },
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete request.");
      }

      setNotice("Request deleted.");
      setRefreshKey((key) => key + 1);
    } catch (deleteError) {
      setError(deleteError.message || "Could not connect to the server.");
    }
  };

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1>Requests</h1>
          <p>Submit a request or review requests for a project.</p>
        </div>
      </div>

      {error && <p className="login-error" role="alert">{error}</p>}
      {notice && <p className="login-success" role="status">{notice}</p>}

      {loadingProjects ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <p>No projects are available for requests.</p>
      ) : (
        <>
          <form onSubmit={submitRequest} className="project-form">
            <h2>Submit a request</h2>

            <label htmlFor="request-project">Project</label>
            <select
              id="request-project"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              required
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <label htmlFor="request-date">Request date</label>
            <input
              id="request-date"
              type="date"
              value={requestDate}
              onChange={(event) => setRequestDate(event.target.value)}
              required
            />

            <label htmlFor="request-description">Description</label>
            <textarea
              id="request-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              required
            />

            <button type="submit" disabled={submitting || !projectId}>
              {submitting ? "Submitting..." : "Submit request"}
            </button>
          </form>

          <section className="requests-section">
            <h2>Project requests</h2>
            {loadingRequests ? (
              <p>Loading requests...</p>
            ) : requests.length === 0 ? (
              <p>No requests for this project yet.</p>
            ) : (
              <div className="project-list">
                {requests.map((requestItem) => (
                  <article className="project-card" key={requestItem.request_id}>
                    <div className="request-heading">
                      <h3>Request #{requestItem.request_id}</h3>
                      <strong>{requestItem.status}</strong>
                    </div>
                    <p>{requestItem.description}</p>
                    <p>
                      <strong>Submitted by:</strong>{" "}
                      {requestItem.requester_firstname} {requestItem.requester_lastname}
                    </p>
                    <p><strong>Date:</strong> {requestItem.request_date}</p>

                    {canManageRequests && (
                      <div className="request-actions">
                        {requestItem.status === "Pending" && (
                          <>
                            <button
                              type="button"
                              className="action-button"
                              onClick={() => changeStatus(requestItem.request_id, "Approved")}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="action-button secondary"
                              onClick={() => changeStatus(requestItem.request_id, "Denied")}
                            >
                              Deny
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="action-button secondary"
                          onClick={() => removeRequest(requestItem.request_id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default Requests;
