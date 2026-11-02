from flask import Flask, jsonify, request
from flask_cors import CORS
from DB.Database import Database
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from Client.Roles import *
from functools import wraps
from datetime import datetime

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

def parse_progress(value):
    """Return value as a whole number from 0 to 100, or None if it isn't one."""
    if isinstance(value, bool):
        return None

    if isinstance(value, float) and value.is_integer():
        value = int(value)

    if isinstance(value, str):
        value = value.strip()
        if len(value) > 3 or not value.isdecimal():
            return None
        value = int(value)

    if not isinstance(value, int) or not 0 <= value <= 100:
        return None

    return value


def parse_id_list(value):
    """Return a list of unique whole numbers, or None if value isn't one."""
    if value is None:
        return []

    if not isinstance(value, list):
        return None

    ids = []

    for item in value:
        if isinstance(item, bool) or not isinstance(item, int):
            return None
        if item not in ids:
            ids.append(item)

    return ids


def is_valid_date(value):
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except ValueError:
        return False


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

ADMIN_CODEWORD = "CPS714Admin"

@app.route("/api/register-admin", methods=["POST"])
def register_admin():
    data = request.get_json(silent=True) or {}

    provided_codeword = str(data.get("codeword", "")).strip()
    firstname = str(data.get("firstname", "")).strip()
    lastname = str(data.get("lastname", "")).strip()
    password = str(data.get("password", ""))

    if provided_codeword != ADMIN_CODEWORD:
        return jsonify({"message": "Invalid admin codeword."}), 403
    
    if not firstname or not lastname or not password:
        return jsonify({"message": "Please fill in all fields."}), 400

    if db.accountExists(lastname, firstname):
        return jsonify({"message": "An account with that name already exists."}), 409

    new_user_id = db.addAccount(lastname, firstname, "Admin", password)

    return jsonify({
        "message": "Admin account created successfully!",
        "user_id": new_user_id
    }), 201

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    user_id = data.get("id")
    password = str(data.get("password", ""))

    if not user_id or not password:
        return jsonify({
            "message": "Please fill in all fields."
        }), 400

    try:
        user_id = int(user_id)
        if user_id <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return jsonify({
            "message": "Invalid User ID."
        }), 400

    account = db.verifyLogin(user_id, password)

    if account is None:
        return jsonify({
            "message": "Invalid User ID or password."
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


@app.route("/api/assignees", methods=["GET"])
@require_permission(PermissionForTasks.MANAGE_TASKS)
def get_assignees():
    people = []

    for account in db.getAssignableAccounts():
        people.append({
            "id": account[0],
            "firstname": account[1],
            "lastname": account[2],
            "role": account[3]
        })

    return jsonify(people)


@app.route("/api/projects/<int:project_id>/tasks", methods=["GET"])
@require_permission(PermissionForTasks.VIEW_PROJECT)
def get_tasks(project_id):
    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found."}), 404

    return jsonify(db.getTasks(project_id))


@app.route("/api/projects/<int:project_id>/tasks", methods=["POST"])
@require_permission(PermissionForTasks.MANAGE_TASKS)
def create_task(project_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        data = {}

    name = str(data.get("name") or "").strip()
    description = str(data.get("description") or "").strip()
    deadline = str(data.get("deadline") or "").strip()
    assignee_ids = parse_id_list(data.get("assignee_ids"))

    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found."}), 404

    if not name:
        return jsonify({"message": "Task name is required."}), 400

    if deadline and not is_valid_date(deadline):
        return jsonify({"message": "Deadline must be a valid date."}), 400

    if assignee_ids is None:
        return jsonify({
            "message": "Assignees must be a list of account IDs."
        }), 400

    assignable = {account[0] for account in db.getAssignableAccounts()}

    if any(account_id not in assignable for account_id in assignee_ids):
        return jsonify({
            "message": "Tasks can only be assigned to workers and supervisors."
        }), 400

    task_id = db.addTask(
        project_id,
        name,
        description,
        deadline or None,
        assignee_ids
    )

    return jsonify(db.getTask(task_id)), 201


@app.route("/api/tasks/<int:task_id>/progress", methods=["PUT"])
@require_permission(PermissionForTasks.MANAGE_TASKS)
def update_task_progress(task_id):
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        data = {}

    progress = parse_progress(data.get("progress"))

    if progress is None:
        return jsonify({
            "message": "Progress must be a whole number from 0 to 100."
        }), 400

    if not db.updateTaskProgress(task_id, progress):
        return jsonify({"message": "Task not found."}), 404

    return jsonify({
        "message": "Progress updated successfully!",
        "progress": progress
    })


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
@require_permission(PermissionForTasks.MANAGE_TASKS)
def update_task(task_id):
    # Only the fields that are sent get changed.
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        data = {}

    fields = {}
    assignee_ids = None

    if "name" in data:
        name = str(data["name"] or "").strip()

        if not name:
            return jsonify({"message": "Task name is required."}), 400

        fields["name"] = name

    if "description" in data:
        fields["description"] = str(data["description"] or "").strip()

    if "deadline" in data:
        deadline = str(data["deadline"] or "").strip()

        if deadline and not is_valid_date(deadline):
            return jsonify({"message": "Deadline must be a valid date."}), 400

        fields["deadline"] = deadline or None

    if "progress" in data:
        progress = parse_progress(data["progress"])

        if progress is None:
            return jsonify({
                "message": "Progress must be a whole number from 0 to 100."
            }), 400

        fields["progress"] = progress

    if "assignee_ids" in data:
        if data["assignee_ids"] is not None:
            assignee_ids = parse_id_list(data["assignee_ids"])

        if assignee_ids is None:
            return jsonify({
                "message": "Assignees must be a list of account IDs."
            }), 400

        assignable = {account[0] for account in db.getAssignableAccounts()}

        if any(account_id not in assignable for account_id in assignee_ids):
            return jsonify({
                "message": "Tasks can only be assigned to workers and supervisors."
            }), 400

    if not fields and assignee_ids is None:
        return jsonify({"message": "Nothing to update."}), 400

    if not db.updateTask(task_id, fields, assignee_ids):
        return jsonify({"message": "Task not found."}), 404

    return jsonify(db.getTask(task_id))


if __name__ == "__main__":
    print(app.url_map)
    app.run(debug=True, port=5000)
