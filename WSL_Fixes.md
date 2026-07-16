# TaskFlow WSL + Windows PostgreSQL Setup

## Overview

TaskFlow backend is running inside **WSL Debian**, while PostgreSQL is running on **Windows**.

This setup avoids installing a second PostgreSQL server inside WSL. The WSL environment only uses the PostgreSQL client and connects to the Windows PostgreSQL server over the WSL network.

## Final Architecture

```
Windows
└── PostgreSQL 18.4
    ├── Host: 172.23.208.1
    ├── Port: 5432
    └── Database: taskflow_dev

WSL Debian
└── TaskFlow Backend
    ├── Node.js
    ├── PostgreSQL Client (psql)
    └── Connects to Windows PostgreSQL
```

---

# PostgreSQL Client Installation (WSL)

Install only the PostgreSQL client tools:

```bash
sudo apt update
sudo apt install postgresql-client
```

Verify installation:

```bash
psql --version
```

---

# Connecting to Windows PostgreSQL from WSL

The Windows PostgreSQL server is reachable through the WSL gateway IP.

Find the gateway:

```bash
ip route | grep default
```

Example output:

```
default via 172.23.208.1 dev eth0
```

Connect:

```bash
psql -h 172.23.208.1 -U postgres -d taskflow_dev -W
```

Successful connection example:

```
psql (17.10 (Debian 17.10-0+deb13u1), server 18.4)
Type "help" for help.
```

The client/server version difference is acceptable for normal development usage.

---

# Windows PostgreSQL Configuration

## postgresql.conf

Make sure PostgreSQL accepts external connections.

Location:

```
C:\Program Files\PostgreSQL\18\data\postgresql.conf
```

Set:

```conf
listen_addresses = '*'
```

---

## pg_hba.conf

Allow WSL clients to authenticate:

Location:

```
C:\Program Files\PostgreSQL\18\data\pg_hba.conf
```

Add:

```conf
host    all    all    0.0.0.0/0    scram-sha-256
```

Restart PostgreSQL:

```powershell
Restart-Service postgresql-x64-18
```

---

# Windows Firewall

Allow PostgreSQL traffic on port 5432:

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

# TaskFlow Backend Environment

The backend must not use `localhost` because PostgreSQL is not running inside WSL.

Incorrect:

```env
DB_HOST=localhost
```

Correct:

```env
DB_HOST=172.23.208.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=taskflow_dev
```

Example connection string:

```env
DATABASE_URL=postgresql://postgres:your_password@172.23.208.1:5432/taskflow_dev
```

---

# Node.js PostgreSQL Pool Configuration

The backend database pool should use environment variables:

```javascript
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
```

Avoid hardcoding:

```javascript
host: "localhost"
```

because inside WSL it points to the WSL machine, not Windows.

---

# Troubleshooting

## Error: Connection refused 127.0.0.1:5432

Example:

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

Cause:

The application is trying to connect to PostgreSQL inside WSL.

Fix:

Update:

```env
DB_HOST=172.23.208.1
```

Restart the backend.

---

## Test PostgreSQL Connectivity

From WSL:

```bash
nc -vz 172.23.208.1 5432
```

Expected:

```
Connection to 172.23.208.1 5432 port [tcp/postgresql] succeeded!
```

---

# Current Working Setup

✅ PostgreSQL 18.4 running on Windows
✅ PostgreSQL client installed in WSL Debian
✅ TaskFlow backend running inside WSL
✅ Backend successfully connects to Windows PostgreSQL
✅ No PostgreSQL server installation required inside WSL
