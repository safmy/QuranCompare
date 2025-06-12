@echo off
REM Voice Changer Application Startup Script for Windows

echo Starting Voice Changer Application...

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate

REM Install/update dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Check if FFmpeg is installed
where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo WARNING: FFmpeg is not installed. Some audio features may not work.
    echo Please download FFmpeg from https://ffmpeg.org/download.html
    echo and add it to your system PATH.
)

REM Create necessary directories
if not exist "uploads" mkdir uploads
if not exist "outputs" mkdir outputs
if not exist "static" mkdir static

REM Check for OpenAI API key
if exist ".env" (
    for /f "delims=" %%a in (.env) do set %%a
)

if "%OPENAI_API_KEY%"=="" (
    echo WARNING: OpenAI API key not found.
    echo Please set OPENAI_API_KEY in .env file or environment variables.
    echo TTS features will be disabled without an API key.
)

REM Start the application
echo Starting server on http://localhost:5000
python voice_changer.py

pause