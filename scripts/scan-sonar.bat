@echo off
echo Running SonarQube scan...
if not exist "C:\Users\Admin\.sonarwork" mkdir "C:\Users\Admin\.sonarwork"
sonar-scanner --define sonar.token=sqp_50d463661a8542e877a6f3f3e4435756e73c9464 --define sonar.working.directory=C:\Users\Admin\.sonarwork
pause
