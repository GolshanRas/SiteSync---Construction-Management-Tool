
import { useCallback, useEffect, useState } from "react";

const API = "http://localhost:5000";
const CATEGORIES = ["Labour", "Materials", "Equipment", "Travel", "Other"];

const money = (cents) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format((cents || 0) / 100);

const today = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const blankExpense = () => ({
  category: "Materials",
  description: "",
  amount: "",
  expense_date: today(),
});

function ProjectCosts({ project, user }) {
  const canManage = ["Admin", "Project Manager"].includes(user.role);

  const [overview, setOverview] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [planned, setPlanned] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  // Budget editing
  const [editingBudget, setEditingBudget] = useState(false);
  const [budget, setBudget] = useState("");

  // Planned costs editing
  const [savingPlanned, setSavingPlanned] = useState(false);

  // Expense editing
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(blankExpense);

  const request = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`${API}${path}`, {
        ...options,
        headers: {
          "X-User-Role": user.role,
          ...(options.body
            ? { "Content-Type": "application/json" }
            : {}),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `Request failed (${response.status})`
        );
      }

      return data;
    },
    [user.role]
  );

  // Load project costs, expenses, and planned costs
  const refresh = useCallback(async () => {
    const [costs, items, plannedData] = await Promise.all([
      request(`/api/projects/${project.id}/costs`),
      request(`/api/projects/${project.id}/expenses`),
      request(`/api/projects/${project.id}/planned-costs`),
    ]);

    setOverview(costs);
    setExpenses(items);

    const values = {};

    CATEGORIES.forEach((category) => {
      values[category] = (
        (plannedData[category] || 0) / 100
      ).toFixed(2);
    });

    setPlanned(values);
  }, [project.id, request]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setOverview(null);
    setExpenses([]);
    setPlanned({});

    Promise.all([
      request(`/api/projects/${project.id}/costs`),
      request(`/api/projects/${project.id}/expenses`),
      request(`/api/projects/${project.id}/planned-costs`),
    ])
      .then(([costs, items, plannedData]) => {
        if (!active) return;

        setOverview(costs);
        setExpenses(items);

        const values = {};

        CATEGORIES.forEach((category) => {
          values[category] = (
            (plannedData[category] || 0) / 100
          ).toFixed(2);
        });

        setPlanned(values);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [project.id, request]);

  // Save budget when user presses Enter or clicks outside
  const saveBudget = async () => {
    if (saving) return;

    const value = Number(budget);

    if (
      budget.trim() === "" ||
      !Number.isFinite(value) ||
      value < 0 ||
      !/^\d+(\.\d{1,2})?$/.test(budget.trim())
    ) {
      setError("Enter a valid budget amount.");
      return;
    }

    // No request needed if budget was not changed
    if (Math.round(value * 100) === overview.budget_cents) {
      setEditingBudget(false);
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await request(`/api/projects/${project.id}/budget`, {
        method: "PUT",
        body: JSON.stringify({ budget }),
      });

      const costs = await request(
        `/api/projects/${project.id}/costs`
      );

      setOverview(costs);
      setEditingBudget(false);
      setNotice("Budget updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startBudgetEdit = () => {
    setBudget((overview.budget_cents / 100).toFixed(2));
    setEditingBudget(true);
    setError("");
  };

  // Save planned costs
  const savePlannedCosts = async () => {
    for (const category of CATEGORIES) {
      const value = planned[category] ?? "";

      if (
        value.trim() === "" ||
        !/^\d+(\.\d{1,2})?$/.test(value.trim())
      ) {
        setError(`Enter a valid planned cost for ${category}.`);
        return;
      }
    }

    setSavingPlanned(true);
    setError("");
    setNotice("");

    try {
      await request(`/api/projects/${project.id}/planned-costs`, {
        method: "PUT",
        body: JSON.stringify(planned),
      });

      await refresh();
      setNotice("Planned costs saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPlanned(false);
    }
  };

  // Add or edit an expense
  const saveExpense = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const path =
        `/api/projects/${project.id}/expenses` +
        (editingExpense?.id ? `/${editingExpense.id}` : "");

      await request(path, {
        method: editingExpense?.id ? "PUT" : "POST",
        body: JSON.stringify(form),
      });

      await refresh();
      setEditingExpense(null);
      setNotice("Expense saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete an expense
  const deleteExpense = async (expense) => {
    if (
      !window.confirm(
        `Delete expense ${expense.description || `#${expense.id}`}?`
      )
    ) {
      return;
    }

    setError("");
    setNotice("");

    try {
      await request(
        `/api/projects/${project.id}/expenses/${expense.id}`,
        { method: "DELETE" }
      );

      await refresh();
      setNotice("Expense deleted successfully.");
    } catch (err) {
      setError(err.message);
    }
  };

  const startExpense = (expense = null) => {
    setEditingExpense(expense || { id: null });

    setForm(
      expense
        ? {
            category: expense.category,
            description: expense.description || "",
            amount: (expense.amount_cents / 100).toFixed(2),
            expense_date: expense.expense_date,
          }
        : blankExpense()
    );

    setError("");
    setNotice("");
  };

  // Calculations
  const totalPlanned = CATEGORIES.reduce(
    (total, category) =>
      total + Math.round(Number(planned[category] || 0) * 100),
    0
  );

  const totalActual = overview?.spent_cents || 0;
  const totalBudget = overview?.budget_cents || 0;
  const remaining = totalBudget - totalActual;
  const utilization = overview?.utilization_percent ?? 0;

  return (
    <section className="cost-section" aria-label="Project costs">
      <div className="section-header">
        <h2>Project Cost Overview</h2>
      </div>

      {loading && <p>Loading project costs...</p>}

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

      {overview && (
        <>
          {/* Summary cards */}
          <div className="cost-cards">
            <div className="cost-card">
              <span>
                Approved Budget {canManage && "✎"}
              </span>

              {editingBudget && canManage ? (
                <input
                  className="cost-inline-input"
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  value={budget}
                  disabled={saving}
                  onChange={(e) => setBudget(e.target.value)}
                  onBlur={saveBudget}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }

                    if (e.key === "Escape") {
                      setEditingBudget(false);
                    }
                  }}
                />
              ) : (
                <strong
                  className={canManage ? "cost-clickable" : ""}
                  onClick={canManage ? startBudgetEdit : undefined}
                  title={canManage ? "Click to edit budget" : ""}
                  tabIndex={canManage ? 0 : undefined}
                  role={canManage ? "button" : undefined}
                  onKeyDown={(e) => {
                    if (
                      canManage &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      startBudgetEdit();
                    }
                  }}
                >
                  {money(totalBudget)}
                </strong>
              )}
            </div>

            <div className="cost-card">
              <span>Total Planned</span>
              <strong>{money(totalPlanned)}</strong>
            </div>

            <div className="cost-card">
              <span>Total Actual</span>
              <strong>{money(totalActual)}</strong>
            </div>

            <div className="cost-card">
              <span>Remaining Budget</span>
              <strong className={remaining < 0 ? "cost-over" : ""}>
                {money(remaining)}
              </strong>
            </div>
          </div>

          {/* Budget utilization */}
          <div className="cost-panel">
            <h3>Budget Utilization</h3>

            <div className="cost-progress">
              <div
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, utilization)
                  )}%`,
                }}
              />
            </div>

            <p>
              {totalBudget > 0
                ? `${utilization}% of approved budget spent`
                : "No budget set"}
            </p>

            {totalPlanned > totalBudget && (
              <p className="cost-over">
                Planned costs exceed the approved budget by{" "}
                {money(totalPlanned - totalBudget)}.
              </p>
            )}

            {remaining < 0 && (
              <p className="cost-over">
                Actual spending exceeds the approved budget by{" "}
                {money(-remaining)}.
              </p>
            )}

            {/* Planned vs Actual table */}
            <h3>Planned vs. Actual by Category</h3>

            <div className="cost-table-wrap">
              <table className="cost-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Planned Cost</th>
                    <th>Actual Cost</th>
                    <th>Variance</th>
                  </tr>
                </thead>

                <tbody>
                  {CATEGORIES.map((category) => {
                    const plannedCents = Math.round(
                      Number(planned[category] || 0) * 100
                    );

                    const actualCents =
                      overview.category_totals?.[category] || 0;

                    const variance = plannedCents - actualCents;

                    return (
                      <tr key={category}>
                        <td>{category}</td>

                        <td>
                          {canManage ? (
                            <input
                              className="cost-inline-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={planned[category] ?? ""}
                              onChange={(e) =>
                                setPlanned({
                                  ...planned,
                                  [category]: e.target.value,
                                })
                              }
                            />
                          ) : (
                            money(plannedCents)
                          )}
                        </td>

                        <td>{money(actualCents)}</td>

                        <td
                          className={
                            variance < 0 ? "cost-over" : "cost-under"
                          }
                        >
                          {variance > 0 ? "+" : ""}
                          {money(variance)}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="cost-total-row">
                    <td>Total</td>
                    <td>{money(totalPlanned)}</td>
                    <td>{money(totalActual)}</td>
                    <td
                      className={
                        totalPlanned - totalActual < 0
                          ? "cost-over"
                          : "cost-under"
                      }
                    >
                      {totalPlanned - totalActual > 0 ? "+" : ""}
                      {money(totalPlanned - totalActual)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {canManage && (
              <button
                type="button"
                className="action-button"
                style={{ marginTop: "15px" }}
                onClick={savePlannedCosts}
                disabled={savingPlanned}
              >
                {savingPlanned
                  ? "Saving..."
                  : "Save Planned Costs"}
              </button>
            )}
          </div>
        </>
      )}

      {/* Expense management */}
      <div className="section-header">
        <h2>Expenses</h2>

        {canManage && !editingExpense && (
          <button
            type="button"
            className="action-button"
            onClick={() => startExpense()}
          >
            + Add Expense
          </button>
        )}
      </div>

      {editingExpense && canManage && (
        <form
          className="project-form cost-form"
          onSubmit={saveExpense}
        >
          <h3 className="form-title">
            {editingExpense.id ? "Edit Expense" : "Add Expense"}
          </h3>

          <label htmlFor="expense-category">Category</label>
          <select
            id="expense-category"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value })
            }
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <label htmlFor="expense-description">
            Description
          </label>
          <textarea
            id="expense-description"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <label htmlFor="expense-amount">Amount (CAD)</label>
          <input
            id="expense-amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.amount}
            onChange={(e) =>
              setForm({ ...form, amount: e.target.value })
            }
          />

          <label htmlFor="expense-date">Expense Date</label>
          <input
            id="expense-date"
            type="date"
            required
            value={form.expense_date}
            onChange={(e) =>
              setForm({ ...form, expense_date: e.target.value })
            }
          />

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Expense"}
            </button>

            <button
              type="button"
              className="secondary"
              onClick={() => setEditingExpense(null)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Expense list */}
      {!loading && overview && (
        <div className="cost-panel cost-expense-list">
          {expenses.length === 0 ? (
            <p>No expenses recorded yet.</p>
          ) : (
            <div className="cost-table-wrap">
              <table className="cost-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>

                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.expense_date}</td>
                      <td>{expense.category}</td>
                      <td>{expense.description || "—"}</td>
                      <td>{money(expense.amount_cents)}</td>

                      {canManage && (
                        <td className="cost-actions">
                          <button
                            type="button"
                            onClick={() => startExpense(expense)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteExpense(expense)}
                          >
                            Delete
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
      )}
    </section>
  );
}

export default ProjectCosts;
