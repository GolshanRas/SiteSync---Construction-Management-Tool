import { useState } from "react";

function Login({ onLogin }) {
  const [isAdminRegister, setIsAdminRegister] = useState(false)
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [codeword, setCodeword] = useState("");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const switchToAdminRegister = () => {
      setIsAdminRegister(true);
      setPassword("");
      setMessage("");
      setNotice("");
    };

  const switchToLogin = () => {
    setIsAdminRegister(false);
    setPassword("");
    setCodeword("");
    setMessage("");
  };

  const handleLoginSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setNotice("");
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
  }

  const handleAdminRegisterSubmit = async (event) => {
      event.preventDefault();
      setMessage("");
      setNotice("");
      setLoading(true);

      try {
        const response = await fetch("http://localhost:5000/api/register-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstname,
            lastname,
            password,
            codeword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.message || "Failed to register admin.");
        } else {
          setIsAdminRegister(false);
          setUserId(data.user_id ? String(data.user_id) : "");
          setPassword("");
          setCodeword("");
          setNotice(
            `Admin account created! Your User ID is ${data.user_id}. Log in below.`
          );
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
          <h1>{isAdminRegister ? "Admin Registration" : "Log In"}</h1>
          <p className="login-subtitle">
            {isAdminRegister
              ? "Register a new administrator account using your codeword."
              : "Sign in to your SiteSync account."}
          </p>

          {notice && <p className="login-success">{notice}</p>}
          {message && (
            <p className="login-error" role="alert">
              {message}
            </p>
          )}

          {isAdminRegister ? (
            <form onSubmit={handleAdminRegisterSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="admin-firstname">First Name</label>
                <input
                  id="admin-firstname"
                  type="text"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="admin-lastname">Last Name</label>
                <input
                  id="admin-lastname"
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="admin-password">Password</label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="login-field">
                <label htmlFor="admin-codeword">Admin Codeword</label>
                <input
                  id="admin-codeword"
                  type="password"
                  placeholder="Enter secret codeword"
                  value={codeword}
                  onChange={(e) => setCodeword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Registering..." : "Create Admin Account"}
              </button>

              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={switchToLogin}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0066cc",
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                    font: "inherit",
                  }}
                >
                  &larr; Back to Log In
                </button>
              </div>
            </form>
          ) : (
            /* Regular Login Form */
            <form onSubmit={handleLoginSubmit} className="login-form">
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

              <button type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Log In"}
              </button>

              {/* Admin Link */}
              <div style={{ marginTop: "1.25rem", textAlign: "center", fontSize: "0.9rem" }}>
                <button
                  type="button"
                  onClick={switchToAdminRegister}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#0066cc",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontWeight: 500,
                    padding: 0,
                    font: "inherit",
                  }}
                >
                  Are you an Admin?
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;