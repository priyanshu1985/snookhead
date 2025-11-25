# Snookhead Backend - Enhanced

## Features added
- Users API (CRUD + role change)
- Enhanced Auth: access tokens, refresh tokens (in-memory), logout, password reset (dev)
- Reservations improvements: user reservations, autoassign, cancel
- Active Tables: start/stop sessions, auto bill creation
- Queue: next, clear
- Bills: pay endpoint
- Admin seeding script: `npm run seed`
- Improved README and example env

## Setup
1. Import `/mnt/data/snookhead_db.sql` into MySQL Workbench (creates `snookhead` DB).
2. Copy `.env.example` to `.env` and fill:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=cdac
DB_NAME=snookhead
DB_PORT=3306
JWT_SECRET=your_jwt_secret
JWT_EXP=15m
ADMIN_EMAIL=admin@snookhead.com
ADMIN_PASS=admin123
```
3. Install deps:
```
npm install
```
4. Seed admin (optional):
```
npm run seed
```
5. Run dev:
```
npm run dev
```

## Notable endpoints
- `POST /api/auth/register`
- `POST /api/auth/login` => returns `{ accessToken, refreshToken }`
- `POST /api/auth/refresh` => `{ accessToken }`
- `POST /api/auth/request-reset` => returns reset token (dev)
- `POST /api/auth/reset-password`
- `GET /api/users/` (admin)
- `POST /api/reservations/autoassign` (auth)
- `POST /api/activeTables/start` and `/stop`
- `POST /api/queue/next`
- `POST /api/bills/:id/pay`

## Notes
- Refresh tokens & reset tokens are stored in memory in `utils/tokenStore.js` — suitable for development only.
- Do not use in production without persistent token storage and proper email delivery for password reset.
