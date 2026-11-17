from enum import StrEnum

class Roles(StrEnum):
    ADMIN = "Admin"
    WORKER = "Worker"
    PM = "Project Manager"
    SUPERVISOR = "Supervisor"

class PermissionForTasks(StrEnum):
    VIEW_PROJECT = "view_project"
    VIEW_ALL_PROJECTS = "view_all_projects"
    CREATE_PROJECT = "create_project"
    EDIT_PROJECT = "edit_project"
    DELETE_PROJECT = "delete_project"

    VIEW_TASKS = "view_tasks"
    MANAGE_TASKS = "manage_tasks"
    UPDATE_STATUS = "update_status"

    VIEW_COSTS = "view_costs"
    VIEW_COST_SUMMARY = "view_cost_summary"
    ADD_EXPENSE = "add_expense"
    EDIT_EXPENSE = "edit_expense"
    DELETE_EXPENSE = "delete_expense"
    MANAGE_BUDGET = "manage_budget"

    VIEW_OVERVIEW = "view_overview"
    VIEW_DASHBOARD = "view_dashboard"
    VIEW_FULL_ANALYTICS = "view_full_analytics"

    VIEW_MEMBERS = "view_members"
    MANAGE_MEMBERS = "manage_members"

    MANAGE_ACCOUNTS = "manage_accounts"
    MANAGE_PERM = "manage_permissions"

    SEND_REQUEST = "send_request"
    MANAGE_REQUESTS = "manage_requests"
    CONTACT = "contact"


ROLE_PERMISSIONS = {
    Roles.ADMIN: set(PermissionForTasks),
    Roles.WORKER: {
        PermissionForTasks.VIEW_PROJECT,
        PermissionForTasks.VIEW_TASKS,
        PermissionForTasks.UPDATE_STATUS,
        PermissionForTasks.VIEW_DASHBOARD,
        PermissionForTasks.VIEW_MEMBERS,
        PermissionForTasks.SEND_REQUEST,
        PermissionForTasks.CONTACT,
    },
    Roles.SUPERVISOR: {
        PermissionForTasks.VIEW_PROJECT,
        PermissionForTasks.VIEW_TASKS,
        PermissionForTasks.MANAGE_TASKS,
        PermissionForTasks.UPDATE_STATUS,
        PermissionForTasks.VIEW_COSTS,
        PermissionForTasks.ADD_EXPENSE,
        PermissionForTasks.VIEW_DASHBOARD,
        PermissionForTasks.VIEW_MEMBERS,
        PermissionForTasks.SEND_REQUEST,
        PermissionForTasks.MANAGE_REQUESTS,
        PermissionForTasks.CONTACT,
    },
    Roles.PM: {
        PermissionForTasks.VIEW_PROJECT,
        PermissionForTasks.VIEW_ALL_PROJECTS,
        PermissionForTasks.CREATE_PROJECT,
        PermissionForTasks.EDIT_PROJECT,
        PermissionForTasks.VIEW_TASKS,
        PermissionForTasks.MANAGE_TASKS,
        PermissionForTasks.UPDATE_STATUS,
        PermissionForTasks.VIEW_COSTS,
        PermissionForTasks.VIEW_COST_SUMMARY,
        PermissionForTasks.ADD_EXPENSE,
        PermissionForTasks.EDIT_EXPENSE,
        PermissionForTasks.DELETE_EXPENSE,
        PermissionForTasks.MANAGE_BUDGET,
        PermissionForTasks.VIEW_OVERVIEW,
        PermissionForTasks.VIEW_DASHBOARD,
        PermissionForTasks.VIEW_FULL_ANALYTICS,
        PermissionForTasks.VIEW_MEMBERS,
        PermissionForTasks.MANAGE_MEMBERS,
        PermissionForTasks.SEND_REQUEST,
        PermissionForTasks.MANAGE_REQUESTS,
        PermissionForTasks.CONTACT,
    }
}

def getPermissions(role: Roles):
    try:
        return ROLE_PERMISSIONS.get(Roles(role), set())
    except ValueError:
        return set()

def hasPermission(role: Roles, permission: PermissionForTasks):
    return permission in getPermissions(role)