@echo off
echo 🚀 RUNNING MEMORY SYSTEM TESTS
echo ==============================

echo.
echo 1️⃣ Running system tests...
node test/testMemorySystem.js

echo.
echo 2️⃣ Running load tests...
node test/loadTest.js

echo.
echo 3️⃣ Starting monitor (5 seconds)...
timeout /t 5 node test/monitorMemory.js

echo.
echo ✅ ALL TESTS COMPLETE!
pause