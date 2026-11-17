
import { useEffect, useState } from "react";
import { can, authHeaders } from "./permissions";

const API = "http://localhost:5000";

export default function ProjectMembers({ project, user }) {
  const canManage = can(user.role, "manage_members");

  const [members, setMembers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...authHeaders(user),
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  async function loadMembers() {
    const data = await api(`/api/projects/${project.id}/members`);
    setMembers(data);
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setNotice("");
    setSelected("");
    setMembers([]);
    setAccounts([]);

    async function load() {
      try {
        const membersData = await api(
          `/api/projects/${project.id}/members`
        );

        const accountsData = canManage
          ? await api("/api/member-candidates")
          : [];

        if (!active) return;

        setMembers(membersData);
        setAccounts(accountsData);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [project.id, user.id, user.role]);

  async function addMember() {
    if (!selected || saving) return;

    try {
      setSaving(true);
      setError("");
      setNotice("");

      await api(`/api/projects/${project.id}/members`, {
        method: "POST",
        body: JSON.stringify({
          account_id: Number(selected),
        }),
      });

      setSelected("");
      await loadMembers();
      setNotice("Member added successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(id) {
    if (!window.confirm("Remove this member from the project?")) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      await api(
        `/api/projects/${project.id}/members/${id}`,
        { method: "DELETE" }
      );

      await loadMembers();
      setNotice("Member removed successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const available = accounts.filter(
    (account) =>
      !members.some(
        (member) => Number(member.id) === Number(account.id)
      )
  );

  return (
    <section className="cost-section">
      <div className="section-header">
        <div>
          <h2>Project Members</h2>
          <p>
            View project members and manage access to this project.
          </p>
        </div>
      </div>

      {error && (
        <div className="message-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="message-success" role="status">
          {notice}
        </div>
      )}

      {loading ? (
        <p>Loading project members...</p>
      ) : (
        <>
          <div className="gantt-summary">
            <div>
              <span>Total Members</span>
              <strong>{members.length}</strong>
            </div>

            <div>
              <span>Project Managers</span>
              <strong>
                {members.filter(
                  (m) => m.role === "Project Manager"
                ).length}
              </strong>
            </div>

            <div>
              <span>Supervisors</span>
              <strong>
                {members.filter(
                  (m) => m.role === "Supervisor"
                ).length}
              </strong>
            </div>

            <div>
              <span>Workers</span>
              <strong>
                {members.filter(
                  (m) => m.role === "Worker"
                ).length}
              </strong>
            </div>
          </div>

          {canManage && (
            <div className="cost-panel">
              <div className="section-header">
                <h3>Add Project Member</h3>
              </div>

              <div className="member-add-row">
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  disabled={saving}
                  aria-label="Select project member"
                >
                  <option value="">Select a user...</option>

                  {available.map((account) => (
                    <option
                      key={account.id}
                      value={account.id}
                    >
                      {account.firstname} {account.lastname}
                      {" "}({account.role})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="action-button"
                  onClick={addMember}
                  disabled={!selected || saving}
                >
                  {saving ? "Adding..." : "+ Add Member"}
                </button>
              </div>

              {available.length === 0 && (
                <p>All available users are already members.</p>
              )}
            </div>
          )}

          <div className="cost-panel">
            <div className="section-header">
              <h3>Members</h3>
              <span>{members.length} total</span>
            </div>

            {members.length === 0 ? (
              <p>No members have been added to this project.</p>
            ) : (
              <div className="cost-table-wrap">
                <table className="cost-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      {canManage && <th>Actions</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td>
                          {member.firstname} {member.lastname}
                        </td>

                        <td>{member.role}</td>

                        {canManage && (
                          <td className="cost-actions">
                            <button
                              type="button"
                              onClick={() =>
                                removeMember(member.id)
                              }
                              disabled={saving}
                            >
                              Remove
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
