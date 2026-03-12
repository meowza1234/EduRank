"""
Database module — PostgreSQL when DATABASE_URL is set, otherwise CSV fallback.
"""
import os
import pandas as pd


def get_db_url():
    url = os.environ.get("DATABASE_URL", "")
    # Railway uses postgres:// but SQLAlchemy needs postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def get_engine():
    """Return a SQLAlchemy engine (used for pd.read_sql)."""
    url = get_db_url()
    if not url:
        return None
    from sqlalchemy import create_engine
    return create_engine(url)


def get_connection():
    """Return a raw psycopg2 connection (used for DDL/DML)."""
    url = get_db_url()
    if not url:
        return None
    import psycopg2
    # psycopg2 needs postgresql:// already handled in get_db_url
    return psycopg2.connect(url)


def init_db():
    """Create tables if not exist, then seed from CSV files if tables are empty."""
    conn = get_connection()
    if not conn:
        return  # No DB configured — use CSV fallback

    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            student_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            password TEXT NOT NULL,
            section TEXT DEFAULT 'TBD',
            role TEXT DEFAULT 'student'
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS students (
            student_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            section TEXT DEFAULT 'TBD'
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS courses (
            course_code TEXT PRIMARY KEY,
            course_name TEXT NOT NULL,
            credits INTEGER NOT NULL,
            category TEXT DEFAULT ''
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS enrollments (
            id SERIAL PRIMARY KEY,
            student_id TEXT NOT NULL,
            semester TEXT NOT NULL,
            course_code TEXT NOT NULL,
            grade_letter TEXT NOT NULL,
            grade_point FLOAT NOT NULL,
            UNIQUE(student_id, semester, course_code)
        )
    """)

    conn.commit()
    _seed_from_csv(conn)
    cur.close()
    conn.close()
    print("[db] Database ready.")


def _seed_from_csv(conn):
    """Seed each table from CSV files if the table is empty."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    cur = conn.cursor()

    # --- users ---
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        path = os.path.join(data_dir, "users.csv")
        if os.path.exists(path):
            df = pd.read_csv(path, dtype=str).fillna("")
            for _, r in df.iterrows():
                cur.execute(
                    "INSERT INTO users (student_id, name, password, section, role) "
                    "VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                    (r.get("student_id","").strip(), r.get("name","").strip(),
                     r.get("password","").strip(), r.get("section","TBD").strip(),
                     r.get("role","student").strip()),
                )
            print(f"[db] Seeded users ({len(df)} rows)")

    # --- students ---
    cur.execute("SELECT COUNT(*) FROM students")
    if cur.fetchone()[0] == 0:
        path = os.path.join(data_dir, "students.csv")
        if os.path.exists(path):
            df = pd.read_csv(path, dtype=str).fillna("")
            for _, r in df.iterrows():
                cur.execute(
                    "INSERT INTO students (student_id, name, section) "
                    "VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
                    (r.get("student_id","").strip(), r.get("name","").strip(),
                     r.get("section","TBD").strip()),
                )
            print(f"[db] Seeded students ({len(df)} rows)")

    # --- courses ---
    cur.execute("SELECT COUNT(*) FROM courses")
    if cur.fetchone()[0] == 0:
        path = os.path.join(data_dir, "courses.csv")
        if os.path.exists(path):
            df = pd.read_csv(path, dtype=str).fillna("")
            for _, r in df.iterrows():
                try:
                    credits = int(str(r.get("credits", 3)).strip())
                except ValueError:
                    credits = 3
                cur.execute(
                    "INSERT INTO courses (course_code, course_name, credits, category) "
                    "VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                    (r.get("course_code","").strip(), r.get("course_name","").strip(),
                     credits, r.get("category","").strip()),
                )
            print(f"[db] Seeded courses ({len(df)} rows)")

    # --- enrollments ---
    cur.execute("SELECT COUNT(*) FROM enrollments")
    if cur.fetchone()[0] == 0:
        path = os.path.join(data_dir, "enrollments.csv")
        if os.path.exists(path):
            df = pd.read_csv(path, dtype=str).fillna("")
            for _, r in df.iterrows():
                try:
                    gp = float(str(r.get("grade_point", 0)).strip())
                except ValueError:
                    gp = 0.0
                cur.execute(
                    "INSERT INTO enrollments (student_id, semester, course_code, grade_letter, grade_point) "
                    "VALUES (%s,%s,%s,%s,%s) ON CONFLICT DO NOTHING",
                    (r.get("student_id","").strip(), r.get("semester","").strip(),
                     r.get("course_code","").strip(), r.get("grade_letter","").strip(), gp),
                )
            print(f"[db] Seeded enrollments ({len(df)} rows)")

    conn.commit()
    cur.close()


