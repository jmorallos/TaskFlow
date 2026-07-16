# WSL Debian + Windows PostgreSQL Connection Setup & Troubleshooting Log

## Goal

Run the TaskFlow backend inside **WSL Debian** while using the existing **PostgreSQL server installed on Windows**.

Final architecture:

```
Windows
└── PostgreSQL 18.4
    └── Port: 5432

WSL Debian
└── TaskFlow Backend
    └── Node.js + PostgreSQL Client
```

---

# 1. Initial PostgreSQL Connection Attempt

Attempted:

```bash
pqsl -h localhost -U jmorallos -d taskflow_dev
```

Result:

```
bash: pqsl: command not found
```

## Issue

Typo.

The command is:

```bash
psql
```

not:

```bash
pqsl
```

---

# 2. Running Correct PostgreSQL Client Command

Attempted:

```bash
psql -h localhost -U jmorallos -d taskflow_dev
```

Result:

```
bash: psql: command not found
```

## Issue

PostgreSQL client tools were not installed inside WSL.

---

# 3. Install PostgreSQL Client in WSL

Installed:

```bash
sudo apt update
sudo apt install postgresql-client
```

Verified:

```bash
psql --version
```

---

# 4. First Connection Attempt Using localhost

Attempted:

```bash
psql -h localhost -U jmorallos -d taskflow_dev
```

Result:

```
psql: error: connection to server at "localhost" (127.0.0.1),
port 5432 failed: Connection refused
```

## Issue

`localhost` inside WSL points to WSL itself.

There was no PostgreSQL server running inside Debian.

Current situation:

```
WSL localhost:5432
        |
        X
        |
PostgreSQL Windows
```

---

# 5. Find Windows Host IP From WSL

Checked:

```bash
cat /etc/resolv.conf
```

Output:

```
nameserver 10.255.255.254
```

Tried:

```bash
psql -h 10.255.255.254 -U jmorallos -d taskflow_dev
```

Result:

```
connection refused
```

## Issue

The DNS resolver IP was not the correct Windows PostgreSQL host address.

---

# 6. Find Correct WSL Gateway

Checked:

```bash
ip route | grep default
```

Output:

```
default via 172.23.208.1 dev eth0 proto kernel
```

Windows host gateway:

```
172.23.208.1
```

---

# 7. Configure Windows PostgreSQL

Checked PostgreSQL service:

PowerShell:

```powershell
Get-Service *postgres*
```

Output:

```
Running  postgresql-x64-18
```

PostgreSQL was running.

---

# 8. Check PostgreSQL Listening Address

PowerShell:

```powershell
netstat -ano | findstr 5432
```

Output:

```
TCP    0.0.0.0:5432     LISTENING
TCP    [::]:5432        LISTENING
```

## Result

PostgreSQL was already listening on all interfaces.

---

# 9. Verify pg_hba.conf

Checked:

```
C:\Program Files\PostgreSQL\18\data\pg_hba.conf
```

Added/confirmed:

```conf
host    all    all    0.0.0.0/0    scram-sha-256
```

This allows WSL clients to authenticate.

---

# 10. Test Network Connection From WSL

Attempted:

```bash
nc -vz 10.255.255.254 5432
```

Result:

```
connection refused
```

Wrong host IP.

---

Tested:

```bash
nc -vz -w 5 172.23.208.1 5432
```

Result:

```
timed out
```

Firewall/network issue suspected.

---

# 11. Allow PostgreSQL Through Windows Firewall

Run PowerShell as Administrator:

```powershell
New-NetFirewallRule `
  -DisplayName "Allow PostgreSQL from WSL" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 5432 `
  -Action Allow
```

---

# 12. Successful PostgreSQL Connection

Connected from WSL:

```bash
psql -h 172.23.208.1 -U postgres -d taskflow_dev -W
```

Result:

```
Password:

psql (17.10 (Debian 17.10-0+deb13u1), server 18.4)

Type "help" for help.
```

Connection successful.

---

# 13. Backend Connection Issue

TaskFlow backend error:

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Stack trace:

```
backend/src/db/pool.js
```

## Issue

Node.js backend was still using:

```
localhost:5432
```

Inside WSL this means:

```
WSL
└── localhost:5432
    X PostgreSQL server
```

---

# 14. Update Backend Environment Variables

Before:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=taskflow_dev
```

After:

```env
DB_HOST=172.23.208.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=taskflow_dev
```

Restart backend after changing `.env`.

---

# Final Working Configuration

## Windows

```
PostgreSQL 18.4

Host:
172.23.208.1

Port:
5432

Database:
taskflow_dev
```

---

## WSL Debian

```
PostgreSQL Client

psql
version:
17.10
```

Connection:

```bash
psql -h 172.23.208.1 -U postgres -d taskflow_dev -W
```

---

## TaskFlow Backend

Environment:

```env
DB_HOST=172.23.208.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=taskflow_dev
```

---

# Important Lessons

## localhost difference

Inside WSL:

```
localhost
=
WSL machine
```

Not Windows.

---

## Use Windows services from WSL

Recommended setup:

```
Windows
├── PostgreSQL
├── pgAdmin
├── Browser
└── GUI applications

WSL Debian
├── Node.js
├── Backend
├── Git
└── Linux development tools
```

---

# Final Status

✅ PostgreSQL installed only on Windows
✅ PostgreSQL client installed in WSL
✅ WSL successfully connects to Windows PostgreSQL
✅ TaskFlow backend connects successfully
✅ No duplicate PostgreSQL installation needed inside WSL
