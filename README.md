# PROJECT TITLE: BowlerTrend

## VIDEO DEMO: <https://youtu.be/1G__2xQGmDA>

## DESCRIPTION

## 1. Project Overview

BowlerTrend is a web application designed to track long term bowling performance using simple data entry and clear visualizations. Its goal is to help bowlers understand their evolution over time and detect meaningful changes in performance by applying Statistical Process Control (SPC) tools.

The app is intentionally lightweight: a Flask backend, a SQLite database, and a JavaScript driven frontend. It is optimized for mobile use because bowling data is usually entered directly at the alley.

### Motivation

Bowling is difficult to master, both physically and mentally. Individual scores vary greatly, and without historical perspective, a bowler may become discouraged, thinking their abilities are declining — or, on the contrary, become overly optimistic after a few good game.

BowlerTrend uses statistical process control (SPC) tools to evaluate the long term evolution of a bowler’s scores from different time perspectives. It provides a structured way to record every game in a simple, mobile friendly workflow suitable for real world use, while automatically generating statistics and history.

The goal was to create a practical, elegant, and complete application suitable for everyday play.

## 2. Project Architecture

### Backend (Flask)

- Python + Flask application
- REST style API endpoints
- SQLite database accessed through get_db()
- Routes for Sessions, Games, Players, Balls (Boules), Locations (Lieux), History, and Stats
- A single app.py file handles all routes.
- JSON responses for all data operations
- Input validation and error handling
- Database access uses a get_db() helper to ensure consistent and safe SQLite connections.
- All CRUD operations for Sessions, Games, Players, Balls (Boules), and Locations (Lieux) are implemented as REST style endpoints returning JSON.
- Input validation is performed server side to prevent malformed data.
- The backend remains intentionally simple to keep the project maintainable and transparent for CS50 graders.

### Frontend

- Pure HTML, CSS, and JavaScript — no frameworks.
- HTML pages for each module
- Clean, consistent CSS (mobile first)
- Each page has its own JS file: Sessions.js, History.js, Players.js, Teams.js, Boules.js, Lieux.js, Login.js.
- Chart.js is used for visualizing trends and SPC charts.
- The UI is responsive and optimized for mobile, with large tap friendly buttons and simplified navigation.

## 3. Database Schema (SQLite)

### Tables schema

CREATE TABLE Games (
game_id INTEGER PRIMARY KEY AUTOINCREMENT,
session_id INTEGER,
score INTEGER NOT NULL,
lieu TEXT,  player_id INTEGER,
category TEXT,
boule TEXT,
FREE TEXT,
boule_id INTEGER REFERENCES Boules(boule_id),
lieu_id INTEGER REFERENCES Lieux(lieu_id),
date TEXT,
game_number INTEGER,
FOREIGN KEY (session_id) REFERENCES Sessions(session_id)
);

CREATE TABLE Players (
player_id INTEGER PRIMARY KEY AUTOINCREMENT,
player_name TEXT NOT NULL,
password_hash TEXT,
email TEXT,
active INTEGER DEFAULT 1, is_admin INTEGER DEFAULT 0
);

