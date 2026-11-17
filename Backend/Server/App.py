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
from decimal import Decimal, InvalidOperation

app = Flask(__name__)
CORS(app)

db = Database()


def require_permission(permission: PermissionForTasks):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            caller_role_str = request.headers.get("X-User-Role")

            if not caller_role_str:
                return jsonify({"message": "Missing user role"}), 401

            try:
                caller_role = Roles(caller_role_str)
            except ValueError:
                return jsonify({"message": "Invalid role"}), 400

            if not hasPermission(caller_role, permission):
                return jsonify({"message": "Access denied"}), 403

            return func(*args, **kwargs)

        return wrapper
    return decorator


TASK_STATUSES = {
    "Not Started",
    "In Progress",
    "On Hold",
    "Completed"
}

TASK_PRIORITIES = {
    "Urgent",
    "High Priority",
    "Standard",
    "Low Priority"
}

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
@require_permission(PermissionForTasks.CREATE_PROJECT)
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
    role = request.headers.get("X-User-Role")
    account_id = request.headers.get("X-User-Id", type=int)

    if role in ("Admin", "Project Manager"):
        projects = db.getProjects()
    else:
        if account_id is None:
            return jsonify({"message": "Missing user ID"}), 401

        projects = db.getProjectsForUser(account_id, role)

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
@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
def delete_project(project_id):
    role = request.headers.get("X-User-Role")

    if role not in ("Admin", "Project Manager"):
        return jsonify({"message": "Access denied"}), 403

    con = db.getConnection()

    try:
        cursor = con.cursor()

        cursor.execute(
            "DELETE FROM Project WHERE id = ?",
            (project_id,)
        )

        if cursor.rowcount == 0:
            return jsonify({"message": "Project not found"}), 404

        con.commit()

        return jsonify({
            "message": "Project deleted successfully!"
        }), 200

    except Exception as error:
        con.rollback()
        return jsonify({"message": str(error)}), 500

    finally:
        con.close()
        
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

@app.route("/api/requests", methods=["GET"])
@require_permission(PermissionForTasks.SEND_REQUEST)
def get_requests():
    project_id = request.args.get("project_id")

    if not project_id:
        return jsonify({"message": "Project ID is required."}), 400

    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found."}), 404

    return jsonify(db.getRequests(project_id))

@app.route("/api/requests/<int:request_id>/status", methods=["PUT"])
@require_permission(PermissionForTasks.MANAGE_REQUESTS)
def update_request_status(request_id):
    data = request.get_json()

    new_status = data.get("new_status")

    if new_status not in ["Approved", "Denied"]:
        return jsonify({"message": "Invalid status."}), 400

    if not db.updateRequestStatus(request_id, new_status):
        return jsonify({"message": "Request not found."}), 404

    return jsonify({"message": "Request status updated successfully!"})

@app.route("/api/requests", methods=["POST"])
@require_permission(PermissionForTasks.SEND_REQUEST)
def add_request():
    data = request.get_json()

    project_id = data.get("project_id")
    description = str(data.get("description") or "").strip()
    date = data.get("request_date")
    requester = data.get("requester_id")

    if not project_id or not description or not date or not requester:
        return jsonify({"message": "Project ID and description are required."}), 400

    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found."}), 404

    request_id = db.addRequest(project_id, requester, date, description)

    if request_id != 0:
        return jsonify({
            "message": "Request added successfully!",
            "request_id": request_id
        }), 201
    else:
        return jsonify({"message": "Request could not be created."}), 409

@app.route("/api/requests/<int:request_id>", methods=["DELETE"])
@require_permission(PermissionForTasks.MANAGE_REQUESTS)
def delete_request(request_id):
    if not db.deleteRequest(request_id):
        return jsonify({"message": "Request not found."}), 404

    return jsonify({"message": "Request deleted successfully!"})

