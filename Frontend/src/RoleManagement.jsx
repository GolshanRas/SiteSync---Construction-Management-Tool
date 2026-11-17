import { useCallback, useEffect, useState } from "react";

function RoleManagement({user}) {
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [role, setRole] = useState("Worker");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchAccounts = useCallback(async () => {
    const response = await fetch("http://localhost:5000/api/accounts", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${user.session_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error("Could not load accounts.");
    }

    return data;
  }, [user.session_token]);

  const getAccounts = async () => {
    try {
      setAccounts(await fetchAccounts());
    } catch (error) {
      console.error(error);
      setMessage(
        error.message === "Could not load accounts."
          ? error.message
          : "Could not connect to the server."
      );
    }
  };

  useEffect(() => {
    let active = true;

    fetchAccounts()
      .then((data) => {
        if (active) {
          setAccounts(data);
        }
      })
      .catch((error) => {
        console.error(error);
        if (active) {
          setMessage(
            error.message === "Could not load accounts."
              ? error.message
              : "Could not connect to the server."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [fetchAccounts]);

  const createAccount = async (event) => {
    event.preventDefault();
    setMessage("");
    setCreating(true);

    try {
      const response = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.session_token}`,
        },
        body: JSON.stringify({ firstname, lastname, role, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(
          data.user_id === undefined || data.user_id === null
            ? "Account created successfully, but the server did not return a user ID."
            : `Account created successfully! User ID: ${data.user_id}.`
        );
        setFirstname("");
        setLastname("");
        setRole("Worker");
        setPassword("");
        await getAccounts();
      } else {
        setMessage(data.message || "Could not create account.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async (accountId, newRole) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/accounts/${accountId}/role`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.session_token}`,
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
        <div className="manage-message" role="status">
          {message}
        </div>
      )}

      <form onSubmit={createAccount} className="project-form">
        <h2>Create Account</h2>
        <label htmlFor="account-firstname">First Name</label>
        <input
          id="account-firstname"
          value={firstname}
          onChange={(event) => setFirstname(event.target.value)}
          required
        />

        <label htmlFor="account-lastname">Last Name</label>
        <input
          id="account-lastname"
          value={lastname}
          onChange={(event) => setLastname(event.target.value)}
          required
        />

        <label htmlFor="account-role">Role</label>
        <select
          id="account-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="Project Manager">Project Manager</option>
          <option value="Supervisor">Supervisor</option>
          <option value="Worker">Worker</option>
          <option value="Admin">Admin</option>
        </select>

        <label htmlFor="account-password">Password</label>
        <input
          id="account-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button type="submit" disabled={creating}>
          {creating ? "Creating..." : "Create Account"}
        </button>
      </form>

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