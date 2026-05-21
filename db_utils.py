import sqlite3
from pathlib import Path
import csv
from typing import List
from .models import University

BASE = Path(__file__).parent.parent
DB_PATH = BASE / 'data' / 'universities.db'
CSV_PATH = BASE / 'data' / 'universities.csv'

def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def ensure_db_and_load_csv():
    # Always delete and recreate the database to ensure fresh data from CSV
    if DB_PATH.exists():
        DB_PATH.unlink()  # Delete the existing database file
    
    conn = connect()
    c = conn.cursor()
    c.execute("""
    CREATE TABLE universities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        country TEXT,
        min_score_ib REAL,
        min_score_ossd REAL,
        tuition REAL,
        admission_rate REAL,
        majors TEXT,
        source_url TEXT
    )
    """)
    conn.commit()
    
    # Load data from CSV
    if CSV_PATH.exists():
        with open(CSV_PATH, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = []
            for r in reader:
                # Skip header row if it appears again in data
                if r.get('name') == 'name':
                    continue
                try:
                    rows.append((
                        r.get('name'),
                        r.get('country'),
                        float(r['min_score_ib']) if r.get('min_score_ib') and r.get('min_score_ib') != '' else None,
                        float(r['min_score_ossd']) if r.get('min_score_ossd') and r.get('min_score_ossd') != '' else None,
                        float(r['tuition']) if r.get('tuition') and r.get('tuition') != '' else None,
                        float(r['admission_rate']) if r.get('admission_rate') and r.get('admission_rate') != '' else None,
                        r.get('majors'),
                        r.get('source_url')
                    ))
                except (ValueError, TypeError) as e:
                    print(f"Warning: Skipping row due to error: {r}, Error: {e}")
                    continue
        c.executemany("""INSERT INTO universities (name,country,min_score_ib,min_score_ossd,tuition,admission_rate,majors,source_url) VALUES (?,?,?,?,?,?,?,?)""", rows)
        conn.commit()
    conn.close()

def get_all_universities() -> List[University]:
    conn = connect()
    c = conn.cursor()
    c.execute("SELECT * FROM universities")
    rows = c.fetchall()
    conn.close()
    return [University.from_db_row(row) for row in rows]

def insert_university(data):
    conn = connect(); c = conn.cursor()
    c.execute("""INSERT INTO universities (name,country,min_score_ib,min_score_ossd,tuition,admission_rate,majors,source_url) VALUES (?,?,?,?,?,?,?,?)""",
              (data.get('name'), data.get('country'), data.get('min_score_ib'), data.get('min_score_ossd'),
               data.get('tuition'), data.get('admission_rate'), data.get('majors'), data.get('source_url')))
    conn.commit()
    nid = c.lastrowid
    conn.close()
    return nid

def update_university(uid, data):
    conn = connect(); c = conn.cursor()
    c.execute("""UPDATE universities SET name=?,country=?,min_score_ib=?,min_score_ossd=?,tuition=?,admission_rate=?,majors=?,source_url=? WHERE id=?""",
              (data.get('name'), data.get('country'), data.get('min_score_ib'), data.get('min_score_ossd'),
               data.get('tuition'), data.get('admission_rate'), data.get('majors'), data.get('source_url'), uid))
    conn.commit()
    ok = c.rowcount > 0
    conn.close()
    return ok

def delete_university(uid):
    conn = connect(); c = conn.cursor()
    c.execute("DELETE FROM universities WHERE id=?", (uid,))
    conn.commit()
    ok = c.rowcount > 0
    conn.close()
    return ok
