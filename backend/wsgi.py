import db as _db
_db.init_db()

from app import app

if __name__ == "__main__":
    app.run()
