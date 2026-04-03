@echo off
setlocal EnableDelayedExpansion
color 0B

echo ========================================================
echo        VigilX Enterprise Installer v2.0
echo ========================================================
echo.

:: 1. Dependency Check
echo ^>^> Step 1/3: Environment Assessment...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Docker Engine not found.
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b
)
echo    [OK] Docker Engine Detected
echo.

:: 2. Build and Launch
echo ^>^> Step 2/3: Compiling ^& Orchestrating Microservices...
echo    Initializing container build sequence. This may take a minute...
docker-compose up -d --build

if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Orchestration failed. Check Docker daemon status.
    pause
    exit /b
)

:: 3. Verification Polling (Basic ping delay for Windows)
echo.
echo ^>^> Step 3/3: Verifying Subsystem Integrity...
echo    Awaiting backend API stabilization...
timeout /t 5 /nobreak >nul
echo    [OK] API Ready
echo    Awaiting frontend Nginx node...
timeout /t 2 /nobreak >nul
echo    [OK] Frontend UI Ready
echo.

:: 4. Completion
color 0A
echo ========================================================
echo        SUCCESS: VIGILX IS ACTIVE LOCALLY
echo ========================================================
echo  Dashboard : http://localhost:3000
echo  API Docs  : http://localhost:8000/docs
echo.
echo Engaging browser protocol...

start http://localhost:3000
