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