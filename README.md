# 🚌 Rewa Kripa Travels — Backend API

REST API for the Rewa Kripa Travels website. Built with **Node.js + Express 5 + Supabase**.

---

## 📁 Folder Structure

```
src/
├── server.js                  ← Express entry point
├── config/
│   └── supabase.js            ← Supabase service-role client
├── middleware/
│   ├── auth.js                ← JWT verify middleware + token signer
│   ├── errorHandler.js        ← Global error handler + createError()
│   └── requestLogger.js       ← Coloured request logger (dev only)
└── routes/
    ├── auth.js                ← POST /api/auth/login|logout, GET /verify
    ├── seats.js               ← Seat booking CRUD
    ├── config.js              ← Site config GET/PUT
    ├── buses.js               ← Bus CRUD
    ├── routes.js              ← Route CRUD
    ├── trips.js               ← Trip/package CRUD
    ├── staff.js               ← Staff directory CRUD
    ├── attendance.js          ← Attendance mark/query
    └── finance.js             ← Finance entries CRUD + export
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
# Then edit .env with your Supabase keys
```

### 3. Set up Supabase database
```
1. Go to supabase.com → your project → SQL Editor
2. Paste the entire contents of supabase_setup.sql
3. Click Run — you should see 5 tables created
4. Copy your Project URL and service role key into .env
```

### 4. Run the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on **http://localhost:4000**

---

## 🔑 Authentication

All **admin-only** routes require a Bearer JWT token in the Authorization header.

```
Authorization: Bearer <token>
```

**Get a token:**
```bash
POST /api/auth/login
{ "password": "Swift@8606" }
# Returns: { "token": "eyJ...", "expiresIn": 28800 }
```

Token is valid for **8 hours**.

---

## 📋 API Reference

### Health
| Method | Endpoint  | Auth | Description        |
|--------|-----------|------|--------------------|
| GET    | /health   | ❌   | Server status check|

---

### Auth
| Method | Endpoint            | Auth | Description              |
|--------|---------------------|------|--------------------------|
| POST   | /api/auth/login     | ❌   | Get JWT token            |
| POST   | /api/auth/logout    | ❌   | Client-side logout note  |
| GET    | /api/auth/verify    | ✅   | Verify token is valid    |

---

### Seats
| Method | Endpoint                  | Auth | Description                        |
|--------|---------------------------|------|------------------------------------|
| GET    | /api/seats                | ❌   | Get booked seats (busId + date)    |
| POST   | /api/seats                | ❌   | Book one or more seats             |
| DELETE | /api/seats/:seatNum       | ✅   | Unblock a single seat              |
| DELETE | /api/seats                | ✅   | Clear all seats for bus+date       |
| DELETE | /api/seats/bus/:busId     | ✅   | Full reset — all dates for a bus   |

**GET /api/seats query params:**
```
?busId=bus1&date=2026-06-15&departure=08:00 AM
```

**POST /api/seats body:**
```json
{
  "busId": "bus1",
  "date": "2026-06-15",
  "seats": [
    {
      "num": 5,
      "gender": "M",
      "passenger_name": "Ramesh Patel",
      "passenger_phone": "+91 9876543210"
    }
  ]
}
```

---

### Config
| Method | Endpoint    | Auth | Description            |
|--------|-------------|------|------------------------|
| GET    | /api/config | ❌   | Get full site config   |
| PUT    | /api/config | ✅   | Save full site config  |

---

### Buses
| Method | Endpoint         | Auth | Description        |
|--------|------------------|------|--------------------|
| GET    | /api/buses       | ❌   | List all buses     |
| GET    | /api/buses/:id   | ❌   | Get single bus     |
| POST   | /api/buses       | ✅   | Create bus         |
| PUT    | /api/buses/:id   | ✅   | Update bus         |
| DELETE | /api/buses/:id   | ✅   | Delete bus         |

---

### Routes
| Method | Endpoint          | Auth | Description        |
|--------|-------------------|------|--------------------|
| GET    | /api/routes       | ❌   | List all routes    |
| GET    | /api/routes/:id   | ❌   | Get single route   |
| POST   | /api/routes       | ✅   | Create route       |
| PUT    | /api/routes/:id   | ✅   | Update route       |
| DELETE | /api/routes/:id   | ✅   | Delete route       |

---

