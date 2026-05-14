from flask import Flask, request, jsonify, send_from_directory, session, render_template
from flask_session import Session
import os
import sqlite3
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FRONTEND_FOLDER = os.path.join(BASE_DIR, '..', 'frontend')

app = Flask(
    __name__,
    static_folder=FRONTEND_FOLDER,
    static_url_path=''
)

# ======================================================
# AUTHORIZATION DECORATOR
# ======================================================

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Not authenticated'}), 401
        return f(*args, **kwargs)
    return wrapper

from functools import wraps
from flask import session, jsonify

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Must be logged in
        if not session.get("user_id"):
            return jsonify({"error": "Authentication required"}), 401

        # Must be admin
        if not session.get("is_admin"):
            return jsonify({"error": "Admin access required"}), 403

        return f(*args, **kwargs)
    return decorated_function


# ======================================================
# FLASK APP SETUP
# ======================================================

app = Flask(__name__, static_folder='../frontend', static_url_path='')

@app.route("/")
def index():
    return app.send_static_file("index.html")

app.secret_key = 'clédesChamps_1000'

# ------------------------------------------------------
# SESSION CONFIGURATION (must be BEFORE Session(app))
# ------------------------------------------------------
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_FILE_DIR"] = os.path.join(BASE_DIR, "flask_session")
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False

Session(app)
CORS(app)

DB_PATH = os.path.join(BASE_DIR, "bowler.db")

@app.route('/')
def serve_index():
    return send_from_directory('../frontend', 'index.html')

def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db

# ======================================================
# LOGIN
# ======================================================

@app.post("/login")
def login():
    data = request.get_json()

    name = data.get("name", "").strip()
    password = data.get("password", "")

    if not name or not password:
        return jsonify({"success": False, "error": "Missing name or password"})

    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT * FROM Players WHERE player_name = ?", (name,))
    player = cur.fetchone()

    if not player:
        db.close()
        return jsonify({"success": False, "error": "Invalid name or password"})

    if not check_password_hash(player["password_hash"], password):
        db.close()
        return jsonify({"success": False, "error": "Invalid name or password"})

    # Ensure session is saved ---
    session["user_id"] = player["player_id"]
    session["is_admin"] = bool(player["is_admin"])
    session.permanent = False
    session.modified = True

    db.close()
    return jsonify({"success": True})

@app.get("/logout")
def logout():
    session.clear()
    return send_from_directory('../frontend', 'login.html')

@app.route("/me")
@login_required
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    db = get_db()
    player = db.execute(
        """
        SELECT player_id, player_name, active, is_admin
        FROM Players
        WHERE player_id = ?
        """,
        (user_id,)
    ).fetchone()

    if not player:
        return jsonify({"error": "User not found"}), 401

    return jsonify({
        "player_id": player["player_id"],
        "player_name": player["player_name"],
        "active": player["active"],
        "is_admin": player["is_admin"]
    })

# ======================================================
# API DIAGNOSTIC ROUTES
# ======================================================

@app.get("/api/ping")
def api_ping():
    return jsonify({"status": "ok"})

@app.get("/api/whoami")
@login_required
def api_whoami():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"user_id": None}), 200

    db = get_db()
    player = db.execute(
        """
        SELECT player_id, player_name, active, is_admin
        FROM Players
        WHERE player_id = ?
        """,
        (user_id,)
    ).fetchone()
    db.close()

    if not player:
        return jsonify({"user_id": None}), 200

    return jsonify({
        "player_id": player["player_id"],
        "player_name": player["player_name"],
        "active": player["active"],
        "is_admin": player["is_admin"],
    })

@app.route("/nav")
def nav():
    return render_template("nav.html")

# ======================================================
# REGISTER
# ======================================================

@app.post("/register")
def register():
    data = request.get_json()

    name = data.get("name", "").strip()
    email = data.get("email", None)
    password = data.get("password", "")

    if not name or not password:
        return jsonify({"success": False, "error": "Name and password are required."})

    db = get_db()
    cur = db.cursor()

    # Check name uniqueness
    cur.execute("SELECT * FROM Players WHERE player_name = ?", (name,))
    if cur.fetchone():
        db.close()
        return jsonify({"success": False, "error": "Name already taken."})

    # Check email uniqueness only if provided
    if email:
        cur.execute("SELECT * FROM Players WHERE email = ?", (email,))
        if cur.fetchone():
            db.close()
            return jsonify({"success": False, "error": "Email already registered."})

    password_hash = generate_password_hash(password)

    cur.execute(
        "INSERT INTO Players (player_name, email, password_hash) VALUES (?, ?, ?)",
        (name, email, password_hash)
    )

    db.commit()
    db.close()

    return jsonify({"success": True})

