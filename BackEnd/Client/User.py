from functools import wraps
from Roles import *

class User:

    def __init__(self, id: int, name: str, role: Roles):
        self.id = id
        self.name = name
        if not isinstance(role, Roles):
            try:
                role = Roles(role)
            except:
                raise ValueError("Invalid role")
        self.role = role

    def roleAssignment(role: str):
        pass

