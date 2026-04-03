# VigilX Security Engine

Welcome to the VigilX codebase. This single package runs the entire full-stack application natively on your hardware.

## Quick Start (For Judges)

We built an automated orchestrator so you don't have to fiddle with Python versions or Node modules.

### Mac / Linux
1. Extract the folder.
2. Open terminal in this folder.
3. Run `./install.sh`

### Windows
1. Extract the folder.
2. Double click `install.bat`.

*Prerequisite: You must have Docker Desktop installed.*

---

## What is happening under the hood?
When the installer runs, it calls `docker-compose up`:
1. It builds a Python **FastAPI container** with our advanced behavior biometrics engine and SQLite persistence database.
2. It builds an **Nginx container** to deliver our secure, glassmorphic Frontend directly to your browser.
3. It binds the networks and launches `http://localhost:3000`.

To stop the background processes later, you can simply run:
`make stop` or `docker-compose down`.
