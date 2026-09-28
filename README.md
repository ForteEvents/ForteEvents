# ForteEvents

Integrated React/Vite frontend + Express backend for event creation and Beem SMS sending.

## Setup
1. Copy `server/.env.example` to `server/.env`.
2. Put your Beem API key and secret locally in `server/.env`. Never paste them into chat or Git.
3. Install dependencies: `npm install`.
4. Terminal 1: `npm run server`.
5. Terminal 2: `npm run dev`.
6. Open the Vite URL shown in the terminal (normally http://localhost:5174).

The backend uses a small JSON store for this development stage. Before commercial deployment, replace it with PostgreSQL/Supabase and add authentication, payments, rate limiting, audit logs, idempotency, and delivery-status webhooks.

Beem SMS integration follows Beem's documented endpoint and Basic authentication pattern.
