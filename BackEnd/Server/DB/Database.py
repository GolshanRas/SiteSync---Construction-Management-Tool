import sqlite3
import os

class Database:

    def __init__(self):
        self.initialize()

    def getConnection(self):
        db_path = os.path.join(os.path.dirname(__file__), "UserData.db")
        con = sqlite3.connect(db_path)
        con.execute("PRAGMA foreign_keys = ON")
        return con

    def initialize(self):
        con = self.getConnection()
        query = con.cursor()

        query.execute("""
            CREATE TABLE IF NOT EXISTS Account (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lastname TEXT NOT NULL,
                firstname TEXT NOT NULL,
                role TEXT NOT NULL CHECK(
                    role IN ('Admin', 'Project Manager', 'Worker', 'Supervisor')
                ),
                password TEXT NOT NULL
            )
        """)

        query.execute("""
            CREATE TABLE IF NOT EXISTS Project (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                location TEXT,
                start_date TEXT,
                end_date TEXT,
                status TEXT NOT NULL DEFAULT 'Active'
            )
        """)

        con.commit()
        con.close()

    def addAccount(self, lastname: str, firstname: str, role: str, password: str):
        con = self.getConnection()
        query = con.cursor()

        query.execute(
            """
            INSERT INTO Account (lastname, firstname, role, password)
            VALUES (?, ?, ?, ?)
            """,
            (lastname, firstname, role, password)
        )

        con.commit()
        con.close()


    def addProject(self, name, description, location, start_date, end_date):
        con = self.getConnection()
        query = con.cursor()

        query.execute(
            """
            INSERT INTO Project
            (name, description, location, start_date, end_date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, description, location, start_date, end_date)
        )

        con.commit()
        con.close()

    def getProjects(self):
        con = self.getConnection()
        query = con.cursor()

        query.execute("SELECT * FROM Project")

        projects = query.fetchall()

        con.close()

        return projects

    def getAccounts(self):
        con = self.getConnection()
        query = con.cursor()

        query.execute("""
            SELECT id, firstname, lastname, role
            FROM Account
        """)

        accounts = query.fetchall()
        con.close()

        return accounts


    def updateRole(self, account_id, role):
        con = self.getConnection()
        query = con.cursor()

        query.execute("""
            UPDATE Account
            SET role = ?
            WHERE id = ?
        """, (role, account_id))

        con.commit()
        con.close()


    def accountExists(self, lastname, firstname):
        con = self.getConnection()
        query = con.cursor()

        query.execute("""
            SELECT 1
            FROM Account
            WHERE lastname = ? COLLATE NOCASE
              AND firstname = ? COLLATE NOCASE
            LIMIT 1
        """, (lastname, firstname))

        exists = query.fetchone() is not None
        con.close()

        return exists

    def verifyLogin(self, user_id, password):
        con = self.getConnection()
        query = con.cursor()

        query.execute("""
            SELECT id, firstname, lastname, role, password
            FROM Account
            WHERE id = ?
        """, (user_id,))

        row = query.fetchone()
        con.close()

        if row is not None and row[4] == password:
            return {
                "id": row[0],
                "firstname": row[1],
                "lastname": row[2],
                "role": row[3]
            }

        return None


    def projectExists(self, project_id):
        con = self.getConnection()
        query = con.cursor()

        query.execute("SELECT 1 FROM Project WHERE id = ?", (project_id,))

        exists = query.fetchone() is not None
        con.close()

        return exists

    def getAssignableAccounts(self):
        # Tasks can be assigned to workers and supervisors only.
        con = self.getConnection()
        query = con.cursor()

        query.execute("""
            SELECT id, firstname, lastname, role
            FROM Account
            WHERE role IN ('Worker', 'Supervisor')
            ORDER BY lastname COLLATE NOCASE, firstname COLLATE NOCASE
        """)

        accounts = query.fetchall()
        con.close()

        return accounts

    def addTask(self, project_id, name, description, deadline, assignee_ids):
        con = self.getConnection()

        try:
            query = con.cursor()

            query.execute(
                """
                INSERT INTO Task (project_id, name, description, deadline)
                VALUES (?, ?, ?, ?)
                """,
                (project_id, name, description, deadline)
            )

            task_id = query.lastrowid

            query.executemany(
                "INSERT INTO TaskAssignment (task_id, account_id) VALUES (?, ?)",
                [(task_id, account_id) for account_id in assignee_ids]
            )

            # Either the task and all of its assignments are saved, or none are.
            con.commit()

            return task_id
        finally:
            con.close()

    def getTasks(self, project_id):
        con = self.getConnection()
        query = con.cursor()

        query.execute("""
            SELECT id, project_id, name, description, deadline, progress
            FROM Task
            WHERE project_id = ?
            ORDER BY id
        """, (project_id,))

        task_rows = query.fetchall()

        query.execute("""
            SELECT ta.task_id, a.id, a.firstname, a.lastname, a.role
            FROM TaskAssignment ta
            JOIN Account a ON a.id = ta.account_id
            JOIN Task t ON t.id = ta.task_id
            WHERE t.project_id = ?
            ORDER BY a.lastname COLLATE NOCASE, a.firstname COLLATE NOCASE
        """, (project_id,))

        assignment_rows = query.fetchall()
        con.close()

        tasks = {}

        for row in task_rows:
            tasks[row[0]] = {
                "id": row[0],
                "project_id": row[1],
                "name": row[2],
                "description": row[3] or "",
                "deadline": row[4] or "",
                "progress": row[5],
                "workers": [],
                "supervisors": []
            }

        for task_id, account_id, firstname, lastname, role in assignment_rows:
            person = {
                "id": account_id,
                "firstname": firstname,
                "lastname": lastname
            }

            if role == "Supervisor":
                tasks[task_id]["supervisors"].append(person)
            else:
                tasks[task_id]["workers"].append(person)

        return list(tasks.values())

    def getTask(self, task_id):
        con = self.getConnection()
        query = con.cursor()

        query.execute("SELECT project_id FROM Task WHERE id = ?", (task_id,))

        row = query.fetchone()
        con.close()

        if row is None:
            return None

        for task in self.getTasks(row[0]):
            if task["id"] == task_id:
                return task

        return None

    def updateTaskProgress(self, task_id, progress):
        con = self.getConnection()
        query = con.cursor()

        query.execute(
            "UPDATE Task SET progress = ? WHERE id = ?",
            (progress, task_id)
        )

        updated = query.rowcount > 0

        con.commit()
        con.close()

        return updated

    def updateTask(self, task_id, fields, assignee_ids=None):
        """Edit a task. `fields` holds only the values to change (name,
        description, deadline, progress). If `assignee_ids` is given, it
        replaces the task's assignees. Everything is saved together or not at
        all. Returns False if the task doesn't exist."""
        con = self.getConnection()

        try:
            query = con.cursor()

            query.execute("""
                SELECT name, description, deadline, progress
                FROM Task
                WHERE id = ?
            """, (task_id,))

            current = query.fetchone()

            if current is None:
                return False

            query.execute("""
                UPDATE Task
                SET name = ?, description = ?, deadline = ?, progress = ?
                WHERE id = ?
            """, (
                fields.get("name", current[0]),
                fields.get("description", current[1]),
                fields.get("deadline", current[2]),
                fields.get("progress", current[3]),
                task_id
            ))

            if assignee_ids is not None:
                query.execute(
                    "DELETE FROM TaskAssignment WHERE task_id = ?",
                    (task_id,)
                )

                query.executemany(
                    "INSERT INTO TaskAssignment (task_id, account_id) VALUES (?, ?)",
                    [(task_id, account_id) for account_id in assignee_ids]
                )

            con.commit()

            return True
        finally:
            con.close()
