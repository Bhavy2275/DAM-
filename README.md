# DAM Lighting Solution LLP — Quotation Dashboard

A full-stack quotation management dashboard for DAM Lighting Solution LLP.

## Tech Stack

- **Frontend:** React (Vite) + TailwindCSS v4 + Recharts + Lucide Icons
- **Backend:** Node.js + Express.js
- **Database:** SQLite via Prisma ORM
- **Auth:** JWT (httpOnly cookies)
- **PDF:** Puppeteer (HTML→PDF)

## Setup

### 1. Server

```bash
cd server
cp .env.example .env
npx prisma db push
node prisma/seed.js
npm run dev
```

### 2. Client

```bash
cd client
npm install
npm run dev
```

### 3. Login

- **URL:** http://localhost:5173
- **Email:** admin@damlighting.com
- **Password:** admin123

## Features

- Multi-step quotation creation with brand columns
- Auto-calculated recommendations with GST
- PDF generation (Puppeteer)
- Client management
- Payment tracking
- Dashboard with charts
- Company settings management
