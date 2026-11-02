import { useState } from "react";

function Login({ onLogin }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);
    const account = { id: userId, password };

    try {
      const response = await fetch(
        `http://localhost:5000/api/login`,
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
        setMessage(data.message || "Invalid credentials.");
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

          <h1>Log In</h1>
          <p className="login-subtitle">
            Sign in to your SiteSync account.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-userid">User ID</label>
              <input
                id="login-userid"
                type="text"
                inputMode="numeric"
                pattern="[0-9]+"
                value={userId}
                onChange={(event) => {
                  const value = event.target.value;
                  if (/^\d*$/.test(value)) {
                    setUserId(value);
                  }
                }}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {message && (
              <p className="login-error" role="alert">
                {message}
              </p>
            )}

            <button type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : "Log In"}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
