# Backend Blueprint (Express + Sequelize + MySQL)

- Port: 3000
- Simple, minimal structure (models, routes, middleware)
- No logos, no frontend assets.

## Setup

1. Copy `.env.example` to `.env` and fill DB credentials.
2. `npm install`
3. Create the MySQL database (name from `.env`).
4. `npm start` (or `npm run dev`)
5. Server will run on `http://localhost:3000`

## What is included

- `app.js` : entry point, connects DB, loads routes, listens on port 3000.
- `config/database.js` : Sequelize init using env vars.
- `models/` : Sequelize models (User, MenuItem, TableAsset, Reservation, Order, OrderItem, Bill)
- `routes/` : Simple REST routes for auth, menu, tables, reservations, orders.
- `middleware/auth.js` : JWT auth middleware (simple).

This was created based on your uploaded Backend System Blueprint. See citation in conversation for the original PDF. fileciteturn0file0
