
import csv
import sqlite3
from pathlib import Path

# CSV files are in Downloads
csv_folder = Path(r"C:\Users\golsh\Downloads")

# Database stays in your SiteSync DB folder
db_folder = Path(__file__).resolve().parent
db_path = db_folder / "UserData.db"

tables = [
    "Account",
    "Project",
    "Task",
    "TaskAssignment",
    "ProjectExpense",
    "PlannedCost",
]

# Check all CSV files before changing the database
for table in tables:
    csv_path = csv_folder / f"{table}.csv"
    if not csv_path.is_file():
        raise FileNotFoundError(f"Missing CSV: {csv_path}")

conn = sqlite3.connect(db_path)

try:
    conn.execute("PRAGMA foreign_keys = ON")

    # Back up existing database
    backup_path = db_folder / "UserData_backup.db"

    with sqlite3.connect(backup_path) as backup:
        conn.backup(backup)

    conn.execute("BEGIN")

    for table in tables:
        csv_path = csv_folder / f"{table}.csv"

        with open(csv_path, newline="", encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)
            columns = reader.fieldnames
            rows = list(reader)

        if not columns:
            raise ValueError(f"No columns found in {csv_path}")

        column_sql = ", ".join(f'"{col}"' for col in columns)
        placeholders = ", ".join("?" for _ in columns)

        # Find primary key columns
        pk_info = conn.execute(
            f'PRAGMA table_info("{table}")'
        ).fetchall()

        pk_columns = [
            col[1]
            for col in sorted(pk_info, key=lambda x: x[5])
            if col[5] > 0
        ]

        if not pk_columns:
            raise ValueError(f"No primary key found for {table}")

        conflict_sql = ", ".join(
            f'"{col}"' for col in pk_columns
        )

        update_columns = [
            col for col in columns if col not in pk_columns
        ]

        if update_columns:
            update_sql = ", ".join(
                f'"{col}" = excluded."{col}"'
                for col in update_columns
            )
            action = f"DO UPDATE SET {update_sql}"
        else:
            action = "DO NOTHING"

        sql = (
            f'INSERT INTO "{table}" ({column_sql}) '
            f'VALUES ({placeholders}) '
            f'ON CONFLICT ({conflict_sql}) {action}'
        )

        for row in rows:
            values = [
                None if row[col] == "" else row[col]
                for col in columns
            ]
            conn.execute(sql, values)

        print(f"{table}: processed {len(rows)} records")

    # Check database relationships
    errors = conn.execute("PRAGMA foreign_key_check").fetchall()

    if errors:
        raise ValueError(f"Foreign key errors: {errors}")

    conn.commit()
    print("Import completed successfully!")

except Exception:
    conn.rollback()
    print("Import failed. Changes rolled back.")
    raise

finally:
    conn.close()
