import db as _db
try:
    _db.init_db()
except Exception as _e:
    import traceback
    print(f"[db] init_db() FAILED: {_e}")
    traceback.print_exc()

from app import app

if __name__ == "__main__":
    app.run()