@app.route("/api/projects/<int:project_id>/tasks", methods=["GET"])
@require_permission(PermissionForTasks.VIEW_TASKS)
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
    start_date = str(data.get("start_date") or "").strip()
    status = str(data.get("status") or "Not Started").strip()
    priority = str(data.get("priority") or "Standard").strip()

    if start_date and not is_valid_date(start_date):
        return jsonify({"message": "Invalid start date."}), 400

    if status not in TASK_STATUSES:
        return jsonify({"message": "Invalid task status."}), 400

    if priority not in TASK_PRIORITIES:
        return jsonify({"message": "Invalid task priority."}), 400

    if start_date and deadline and start_date > deadline:
        return jsonify({
            "message": "Start date cannot be after deadline."
        }), 400
    
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
            "message": "Tasks can only be assigned to workers, supervisors, and project managers."
        }), 400



    task_id = db.addTask(
        project_id,
        name,
        description,
        deadline or None,
        assignee_ids,
        start_date or None,
        status,
        priority
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
    if "start_date" in data:
        start_date = str(data["start_date"] or "").strip()

        if start_date and not is_valid_date(start_date):
            return jsonify({"message": "Invalid start date."}), 400

        fields["start_date"] = start_date or None

    if "status" in data:
        status = str(data["status"] or "").strip()

        if status not in TASK_STATUSES:
            return jsonify({"message": "Invalid task status."}), 400

        fields["status"] = status

    if "priority" in data:
        priority = str(data["priority"] or "").strip()

        if priority not in TASK_PRIORITIES:
            return jsonify({"message": "Invalid priority."}), 400

        fields["priority"] = priority
    
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

    #validates the dates
    current_task = db.getTask(task_id)

    if current_task is None:
        return jsonify({"message": "Task not found."}), 404

    final_start = fields.get("start_date", current_task.get("start_date"))
    final_deadline = fields.get("deadline", current_task.get("deadline"))

    if final_start and final_deadline and final_start > final_deadline:
        return jsonify({
            "message": "Start date cannot be after deadline."
        }), 400

    if not fields and assignee_ids is None:
        return jsonify({"message": "Nothing to update."}), 400

    if not db.updateTask(task_id, fields, assignee_ids):
        return jsonify({"message": "Task not found."}), 404

    return jsonify(db.getTask(task_id))


EXPENSE_CATEGORIES = {
    "Labour",
    "Materials",
    "Equipment",
    "Travel",
    "Other"
}


def validate_expense(data):
    if not isinstance(data, dict):
        return None, "Invalid expense data."

    category = str(data.get("category") or "").strip()
    description = str(data.get("description") or "").strip()
    expense_date = str(data.get("expense_date") or "").strip()
    amount = data.get("amount")

    if category not in EXPENSE_CATEGORIES:
        return None, "Please select a valid expense category."

    if not expense_date or not is_valid_date(expense_date):
        return None, "Expense date must be in YYYY-MM-DD format."

    if isinstance(amount, bool) or amount is None:
        return None, "A valid expense amount is required."

    try:
        amount_decimal = Decimal(str(amount))
    except (InvalidOperation, ValueError):
        return None, "Invalid expense amount."

    if not amount_decimal.is_finite() or amount_decimal <= 0:
        return None, "Expense amount must be greater than zero."

    amount_cents_decimal = amount_decimal * 100

    if amount_cents_decimal != amount_cents_decimal.to_integral_value():
        return None, "Expense amount cannot exceed two decimal places."

    return {
        "category": category,
        "description": description,
        "amount_cents": int(amount_cents_decimal),
        "expense_date": expense_date
    }, None

    
# Get all expenses for a project
@app.route("/api/projects/<int:project_id>/expenses", methods=["GET"])
@require_permission(PermissionForTasks.VIEW_COSTS)
def get_project_expenses(project_id):

    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found."}), 404

    expenses = db.getProjectExpenses(project_id)

    return jsonify(expenses), 200


# Add a new expense
@app.route("/api/projects/<int:project_id>/expenses", methods=["POST"])
@require_permission(PermissionForTasks.ADD_EXPENSE)
def create_project_expense(project_id):

    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found."}), 404

    data = request.get_json(silent=True)
    expense, error = validate_expense(data)

    if error:
        return jsonify({"message": error}), 400

    expense_id = db.addProjectExpense(
        project_id,
        expense["category"],
        expense["description"],
        expense["amount_cents"],
        expense["expense_date"]
    )

    return jsonify({
        "message": "Expense added successfully!",
        "id": expense_id
    }), 201


# Edit an existing expense
@app.route(
    "/api/projects/<int:project_id>/expenses/<int:expense_id>",
    methods=["PUT"]
)
@require_permission(PermissionForTasks.EDIT_EXPENSE)
def edit_project_expense(project_id, expense_id):

    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found."}), 404

    data = request.get_json(silent=True)
    expense, error = validate_expense(data)

    if error:
        return jsonify({"message": error}), 400

    updated = db.updateProjectExpense(
        project_id,
        expense_id,
        expense["category"],
        expense["description"],
        expense["amount_cents"],
        expense["expense_date"]
    )

    if not updated:
        return jsonify({"message": "Expense not found."}), 404

    return jsonify({
        "message": "Expense updated successfully!"
    }), 200


# Delete an existing expense
@app.route(
    "/api/projects/<int:project_id>/expenses/<int:expense_id>",
    methods=["DELETE"]
)
@require_permission(PermissionForTasks.DELETE_EXPENSE)
def delete_project_expense(project_id, expense_id):

    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found."}), 404

    deleted = db.deleteProjectExpense(project_id, expense_id)

    if not deleted:
        return jsonify({"message": "Expense not found."}), 404

    return jsonify({
        "message": "Expense deleted successfully!"
    }), 200


# Get the project's financial summary
@app.route("/api/projects/<int:project_id>/costs", methods=["GET"])
@require_permission(PermissionForTasks.VIEW_COST_SUMMARY)
def get_project_costs(project_id):

    overview = db.getProjectCostOverview(project_id)

    if overview is None:
        return jsonify({"message": "Project not found."}), 404

    return jsonify(overview), 200


# Set or update the project's total budget
@app.route("/api/projects/<int:project_id>/budget", methods=["PUT"])
@require_permission(PermissionForTasks.MANAGE_BUDGET)
def update_project_budget(project_id):

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"message": "Invalid request data."}), 400

    budget = data.get("budget")

    if isinstance(budget, bool) or budget is None:
        return jsonify({"message": "A valid budget is required."}), 400

    try:
        budget_decimal = Decimal(str(budget))
    except (InvalidOperation, ValueError):
        return jsonify({"message": "Invalid budget amount."}), 400

    if not budget_decimal.is_finite() or budget_decimal < 0:
        return jsonify({
            "message": "Budget must be zero or greater."
        }), 400

    budget_cents_decimal = budget_decimal * 100

    if budget_cents_decimal != budget_cents_decimal.to_integral_value():
        return jsonify({
            "message": "Budget cannot exceed two decimal places."
        }), 400

    budget_cents = int(budget_cents_decimal)

    updated = db.updateProjectBudget(project_id, budget_cents)

    if not updated:
        return jsonify({"message": "Project not found."}), 404

    return jsonify({
        "message": "Project budget updated successfully!",
        "budget_cents": budget_cents
    }), 200

    
