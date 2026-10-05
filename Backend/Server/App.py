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


if __name__ == "__main__":
    app.run(debug=True, port=5000)