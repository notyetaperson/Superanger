@echo off
title Pixel Rearrangement Tool - Development Server
color 0A

echo ========================================
echo  Pixel Rearrangement Tool
echo  Development Server
echo ========================================
echo.

REM Check for Python
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [*] Starting Python HTTP server on port 8000...
    echo [*] Server will open automatically in your browser
    echo [*] Press Ctrl+C to stop the server
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8000
    python -m http.server 5173
    goto :end
)

REM Check for Node.js (npx)
npx --version >nul 2>&1
if %errorlevel% == 0 (
    echo [*] Starting Node.js HTTP server on port 8000...
    echo [*] Server will open automatically in your browser
    echo [*] Press Ctrl+C to stop the server
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8000
    npx --yes http-server -p 8000
    goto :end
)

REM Check for PHP
php --version >nul 2>&1
if %errorlevel% == 0 (
    echo [*] Starting PHP development server on port 8000...
    echo [*] Server will open automatically in your browser
    echo [*] Press Ctrl+C to stop the server
    echo.
    timeout /t 2 /nobreak >nul
    start http://localhost:8000
    php -S localhost:8000
    goto :end
)

REM No server found
echo [ERROR] No local server found!
echo.
echo Please install one of the following:
echo.
echo   Python 3:  https://www.python.org/downloads/
echo   Node.js:   https://nodejs.org/
echo   PHP:       https://www.php.net/downloads.php
echo.
echo Note: This project uses ES6 modules and requires a local server.
echo       You cannot open index.html directly in a browser.
echo.
pause
goto :end

:end