@app.route("/api/projects/<int:project_id>/planned-costs", methods=["GET"])
@require_permission(PermissionForTasks.VIEW_COST_SUMMARY)
def get_planned_costs(project_id):
    con = db.getConnection()

    try:
        project = con.execute(
            "SELECT 1 FROM Project WHERE id = ?",
            (project_id,)
        ).fetchone()
    finally:
        con.close()

    if project is None:
        return jsonify({"message": "Project not found."}), 404

    return jsonify(db.getPlannedCosts(project_id)), 200


@app.route("/api/projects/<int:project_id>/planned-costs", methods=["PUT"])
@require_permission(PermissionForTasks.MANAGE_BUDGET)
def update_planned_costs(project_id):
    from decimal import Decimal, InvalidOperation

    categories = {
        "Labour", "Materials", "Equipment", "Travel", "Other"
    }

    data = request.get_json(silent=True)

    if not isinstance(data, dict) or set(data) != categories:
        return jsonify({
            "message": "Provide all five planned-cost categories."
        }), 400

    costs = {}

    try:
        for category, raw in data.items():
            if isinstance(raw, bool) or not isinstance(
                raw, (str, int, float)
            ):
                raise ValueError

            value = Decimal(str(raw))
            cents = value * 100

            if (
                not value.is_finite()
                or value < 0
                or cents != cents.to_integral_value()
                or cents > 9_000_000_000_000_000
            ):
                raise ValueError

            costs[category] = int(cents)

    except (ValueError, InvalidOperation):
        return jsonify({
            "message": "Enter nonnegative amounts with at most two decimal places."
        }), 400

    if not db.savePlannedCosts(project_id, costs):
        return jsonify({"message": "Project not found."}), 404

    return jsonify(db.getPlannedCosts(project_id)), 200

