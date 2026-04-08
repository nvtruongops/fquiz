@echo off
echo ========================================
echo   FQuiz Platform - Dev Server
echo ========================================
echo.
echo Starting Next.js (FE + BE combined)...
echo.
echo Pages available after startup:
echo.
echo [AUTH]
echo   http://localhost:3000/login
echo   http://localhost:3000/register
echo.
echo [ADMIN PANEL]
echo   http://localhost:3000/admin
echo   http://localhost:3000/admin/categories
echo   http://localhost:3000/admin/quizzes
echo   http://localhost:3000/admin/quizzes/new
echo.
echo [STUDENT]
echo   http://localhost:3000/dashboard
echo   http://localhost:3000/history
echo.
echo ========================================
echo.
npm run dev
