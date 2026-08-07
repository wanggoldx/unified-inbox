# ⚠️ TEMPORARILY CLOSED THIS PROJECT ⚠️

# Unified Inbox Dashboard

A full-stack web application that aggregates Gmail and Outlook (Hotmail) emails into a unified interface with real-time sync and email management.

## Project Status

| Feature | Status |
|---------|--------|
| Gmail OAuth (single account) | Done |
| Email sync & unified inbox | Done |
| Email read/unread toggle (syncs to Gmail) | Done |
| Email delete/archive (syncs to Gmail) | Done |
| OAuth2 auto token refresh | Done |
| Resizable email panels | Done |
| Manual sync endpoint | Done |
| Multiple Google accounts | Pending |
| Outlook (Hotmail) integration | Pending |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| State Management | Zustand (client), React Query (server) |
| Backend | Express, TypeScript |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| OAuth | Google APIs, Microsoft Graph |

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Cloud account (for Gmail OAuth)
- Azure account (for Outlook OAuth)

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd unified-inbox
```

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Set up environment variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your values. See [OAuth Setup Guide](docs/OAUTH_SETUP.md) for help obtaining credentials.

### 4. Generate encryption key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the output to `ENCRYPTION_KEY` in `backend/.env`.

### 5. Set up database

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 6. Start the application

Open two terminals:

**Terminal 1 (Backend):**
```bash
npm run dev:backend
```

**Terminal 2 (Frontend):**
```bash
npm run dev:frontend
```

The app will be available at `http://localhost:5173`.

## OAuth Configuration

See [docs/OAUTH_SETUP.md](docs/OAUTH_SETUP.md) for detailed instructions on setting up Google and Microsoft OAuth credentials.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List connected accounts |
| GET | `/api/accounts/gmail` | Get Gmail OAuth URL |
| GET | `/api/accounts/gmail/callback` | Gmail OAuth callback |
| DELETE | `/api/accounts/:id` | Disconnect account |

### Emails
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/emails` | List emails (paginated) |
| GET | `/api/emails/:id` | Get email detail |
| PUT | `/api/emails/:id/read` | Toggle read/unread |
| DELETE | `/api/emails/:id` | Delete email |
| POST | `/api/emails/:id/archive` | Archive email (Gmail) |
| GET | `/api/emails/search` | Search emails |

### Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sync` | Manual sync all connected accounts |

## Project Structure

```
unified-inbox/
├── docs/
│   └── OAUTH_SETUP.md
├── frontend/
│   ├── src/
│   │   ├── components/     ← React components
│   │   ├── pages/          ← Page components
│   │   ├── stores/         ← Zustand stores
│   │   ├── lib/            ← Utilities (API client, error helpers)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── routes/         ← Express routes
│   │   ├── controllers/    ← Route handlers
│   │   ├── services/       ← Business logic & adapters
│   │   ├── middleware/      ← Auth, error handling
│   │   ├── config/         ← DB, OAuth setup
│   │   └── app.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── package.json            ← Root workspace config
└── README.md
```

## Development

### Database Commands

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name <migration_name>

# Open Prisma Studio (database GUI)
npx prisma studio

# Reset database
npx prisma migrate reset
```

### Build for Production

```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm run build
```

## License

MIT
