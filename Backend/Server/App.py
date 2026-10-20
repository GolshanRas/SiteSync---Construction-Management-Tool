from flask import Flask, jsonify, request
from flask_cors import CORS
from DB.Database import Database
from Client.Roles import *
from functools import wraps

app = Flask(__name__)
CORS(app)

db = Database()

def require_permission(permission: PermissionForTasks):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            caller_role_str = request.headers.get("X-User-Role")
            if not caller_role_str:
                return jsonify({"message": "Unauthorized: Missing user role"}), 401

            try:
                caller_role = Roles(caller_role_str)
            except ValueError:
                return jsonify({"message": f"Invalid role: '{caller_role_str}'"}), 400

            allowed_permissions = ROLE_PERMISSIONS.get(caller_role, set())
            if permission not in allowed_permissions:
                return jsonify({
                    "message": f"Access Denied: Role '{caller_role.value}' lacks permission '{permission.value}'"
                }), 403

            return func(*args, **kwargs)
        return wrapper
    return decorator

@app.route("/api/test")
def test():
    return jsonify({"message": "Backend is working!"})


@app.route("/api/accounts", methods=["POST"])
@require_permission(PermissionForTasks.MANAGE_ACCOUNTS)
def add_account():

    data = request.get_json()

    db.addAccount(
        data["lastname"],
        data["firstname"],
        data["role"],
        data["password"]
    )

    return jsonify({"message": "Account created!"})

@app.route("/api/register", methods=["POST"])
@require_permission(PermissionForTasks.MANAGE_ACCOUNTS)
def register():
    data = request.get_json(silent=True) or {}

    firstname = str(data.get("firstname", "")).strip()
    lastname = str(data.get("lastname", "")).strip()
    role = str(data.get("role", "")).strip()
    password = str(data.get("password", ""))

    allowed_roles = [
        "Admin",
        "Project Manager",
        "Worker",
        "Supervisor"
    ]

    if not firstname or not lastname or not role or not password:
        return jsonify({
            "message": "Please fill in all fields."
        }), 400

    if role not in allowed_roles:
        return jsonify({
            "message": "Invalid role."
        }), 400

    if db.accountExists(lastname, firstname):
        return jsonify({
            "message": "An account with that name already exists."
        }), 409

    db.addAccount(lastname, firstname, role, password)

    return jsonify({
        "message": "Account created!"
    }), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    firstname = str(data.get("firstname", "")).strip()
    lastname = str(data.get("lastname", "")).strip()
    password = str(data.get("password", ""))

    if not firstname or not lastname or not password:
        return jsonify({
            "message": "Please fill in all fields."
        }), 400

    account = db.verifyLogin(lastname, firstname, password)

    if account is None:
        return jsonify({
            "message": "Invalid name or password."
        }), 401

    return jsonify(account)


@app.route("/api/projects", methods=["POST"])
@require_permission(PermissionForTasks.MANAGE_PROJECT)
def create_project():
    data = request.get_json()

    db.addProject(
        data["name"],
        data["description"],
        data["location"],
        data["start_date"],
        data["end_date"]
    )

    return jsonify({"message": "Project created successfully!"})

@app.route("/api/projects", methods=["GET"])
@require_permission(PermissionForTasks.VIEW_PROJECT)
def get_projects():
    projects = db.getProjects()

    project_list = []

    for project in projects:
        project_list.append({
            "id": project[0],
            "name": project[1],
            "description": project[2],
            "location": project[3],
            "start_date": project[4],
            "end_date": project[5],
            "status": project[6]
        })

    return jsonify(project_list)

@app.route("/api/accounts", methods=["GET"])
@require_permission(PermissionForTasks.MANAGE_ACCOUNTS)
def get_accounts():
    accounts = db.getAccounts()

    account_list = []

    for account in accounts:
        account_list.append({
            "id": account[0],
            "firstname": account[1],
            "lastname": account[2],
            "role": account[3]
        })

    return jsonify(account_list)


@app.route("/api/accounts/<int:account_id>/role", methods=["PUT"])
@require_permission(PermissionForTasks.MANAGE_ACCOUNTS)
def update_role(account_id):
    data = request.get_json()

    allowed_roles = [
        "Admin",
        "Project Manager",
        "Worker",
        "Supervisor"
    ]

    role = data["role"]

    if role not in allowed_roles:
        return jsonify({
            "message": "Invalid role."
        }), 400

    db.updateRole(account_id, role)

    return jsonify({
        "message": "Role updated successfully!"
    })


if __name__ == "__main__":
    print(app.url_map)
    app.run(debug=True, port=5000)
