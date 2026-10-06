import { useEffect, useState } from "react";

function RoleManagement() {
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState("");

  const getAccounts = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/accounts"
      );

      const data = await response.json();

      if (response.ok) {
        setAccounts(data);
      } else {
        setMessage("Could not load accounts.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  useEffect(() => {
    getAccounts();
  }, []);

  const updateRole = async (accountId, newRole) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/accounts/${accountId}/role`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            role: newRole,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage("Role updated successfully!");
        getAccounts();
      } else {
        setMessage(data.message || "Could not update role.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  return (
    <div className="page">

      <div className="page-header">
        <div>
          <h1>Role Management</h1>
          <p>Manage user roles and permissions.</p>
        </div>
      </div>

      {message && (
        <div className="manage-message">
          {message}
        </div>
      )}

      <div className="role-table">

        <div className="role-table-header">
          <span>Name</span>
          <span>Current Role</span>
          <span>Change Role</span>
        </div>

        {accounts.map((account) => (
          <div
            className="role-table-row"
            key={account.id}
          >
            <span>
              {account.firstname} {account.lastname}
            </span>

            <span className="role-badge">
              {account.role}
            </span>

            <select
              value={account.role}
              onChange={(event) =>
                updateRole(
                  account.id,
                  event.target.value
                )
              }
            >
              <option value="Admin">
                Admin
              </option>

              <option value="Project Manager">
                Project Manager
              </option>

              <option value="Supervisor">
                Supervisor
              </option>

              <option value="Worker">
                Worker
              </option>
            </select>
          </div>
        ))}

      </div>

    </div>
  );
}

export default RoleManagement;