# ======================================================
# PLAYERS
# ======================================================

@app.get("/players")
@login_required
def get_players():
    db = get_db()
    rows = db.execute(
        "SELECT player_id, player_name, active FROM Players ORDER BY player_name"
    ).fetchall()

    return jsonify([dict(r) for r in rows])

@app.post("/players")
@login_required
def create_player():
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Name is required"}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute("INSERT INTO Players (player_name) VALUES (?)", (name,))
    db.commit()
    new_id = cur.lastrowid
    db.close()

    return jsonify({"player_id": new_id, "player_name": name}), 201

@app.get("/players/<int:player_id>/games")
def get_games(player_id):
    db = get_db()
    rows = db.execute(
        """
        SELECT game_id, player_id, date, score, category, boule_id, lieu_id, game_number
        FROM Games
        WHERE player_id = ?
        ORDER BY game_id ASC
        """,
        (player_id,)
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.get("/players/<int:player_id>/boules")
def get_boules_for_player(player_id):
    db = get_db()
    rows = db.execute(
        """
        SELECT boule_id, boule_name
        FROM Boules
        WHERE player_id = ?
        ORDER BY boule_name
        """,
        (player_id,)
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

# ======================================================
# SESSION API
# ======================================================

@app.post("/session/start")
@login_required
def start_session():
    db = get_db()
    row = db.execute("SELECT COALESCE(MAX(session_id), 0) + 1 AS new_id FROM Games").fetchone()
    session_id = row["new_id"]
    db.close()
    return jsonify({"session_id": session_id})

@app.post("/session/score")
@login_required
def save_score():
    data = request.get_json()

    session_id = data["session_id"]
    player_id = data["player_id"]
    game_number = data["game_number"]
    score = data["score"]
    category = data.get("category")
    location_id = data.get("location_id")
    date = data.get("date")
    ball_id = data.get("ball_id")

    db = get_db()
    cur = db.cursor()

    cur.execute(
        """
        SELECT game_id FROM Games
        WHERE session_id = ? AND player_id = ? AND game_number = ?
        """,
        (session_id, player_id, game_number)
    )
    row = cur.fetchone()

    if row:
        cur.execute(
            """
            UPDATE Games
            SET score = ?, category = ?, lieu_id = ?, boule_id = ?, date = ?
            WHERE game_id = ?
            """,
            (score, category, location_id, ball_id, date, row["game_id"])
        )
    else:
        cur.execute(
            """
            INSERT INTO Games (session_id, player_id, game_number, score, category, lieu_id, boule_id, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, player_id, game_number, score, category, location_id, ball_id, date)
        )

    db.commit()
    db.close()
    return jsonify({"status": "ok"})

@app.post("/session/ball")
@login_required
def save_ball():
    data = request.get_json()

    session_id = data["session_id"]
    player_id = data["player_id"]
    ball_id = data["ball_id"]

    db = get_db()
    db.execute(
        """
        UPDATE Games
        SET boule_id = ?
        WHERE session_id = ? AND player_id = ?
        """,
        (ball_id, session_id, player_id)
    )
    db.commit()
    db.close()

    return jsonify({"status": "ok"})


# ======================================================
# TEAMS ROUTES
# ======================================================

@app.route("/teams")
def get_teams():
    db = get_db()
    rows = db.execute(
        "SELECT team_id, team_name FROM Teams ORDER BY team_name"
    ).fetchall()

    teams = [
        {"team_id": row["team_id"], "team_name": row["team_name"]}
        for row in rows
    ]

    return jsonify(teams)


@app.route("/team_players/<int:team_id>")
def get_team_players(team_id):
    db = get_db()

    rows = db.execute("""
        SELECT Players.player_id, Players.player_name, TeamMembers.role
        FROM TeamMembers
        JOIN Players ON Players.player_id = TeamMembers.player_id
        WHERE TeamMembers.team_id = ?
        ORDER BY Players.player_name
    """, (team_id,)).fetchall()

    players = [
        {
            "player_id": row["player_id"],
            "player_name": row["player_name"],
            "role": row["role"]
        }
        for row in rows
    ]

    return jsonify(players)


@app.route("/create_team", methods=["POST"])
def create_team():
    data = request.get_json()
    team_name = data.get("team_name")

    if not team_name:
        return jsonify({"error": "Team name required"}), 400

    db = get_db()
    cur = db.execute(
        "INSERT INTO Teams (team_name) VALUES (?)",
        (team_name,)
    )
    db.commit()

    return jsonify({"team_id": cur.lastrowid})


@app.route("/join_team", methods=["POST"])
def join_team():
    data = request.get_json()
    team_id = data.get("team_id")
    player_id = data.get("player_id")
    role = data.get("role")

    if not team_id or not player_id:
        return jsonify({"error": "Missing team_id or player_id"}), 400

    db = get_db()
    db.execute("""
        INSERT INTO TeamMembers (team_id, player_id, role)
        VALUES (?, ?, ?)
    """, (team_id, player_id, role))
    db.commit()

    return jsonify({"status": "ok"})


@app.route("/delete_team/<int:team_id>", methods=["DELETE"])
def delete_team(team_id):
    db = get_db()

    db.execute("DELETE FROM TeamMembers WHERE team_id = ?", (team_id,))
    db.execute("DELETE FROM Teams WHERE team_id = ?", (team_id,))
    db.commit()

    return jsonify({"status": "deleted"})

# ======================================================
# LIEUX & BOULES
# ======================================================

@app.get("/lieux")
@login_required
def get_lieux():
    db = get_db()
    rows = db.execute(
        "SELECT lieu_id, lieu_name FROM Lieux ORDER BY lieu_name"
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

@app.post('/lieux')
@login_required
def create_lieu():
    data = request.json
    lieu_name = data.get('lieu_name')

    if not lieu_name:
        return jsonify({'error': 'Missing lieu_name'}), 400

    db = get_db()
    db.execute(
        "INSERT INTO Lieux (lieu_name) VALUES (?)",
        (lieu_name,)
    )
    db.commit()
    db.close()

    return jsonify({'message': 'Lieu created successfully'})

@app.delete('/lieux/<int:lieu_id>')
@login_required
def delete_lieu(lieu_id):
    db = get_db()
    db.execute(
        "DELETE FROM Lieux WHERE lieu_id = ?",
        (lieu_id,)
    )
    db.commit()
    db.close()
    return jsonify({'message': 'Lieu deleted successfully'})

@app.route("/boules/deactivate/<int:boule_id>", methods=["POST"])
@login_required
def deactivate_boule(boule_id):
    db = get_db()

    # Fetch the ball owner
    boule = db.execute(
        "SELECT player_id FROM Boules WHERE boule_id = ?",
        (boule_id,)
    ).fetchone()

    if not boule:
        db.close()
        return jsonify({"error": "Ball not found"}), 404

    # Authorization rule:
    # - Admin can deactivate any ball
    # - Player can deactivate their own ball
    if not session.get("is_admin") and boule["player_id"] != session["user_id"]:
        db.close()
        return jsonify({"error": "Not authorized"}), 403

    # Soft delete
    db.execute(
        "UPDATE Boules SET active = 0 WHERE boule_id = ?",
        (boule_id,)
    )
    db.commit()
    db.close()

    return "", 204

@app.get("/boules")
@login_required
def get_boules():
    requested_player_id = request.args.get("player_id", type=int)

    # Cas admin : peut voir les boules du joueur sélectionné
    if session.get("is_admin"):
        player_id = requested_player_id or session["user_id"]

    # Cas joueur normal : toujours limité à lui-même
    else:
        player_id = session["user_id"]

    db = get_db()
    rows = db.execute(
        """
        SELECT boule_id, boule_name, player_id, active
        FROM Boules
        WHERE player_id = ?
        ORDER BY boule_name
        """,
        (player_id,)
    ).fetchall()
    db.close()

    return jsonify([dict(r) for r in rows])

@app.post('/boules')
@login_required
def create_boule():
    data = request.json
    boule_name = data.get('boule_name')
    requested_player_id = data.get('player_id')

    if not boule_name:
        return jsonify({'error': 'Missing boule_name'}), 400

    # Cas admin : peut créer pour n'importe qui
    if session.get("is_admin"):
        player_id = requested_player_id or session["user_id"]

    # Cas joueur normal
    else:
        # Il peut seulement créer pour lui-même
        if requested_player_id != session["user_id"]:
            return jsonify({'error': 'Not authorized to assign player_id'}), 403
        player_id = session["user_id"]

    db = get_db()
    db.execute(
        "INSERT INTO Boules (boule_name, player_id) VALUES (?, ?)",
        (boule_name, player_id)
    )
    db.commit()
    db.close()

    return jsonify({'status': 'ok'})

# ======================================================
# STATS
# ======================================================

@app.get("/stats/player/<int:player_id>")
@login_required
def stats_player(player_id):
    db = get_db()
    rows = db.execute(
        """
        SELECT date, score, category, boule_id, lieu_id
        FROM Games
        WHERE player_id = ?
        ORDER BY date ASC
        """,
        (player_id,)
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])

# ======================================================
# GAMES HISTORY
# ======================================================
@app.route("/games/history", methods=["GET"])
@login_required
def games_history():
    db = get_db()

    user_id = session["user_id"] # Get history for logged-in user only
    if not user_id:
        return jsonify({"error": "Not authenticated"}), 401

    # Optional query parameters
    limit = request.args.get("limit", 20, type=int)
    offset = request.args.get("offset", 0, type=int)
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    boule_id = request.args.get("boule_id")
    lieu_id = request.args.get("lieu_id")
    category = request.args.get("category")

    query = """
        SELECT
            g.game_id,
            g.date,
            g.score,
            g.category,
            g.boule_id,
            g.lieu_id,
            b.boule_name,
            l.lieu_name
        FROM Games g
        LEFT JOIN Boules b ON g.boule_id = b.boule_id
        LEFT JOIN Lieux l ON g.lieu_id = l.lieu_id
        WHERE g.player_id = ?
    """
    params = [user_id]

    if start_date:
        query += " AND g.date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND g.date <= ?"
        params.append(end_date)

    if boule_id:
        query += " AND g.boule_id = ?"
        params.append(boule_id)

    if lieu_id:
        query += " AND g.lieu_id = ?"
        params.append(lieu_id)

    if category:
        query += " AND g.category = ?"
        params.append(category)

    query += " ORDER BY g.date DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    rows = db.execute(query, params).fetchall()
    return jsonify([dict(row) for row in rows])

# ======================================================
# HISTORY - EDIT GAMES
# ======================================================
@app.put("/games/<int:game_id>")
@login_required
def update_game(game_id):
    data = request.get_json()

    score = data.get("score")
    boule_id = data.get("boule_id")
    lieu_id = data.get("lieu_id")
    category = data.get("category")

    db = get_db()
    cur = db.cursor()

    cur.execute("""
        UPDATE Games
        SET score = ?, boule_id = ?, lieu_id = ?, category = ?
        WHERE game_id = ?
    """, (score, boule_id, lieu_id, category, game_id))

    db.commit()
    db.close()

    return jsonify({"status": "ok"}), 200


# ======================================================
# ADMIN — PLAYERS CRUD
# ======================================================

@app.get('/admin/players')
@admin_required
def admin_get_players():
    db = get_db()
    rows = db.execute(
        "SELECT player_id, player_name, email, is_admin, active FROM Players ORDER BY player_name"
    ).fetchall()
    db.close()
    return jsonify([dict(r) for r in rows])


@app.post('/admin/players')
@admin_required
def admin_create_player():
    data = request.json
    name = data.get('player_name')

    if not name:
        return jsonify({'error': 'Missing player_name'}), 400

    db = get_db()
    db.execute("INSERT INTO Players (player_name) VALUES (?)", (name,))
    db.commit()
    db.close()

    return jsonify({'message': 'Player created'}), 201


@app.put('/admin/players/<int:player_id>')
@admin_required
def admin_update_player(player_id):
    data = request.json
    name = data.get('player_name')
    email = data.get('email')
    is_admin = data.get('is_admin')

    db = get_db()
    db.execute(
        "UPDATE Players SET player_name=?, email=?, is_admin=? WHERE player_id=?",
        (name, email, is_admin, player_id)
    )
    db.commit()
    db.close()

    return jsonify({'message': 'Player updated'}), 200


@app.delete('/admin/players/<int:player_id>')
@admin_required
def admin_delete_player(player_id):
    db = get_db()
    db.execute("DELETE FROM Players WHERE player_id=?", (player_id,))
    db.commit()
    db.close()
    return jsonify({'message': 'Player deleted'}), 200


# ======================================================
# ADMIN — ACTIVATE / DEACTIVATE PLAYER
# ======================================================
@app.put('/admin/players/<int:player_id>/activate')
@admin_required
def admin_activate_player(player_id):
    db = get_db()
    db.execute(
        "UPDATE Players SET active = 1 WHERE player_id = ?", (player_id,))
    db.commit()
    db.close()
    return jsonify({'message': 'Player activated successfully'}), 200


@app.put('/admin/players/<int:player_id>/deactivate')
@admin_required
def admin_deactivate_player(player_id):
    db = get_db()
    db.execute(
        "UPDATE Players SET active = 0 WHERE player_id = ?",
        (player_id,)
    )
    db.commit()
    db.close()
    return jsonify({'message': 'Player deactivated successfully'}), 200


# ======================================================
# RUN
# ======================================================

if __name__ == "__main__":
    # host="0.0.0.0" make Flask accessible from a portable phone on the same Wifi network
    app.run(host="0.0.0.0", port=5000, debug=False)
