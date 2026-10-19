from enum import StrEnum

class Roles(StrEnum):
    ADMIN = "Admin"
    WORKER = "Worker"
    PM = "Project Manager"
    SUPERVISOR = "Supervisor"

class PermissionForTasks(StrEnum):
    MANAGE_PROJECT = "manageP" # create, edit, assign and delete projects
    MANAGE_TASKS = "manageT"  # create, edit, assign and delete tasks
    MANAGE_ACCOUNTS = "manageA" # create, edit and delete accounts, give them roles
    VIEW_PROJECT = "view" #project and tasks
    UPDATE_STATUS = "update"
    ANALYSIS = "analysis"
    CONTACT = "contact" # contact supervisor
    MANAGE_PERM = "manageP"

ROLE_PERMISSIONS: dict[Roles, set[PermissionForTasks]] = {
    Roles.ADMIN:{
        PermissionForTasks.MANAGE_PERM,
        PermissionForTasks.MANAGE_ACCOUNTS,
        PermissionForTasks.CONTACT
    },
    Roles.WORKER:{
        PermissionForTasks.VIEW_PROJECT,
        PermissionForTasks.UPDATE_STATUS,
        PermissionForTasks.CONTACT
    },
    Roles.SUPERVISOR:{
        PermissionForTasks.MANAGE_TASKS,
        PermissionForTasks.MANAGE_PROJECT,
        PermissionForTasks.UPDATE_STATUS,
        PermissionForTasks.CONTACT,
    },
    Roles.PM:{
        PermissionForTasks.MANAGE_TASKS,
        PermissionForTasks.MANAGE_PROJECT,
        PermissionForTasks.UPDATE_STATUS,
        PermissionForTasks.CONTACT,
        PermissionForTasks.ANALYSIS
    }
}

def getPermissions(role: Roles):
    return ROLE_PERMISSIONS.get(role, set())

def hasPermission(role: Roles, permission: PermissionForTasks):
    return permission in ROLE_PERMISSIONS.get(role, set())