CREATE TABLE Teams (
team_id INTEGER PRIMARY KEY AUTOINCREMENT,
team_name TEXT NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE TeamMembers (
team_id INTEGER NOT NULL,
player_id INTEGER NOT NULL,
role TEXT DEFAULT 'member',
PRIMARY KEY (team_id, player_id),
FOREIGN KEY (team_id) REFERENCES Teams(team_id),
FOREIGN KEY (player_id) REFERENCES Players(player_id)
);

CREATE TABLE Lieux (
lieu_id INTEGER PRIMARY KEY AUTOINCREMENT,
lieu_name TEXT NOT NULL UNIQUE,
active INTEGER DEFAULT 1
);

CREATE TABLE Boules (
boule_id INTEGER PRIMARY KEY AUTOINCREMENT,
boule_name TEXT NOT NULL,
player_id INTEGER NOT NULL,
active INTEGER NOT NULL DEFAULT 1,
FOREIGN KEY (player_id) REFERENCES Players(player_id)
);

**This schema is intentionally flexible to allow future expansion (e.g., SPC metrics, team statistics, equipment tracking).**

## 4. Core Features of the web pages

**New Session**
A session is a group of players meeting for a number of games.

- Create a new session with a date, a team of players, the number of games to be played, and optionally balls to be used.
- Track scores, players, balls used, and locations
- Automatically number games.
- Validate scores before automatic saving.

**Game History**

- Display the score history for the logged in player
- Filters by location, ball, or date
- Provide quick access to edit or delete entries.

**Teams, Balls and Places**

- Simple Create-Delete-Update-Delete interfaces.
- Used to populate dropdowns throughout the app.
- Add, edit, and delete players
- Assigning balls to players (bowlers often use balls with different characteristics)
- Manage locations (bowling centers)
- Consistent UI across all pages

**Statistics**

- Displays numeric and graphic results over configurable time period and filters.
- Moving average, standard deviation, score trend analysis.
- SPC control chart with ±3σ limits.
- Distribution of scores bar chart.
- Charts generated with Chart.js

**Authentication**

- Login system to access data
- Admin privileges to manage user’s information
- Active/inactive user management
- No passwords are stored; the login is intentionally lightweight for CS50.
- All database writes use parameterized queries to prevent SQL injection.
- The app runs locally and does not expose external APIs.

## 5. File Structure

### /backend

  app.py
  Bowler.db
  templates/nav.html

### /frontend css/style.css

  libs/Chart.js
  Admin.html
  boules.html
  CreateTeam.html
  history.html
  index.html
  lieux.html
  login.html
  register.html
  sessions.html
  stats.html
  teams.html
  js/admin.js
  js/app.js
  js/boules.js
  js/CreateTeam.js
  js/history.js
  js/lieux.js
  js/login.js
  js/logout.js
  js/register.js
  js/sessions.js
  js/stats.js
  js/teams.js

## 6. Design Decisions

- Modular JavaScript: each page has its own script for clarity and maintainability
- Consistent UI: shared layout, spacing, and visual style
- Mobile first CSS: works smoothly on iPhone and desktop
- User filtering: History page shows only the logged in user’s games
- Simple deployment: pure Flask + SQLite, no external dependencies

## 7. Known Limitations

- No password reset system
- No multi language support
- Statistics are basic (but functional)
- SPC tools are partially implemented (control chart + limits).
- No authentication system beyond simple login.
- No multi device sync.
- No cloud sync (local database only)

## 8. Future Improvements

- Exporting game history to and from CSV
- Add a dark mode option
- Add SPC tools to identify out of control events that reveal true variation in the bowler’s game over time

## 9. Lessons Learned

- The importance of planning all components early to maintain consistency.
- How to collaborate efficiently with AI (Copilot) — more difficult than expected.
- How to use Visual Studio Code effectively and the necessity of good backup procedures (a painful but valuable lesson).
- The importance of separating backend and frontend logic.
- How to design a database schema that supports future expansion.
- How to build a responsive UI for both mobile and PC contexts.
- And many more!

## 10. Credits

BowlerTrend was designed and implemented by myself, based on my beginner level bowling experience.

**Microsoft Copilot** was used throughout the project as a programming assistant for:

- debugging
- code review
- architectural guidance
- UI/UX refinement
- documentation support

All design decisions, code structure, and implementation choices were made by the author.

Frameworks and libraries used:

- Flask
- SQLite
- Chart.js
- Vanilla JavaScript
- HTML/CSS

## 11. How to Run the Project

1. Clone the repository Download the project from GitHub to your computer.
2. Create a virtual environment This isolates your Python dependencies so they don’t conflict with other projects.
3. Install dependencies This installs Flask and any other required Python packages.
4. Initialize the database This creates the SQLite database using your schema.
5. Run the Flask server from the \Backend directory, this starts the web application.
6. Open the app in your browser Go to <http://127.0.0.1:5000> to use BowlerTrend.

Serge Lavoie, May 2026
