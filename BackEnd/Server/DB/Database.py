import sqlite3

class Database:

    def __init__(self):
        # Initialization
        self.initalize()

    def getConnection(self):
        con = sqlite3.connect("UserData.db")
        return con

    def initalize(self):
        con = self.getConnection()
        query = con.cursor()
        query.execute("CREATE TABLE IF NOT EXISTS " \
        "Account(id INTEGER PRIMARY KEY AUTOINCREMENT," \
        "lastname TEXT NOT NULL, " \
        "firstname TEXT NOT NULL, " \
        "role TEXT NOT NULL CHECK(role IN ('Admin', 'Project Manager', 'Worker', 'Supervisor')))")

        con.commit()

    def addAccount(self, lastname: str, firstname: str, role: str, password: str):
        con = self.getConnection()
        query = con.cursor()

        query.execute("INSERT INTO Account (lastname, firstname, role, password)" \
        "VALUES (?, ?, ?, ?)")

        con.commit()