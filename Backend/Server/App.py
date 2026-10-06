from flask import Flask, jsonify, request
from flask_cors import CORS
from DB.Database import Database

app = Flask(__name__)
CORS(app)

db = Database()


@app.route("/api/test")
def test():
    return jsonify({"message": "Backend is working!"})


@app.route("/api/accounts", methods=["POST"])
def add_account():

    data = request.get_json()

    db.addAccount(
        data["lastname"],
        data["firstname"],
        data["role"],
        data["password"]
    )

    return jsonify({"message": "Account created!"})

@app.route("/api/projects", methods=["POST"])
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