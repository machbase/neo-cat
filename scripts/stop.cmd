SET /P PID=<.\.backend\pid
TASKKILL /F /PID %PID%
