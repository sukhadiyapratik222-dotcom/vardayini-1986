@echo off
start "MongoDB Server" "C:\Users\SukhadiyaPratikPares\Downloads\mongodb-windows-x86_64-9.0.2\mongodb-win32-x86_64-windows-9.0.2\bin\mongod.exe" --dbpath "C:\Users\SukhadiyaPratikPares\mongodb-data" --bind_ip 127.0.0.1,::1 --port 27017 --logpath "C:\Users\SukhadiyaPratikPares\mongodb-data\mongod.log" --logappend