# View members of a project
@app.route("/api/projects/<int:project_id>/members", methods=["GET"])
@require_permission(PermissionForTasks.VIEW_MEMBERS)
def get_project_members(project_id):

    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found"}), 404

    members = db.getProjectMembers(project_id)
    return jsonify(members)


# Get accounts available to add to projects
@app.route("/api/member-candidates", methods=["GET"])
@require_permission(PermissionForTasks.MANAGE_MEMBERS)
def get_member_candidates():

    accounts = db.getAccounts()

    return jsonify([
        {
            "id": account[0],
            "firstname": account[1],
            "lastname": account[2],
            "role": account[3]
        }
        for account in accounts
    ])


# Add a member to a project
@app.route("/api/projects/<int:project_id>/members", methods=["POST"])
@require_permission(PermissionForTasks.MANAGE_MEMBERS)
def add_project_member(project_id):

    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found"}), 404

    data = request.get_json(silent=True) or {}

    try:
        account_id = int(data["account_id"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"message": "Invalid account ID"}), 400

    valid_accounts = {
        account[0] for account in db.getAccounts()
    }

    if account_id not in valid_accounts:
        return jsonify({"message": "Account not found"}), 404

    db.addProjectMember(project_id, account_id)

    return jsonify({
        "message": "Member added successfully"
    }), 201


# Remove a member from a project
@app.route(
    "/api/projects/<int:project_id>/members/<int:account_id>",
    methods=["DELETE"]
)
@require_permission(PermissionForTasks.MANAGE_MEMBERS)
def remove_project_member(project_id, account_id):

    if not db.projectExists(project_id):
        return jsonify({"message": "Project not found"}), 404

    db.removeProjectMember(project_id, account_id)

    return jsonify({
        "message": "Member removed successfully"
    })

@app.route("/api/tasks/<int:task_id>/status", methods=["PUT"])
@require_permission(PermissionForTasks.UPDATE_STATUS)
def update_task_status(task_id):

    task = db.getTask(task_id)

    if task is None:
        return jsonify({"message": "Task not found"}), 404

    role = request.headers.get("X-User-Role")
    user_id = request.headers.get("X-User-Id", type=int)

    if role not in ("Admin", "Project Manager"):
        if user_id is None:
            return jsonify({"message": "Missing user ID"}), 401

        if not db.isProjectMember(task["project_id"], user_id):
            return jsonify({"message": "Project access denied"}), 403

    if role == "Worker":
        assigned_worker_ids = {
            worker["id"] for worker in task["workers"]
        }

        if user_id not in assigned_worker_ids:
            return jsonify({
                "message": "You can only update your assigned tasks"
            }), 403

    data = request.get_json(silent=True) or {}
    status = data.get("status")

    if status not in TASK_STATUSES:
        return jsonify({"message": "Invalid task status"}), 400

    db.updateTask(task_id, {"status": status})

    return jsonify(db.getTask(task_id))

if __name__ == "__main__":
    print(app.url_map)
    app.run(debug=True, port=5000)
