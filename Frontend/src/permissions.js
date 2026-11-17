
export const ROLE_PERMISSIONS = {
  Admin: ["all"],

  "Project Manager": [
    "view_project",
    "view_all_projects",
    "create_project",
    "edit_project",
    "view_tasks",
    "manage_tasks",
    "update_status",
    "view_costs",
    "view_cost_summary",
    "add_expense",
    "edit_expense",
    "delete_expense",
    "manage_budget",
    "view_overview",
    "view_dashboard",
    "view_full_analytics",
    "view_members",
    "manage_members",
    "manage_requests",
    "delete_project",
  ],

  Supervisor: [
    "view_project",
    "view_tasks",
    "manage_tasks",
    "update_status",
    "view_costs",
    "add_expense",
    "view_dashboard",
    "view_members",
    "manage_requests",
  ],

  Worker: [
    "view_project",
    "view_tasks",
    "update_status",
    "view_dashboard",
    "view_members",
  ],
};

export function can(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];

  return (
    permissions.includes("all") ||
    permissions.includes(permission)
  );
}

export function authHeaders(user) {
  return {
    "X-User-Role": user.role,
    "X-User-Id": String(user.id),
  };
}
