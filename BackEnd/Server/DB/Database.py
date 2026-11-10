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

        query.execute("""
            CREATE TABLE IF NOT EXISTS ProjectExpense (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                description TEXT,
                amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
                expense_date TEXT NOT NULL,
                FOREIGN KEY (project_id)
                    REFERENCES Project(id) ON DELETE CASCADE
            )
        """)

        query.execute("PRAGMA table_info(Project)")
        columns = [column[1] for column in query.fetchall()]

        if "budget_cents" not in columns:
            query.execute("""
                ALTER TABLE Project
                ADD COLUMN budget_cents INTEGER NOT NULL DEFAULT 0
            """)

        query.execute("""
            CREATE TABLE IF NOT EXISTS PlannedCost (
                project_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                amount_cents INTEGER NOT NULL DEFAULT 0
                    CHECK(amount_cents >= 0),
                PRIMARY KEY (project_id, category),
                FOREIGN KEY (project_id)
                    REFERENCES Project(id) ON DELETE CASCADE
            )
        """)
        # Add new fields to existing Task table without deleting data.
        query.execute("PRAGMA table_info(Task)")
        columns = {row[1] for row in query.fetchall()}

        if "start_date" not in columns:
            query.execute("ALTER TABLE Task ADD COLUMN start_date TEXT")

        if "status" not in columns:
            query.execute(
                "ALTER TABLE Task ADD COLUMN status TEXT NOT NULL DEFAULT 'Not Started'"
            )

        # Preserve the meaning of existing progress values.
        query.execute("""
            UPDATE Task
            SET status = CASE
                WHEN progress >= 100 THEN 'Completed'
                WHEN progress > 0 THEN 'In Progress'
                ELSE 'Not Started'
            END
            WHERE status = 'Not Started'
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

    def addTask(self, project_id, name, description, deadline, assignee_ids, start_date=None, status="Not Started"):
        con = self.getConnection()

        try:
            query = con.cursor()

            query.execute(
                """
                INSERT INTO Task (project_id, name, description, deadline, start_date, status   )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (project_id, name, description, deadline, start_date, status)
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
            SELECT id, project_id, name, description, deadline, progress, start_date, status
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
                "supervisors": [],
                "start_date": row[6] or "",
                "status": row[7] or "Not Started"
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
        description, deadline, progress, start_date, status). If `assignee_ids` is given, it
        replaces the task's assignees. Everything is saved together or not at
        all. Returns False if the task doesn't exist."""
        con = self.getConnection()

        try:
            query = con.cursor()

            query.execute("""
                SELECT name, description, deadline, progress, start_date, status
                FROM Task
                WHERE id = ?
            """, (task_id,))

            current = query.fetchone()

            if current is None:
                return False

            query.execute("""
                UPDATE Task
                SET name = ?, description = ?, deadline = ?, progress = ?, start_date = ?, status = ?
                WHERE id = ?
            """, (
                fields.get("name", current[0]),
                fields.get("description", current[1]),
                fields.get("deadline", current[2]),
                fields.get("progress", current[3]),
                fields.get("start_date", current[4]),
                fields.get("status", current[5]),
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
    def getProjectExpenses(self, project_id):
        con = self.getConnection()
        query = con.cursor()

        query.execute("""
            SELECT id, project_id, category, description,
                amount_cents, expense_date
            FROM ProjectExpense
            WHERE project_id = ?
            ORDER BY expense_date DESC, id DESC
        """, (project_id,))

        rows = query.fetchall()
        con.close()

        return [
            {
                "id": row[0],
                "project_id": row[1],
                "category": row[2],
                "description": row[3],
                "amount_cents": row[4],
                "expense_date": row[5]
            }
            for row in rows
        ]
    def addProjectExpense(self, project_id, category, description, amount_cents, expense_date):
        con = self.getConnection()

        try:
            query = con.cursor()

            query.execute("""
                INSERT INTO ProjectExpense
                (project_id, category, description, amount_cents, expense_date)
                VALUES (?, ?, ?, ?, ?)
            """, (
                project_id, category, description,
                amount_cents, expense_date
            ))

            con.commit()
            return query.lastrowid

        finally:
            con.close()

    def updateProjectExpense(self, project_id, expense_id, category, description, amount_cents, expense_date):
        con = self.getConnection()

        try:
            query = con.cursor()

            query.execute("""
                UPDATE ProjectExpense
                SET category = ?,
                    description = ?,
                    amount_cents = ?,
                    expense_date = ?
                WHERE id = ? AND project_id = ?
            """, (
                category, description, amount_cents,
                expense_date, expense_id, project_id
            ))

            con.commit()
            return query.rowcount > 0

        finally:
            con.close()
    def deleteProjectExpense(self, project_id, expense_id):
        con = self.getConnection()

        try:
            query = con.cursor()

            query.execute("""
                DELETE FROM ProjectExpense
                WHERE id = ? AND project_id = ?
            """, (expense_id, project_id))

            con.commit()
            return query.rowcount > 0

        finally:
            con.close()

    
    def updateProjectBudget(self, project_id, budget_cents):
        con = self.getConnection()

        try:
            query = con.cursor()

            query.execute("""
                UPDATE Project
                SET budget_cents = ?
                WHERE id = ?
            """, (budget_cents, project_id))

            con.commit()
            return query.rowcount > 0

        finally:
            con.close()
    
    def getProjectCostOverview(self, project_id):
        con = self.getConnection()

        try:
            query = con.cursor()

            # Get the project's total budget
            query.execute("""
                SELECT budget_cents
                FROM Project
                WHERE id = ?
            """, (project_id,))

            project = query.fetchone()

            if project is None:
                return None

            budget_cents = project[0]

            # Calculate total expenses
            query.execute("""
                SELECT COALESCE(SUM(amount_cents), 0)
                FROM ProjectExpense
                WHERE project_id = ?
            """, (project_id,))

            spent_cents = query.fetchone()[0]

            remaining_cents = budget_cents - spent_cents

            # Calculate budget utilization
            utilization_percent = (
                round(spent_cents / budget_cents * 100, 2)
                if budget_cents > 0
                else 0
            )

            # Calculate spending by category
            query.execute("""
                SELECT category, SUM(amount_cents)
                FROM ProjectExpense
                WHERE project_id = ?
                GROUP BY category
            """, (project_id,))

            category_totals = {
                row[0]: row[1]
                for row in query.fetchall()
            }

            return {
                "project_id": project_id,
                "budget_cents": budget_cents,
                "spent_cents": spent_cents,
                "remaining_cents": remaining_cents,
                "utilization_percent": utilization_percent,
                "category_totals": category_totals
            }

        finally:
            con.close()

    def getPlannedCosts(self, project_id):
        con = self.getConnection()
        try:
            rows = con.execute("""
                SELECT category, amount_cents
                FROM PlannedCost
                WHERE project_id = ?
            """, (project_id,)).fetchall()

            return dict(rows)
        finally:
            con.close()


    def savePlannedCosts(self, project_id, costs):
        con = self.getConnection()
        try:
            with con:
                project = con.execute(
                    "SELECT 1 FROM Project WHERE id = ?",
                    (project_id,)
                ).fetchone()

                if project is None:
                    return False

                for category, amount in costs.items():
                    con.execute("""
                        INSERT INTO PlannedCost
                            (project_id, category, amount_cents)
                        VALUES (?, ?, ?)
                        ON CONFLICT(project_id, category)
                        DO UPDATE SET
                            amount_cents = excluded.amount_cents
                    """, (project_id, category, amount))

            return True
        finally:
            con.close()