# ---------------------------------------------------------------------------
# High-level helpers used by app.py and analytics.py
# ---------------------------------------------------------------------------

def load_users_df():
    """Return users table as a pandas DataFrame (DB or CSV fallback)."""
    engine = get_engine()
    if engine:
        with engine.connect() as conn:
            df = pd.read_sql("SELECT student_id, name, password, section, role FROM users", conn)
        df["student_id"] = df["student_id"].str.strip()
        df["password"] = df["password"].str.strip()
        df["role"] = df["role"].fillna("").str.strip().str.lower()
        df["section"] = df["section"].fillna("").str.strip()
        df["name"] = df["name"].fillna("").str.strip()
        return df

    # CSV fallback
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, "data", "users.csv")
    df = pd.read_csv(path, dtype=str)
    df["student_id"] = df["student_id"].str.strip()
    df["password"] = df["password"].str.strip()
    df["role"] = df["role"].fillna("").str.strip().str.lower()
    df["section"] = df["section"].fillna("").str.strip()
    df["name"] = df["name"].fillna("").str.strip()
    return df


def load_core_data_from_db():
    """Return (students_df, courses_df, enrollments_df) from DB, or (None,None,None) if no DB."""
    engine = get_engine()
    if not engine:
        return None, None, None
    with engine.connect() as conn:
        students = pd.read_sql("SELECT student_id, name, section FROM students", conn)
        courses = pd.read_sql("SELECT course_code, course_name, credits, category FROM courses", conn)
        enrollments = pd.read_sql(
            "SELECT student_id, semester, course_code, grade_letter, grade_point FROM enrollments", conn
        )
    return students, courses, enrollments


def register_user(student_id, name, password, section):
    """Insert into users + students tables. Returns True if DB used, False if CSV fallback."""
    conn = get_connection()
    if conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (student_id, name, password, section, role) "
            "VALUES (%s,%s,%s,%s,'student') ON CONFLICT DO NOTHING",
            (student_id, name, password, section),
        )
        cur.execute(
            "INSERT INTO students (student_id, name, section) "
            "VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
            (student_id, name, section),
        )
        conn.commit()
        cur.close()
        conn.close()
        return True
    return False


def upsert_enrollment(student_id, semester, course_code, grade_letter, grade_point):
    """Insert or update an enrollment record. Returns True if DB used."""
    conn = get_connection()
    if conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO enrollments (student_id, semester, course_code, grade_letter, grade_point)
            VALUES (%s,%s,%s,%s,%s)
            ON CONFLICT (student_id, semester, course_code)
            DO UPDATE SET grade_letter = EXCLUDED.grade_letter,
                          grade_point  = EXCLUDED.grade_point
            """,
            (student_id, semester, course_code, grade_letter, grade_point),
        )
        conn.commit()
        cur.close()
        conn.close()
        return True
    return False


def get_courses_list():
    """Return list of course dicts. DB or CSV fallback."""
    engine = get_engine()
    if engine:
        with engine.connect() as conn:
            df = pd.read_sql("SELECT course_code, course_name, CAST(credits AS TEXT) AS credits, category FROM courses", conn)
        return df.fillna("").to_dict(orient="records")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, "data", "courses.csv")
    df = pd.read_csv(path, dtype=str).fillna("")
    return df.to_dict(orient="records")


def get_students_list():
    """Return list of student dicts. DB or CSV fallback."""
    engine = get_engine()
    if engine:
        with engine.connect() as conn:
            df = pd.read_sql("SELECT student_id, name, section FROM students ORDER BY student_id", conn)
        return df.fillna("").to_dict(orient="records")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(base_dir, "data", "students.csv")
    df = pd.read_csv(path, dtype=str).fillna("")
    return df.to_dict(orient="records")