### Trips
| Method | Endpoint         | Auth | Description        |
|--------|------------------|------|--------------------|
| GET    | /api/trips       | ❌   | List all trips     |
| GET    | /api/trips/:id   | ❌   | Get single trip    |
| POST   | /api/trips       | ✅   | Create trip        |
| PUT    | /api/trips/:id   | ✅   | Update trip        |
| DELETE | /api/trips/:id   | ✅   | Delete trip        |

---

### Staff
| Method | Endpoint         | Auth | Description                       |
|--------|------------------|------|-----------------------------------|
| GET    | /api/staff       | ❌   | List staff (active only by default)|
| GET    | /api/staff/:id   | ✅   | Get single staff member           |
| POST   | /api/staff       | ✅   | Add staff member                  |
| PUT    | /api/staff/:id   | ✅   | Update staff member               |
| DELETE | /api/staff/:id   | ✅   | Soft-delete (set active=false)    |

**GET /api/staff query params:**
```
?role=driver&active=true&bus_id=bus1
```

---

### Attendance
| Method | Endpoint                  | Auth | Description                    |
|--------|---------------------------|------|--------------------------------|
| GET    | /api/attendance           | ❌   | Get attendance for a date      |
| GET    | /api/attendance/range     | ❌   | Get attendance for date range  |
| GET    | /api/attendance/monthly   | ❌   | Monthly sheet                  |
| POST   | /api/attendance           | ✅   | Mark/update attendance         |
| DELETE | /api/attendance/:id       | ✅   | Delete a record                |

**GET /api/attendance query params:**
```
?date=2026-06-15&role=driver&bus_id=bus1
```

**GET /api/attendance/range query params:**
```
?from=2026-06-01&to=2026-06-30&role=driver
```

**GET /api/attendance/monthly query params:**
```
?month=2026-06&role=driver
```

**POST /api/attendance body:**
```json
{
  "staff_id": 1,
  "staff_name": "Raju Sharma",
  "role": "driver",
  "bus_id": "bus1",
  "bus_plate": "MP09CY8606",
  "date": "2026-06-15",
  "status": "present",
  "check_in": "07:45",
  "note": "",
  "marked_by": "admin"
}
```

---

### Finance
| Method | Endpoint                | Auth | Description                    |
|--------|-------------------------|------|--------------------------------|
| GET    | /api/finance            | ✅   | List entries with filters      |
| POST   | /api/finance            | ✅   | Create one or many entries     |
| DELETE | /api/finance/:id        | ✅   | Delete an entry                |
| GET    | /api/finance/summary    | ✅   | Profit summary per bus         |
| GET    | /api/finance/export     | ✅   | Download CSV                   |

**GET /api/finance query params:**
```
?busId=bus1&type=income&category=Daily+Route&fromDate=2026-06-01&toDate=2026-06-30
```

**POST /api/finance body:**
```json
{
  "entries": [
    {
      "type": "income",
      "busId": "bus1",
      "busPlate": "MP09CY8606",
      "busTitle": "Luxury Seater",
      "date": "2026-06-15",
      "category": "Daily Route",
      "amount": 9200,
      "route": "Barwani → Bokrata",
      "pax1": 32,
      "pax2": 8,
      "fare": 230
    }
  ]
}
```

---

## 🔒 Environment Variables

| Variable              | Required | Description                              |
|-----------------------|----------|------------------------------------------|
| PORT                  | No       | Server port (default: 4000)              |
| NODE_ENV              | No       | development / production                 |
| FRONTEND_URL          | Yes      | Frontend URL for CORS                    |
| SUPABASE_URL          | Yes      | Supabase project URL                     |
| SUPABASE_SERVICE_KEY  | Yes      | Supabase service role key (secret!)      |
| ADMIN_PASSWORD        | Yes      | Admin portal login password              |
| JWT_SECRET            | Yes      | Secret for signing JWT tokens            |

---

## 🗄️ Database Tables

| Table             | Purpose                                    |
|-------------------|--------------------------------------------|
| seats             | Real-time seat bookings per bus per date   |
| site_config       | All buses, routes, trips, company info     |
| staff             | Staff directory (drivers, conductors etc)  |
| attendance        | Daily attendance records                   |
| finance_entries   | Income and expense ledger                  |

---

## 📦 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** Supabase (PostgreSQL)
- **Auth:** JWT (jsonwebtoken)
- **Dev:** Nodemon, ESLint, Prettier
