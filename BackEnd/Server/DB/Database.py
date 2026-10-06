import sqlite3
import os

class Database:

    def __init__(self):
        self.initialize()

    def getConnection(self):
        db_path = os.path.join(os.path.dirname(__file__), "UserData.db")
        return sqlite3.connect(db_path)

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

    def verifyLogin(self, lastname, firstname, password):
        con = self.getConnection()
        query = con.cursor()

        query.execute("""
            SELECT id, firstname, lastname, role, password
            FROM Account
            WHERE lastname = ? COLLATE NOCASE
              AND firstname = ? COLLATE NOCASE
        """, (lastname, firstname))

        rows = query.fetchall()
        con.close()

        for row in rows:
            if row[4] == password:
                return {
                    "id": row[0],
                    "firstname": row[1],
                    "lastname": row[2],
                    "role": row[3]
                }

        return None
