from enum import StrEnum

class Roles(StrEnum):
    ADMIN = "Admin"
    WORKER = "Worker"
    PM = "Project Manager"
    SUPERVISOR = "Supervisor"