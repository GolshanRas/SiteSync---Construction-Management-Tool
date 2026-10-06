import { useState } from "react";

const ROLES = ["Admin", "Project Manager", "Supervisor", "Worker"];

function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [role, setRole] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const switchMode = (newMode) => {
    setMode(newMode);
    setPassword("");
    setMessage("");
    setNotice("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setNotice("");
    setLoading(true);

    const account = {
      firstname: firstname,
      lastname: lastname,
      password: password,
    };

    if (isRegister) {
      account.role = role;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/${isRegister ? "register" : "login"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(account),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Something went wrong.");
      } else if (isRegister) {
        setMode("login");
        setPassword("");
        setRole("");
        setNotice("Account created! Log in to continue.");
      } else {
        onLogin(data);
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <nav className="navbar">
        <h1>SiteSync</h1>
      </nav>

      <div className="login-page">
        <div className="login-card">

          <div className="login-tabs">
            <button
              type="button"
              className={!isRegister ? "active" : ""}
              onClick={() => switchMode("login")}
            >
              Log In
            </button>

            <button
              type="button"
              className={isRegister ? "active" : ""}
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>

          <h1>{isRegister ? "Create Account" : "Log In"}</h1>
          <p className="login-subtitle">
            {isRegister
              ? "Register a new SiteSync account."
              : "Sign in to your SiteSync account."}
          </p>

          <form onSubmit={handleSubmit} className="login-form">

            <div className="login-field">
              <label htmlFor="login-firstname">First Name</label>
              <input
                id="login-firstname"
                type="text"
                autoComplete="given-name"
                value={firstname}
                onChange={(event) => setFirstname(event.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-lastname">Last Name</label>
              <input
                id="login-lastname"
                type="text"
                autoComplete="family-name"
                value={lastname}
                onChange={(event) => setLastname(event.target.value)}
                required
              />
            </div>

            {isRegister && (
              <div className="login-field">
                <label htmlFor="login-role">Role</label>
                <select
                  id="login-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a role
                  </option>

                  {ROLES.map((roleName) => (
                    <option key={roleName} value={roleName}>
                      {roleName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {notice && <p className="login-success">{notice}</p>}

            {message && (
              <p className="login-error" role="alert">
                {message}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : isRegister
                ? "Create Account"
                : "Log In"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
