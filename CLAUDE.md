# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack nutrition tracking app with AI-powered assistance. Monorepo with a Next.js frontend and Express.js backend, using MySQL via Prisma ORM.

## Commands

### Frontend (`apps/web`)
```bash
npm run dev      # Dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

### Backend (`apps/api`)
```bash
npm run dev      # Dev server with nodemon at http://localhost:4000
npm run start    # Production
```

### Database
```bash
cd apps/api
npx prisma migrate dev    # Run migrations
npx prisma studio         # GUI for database
```

## Architecture

### Tech Stack
- **Frontend**: Next.js (App Router) + React 19 + TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Express.js 5 (CommonJS JavaScript), Prisma ORM, MySQL
- **AI**: Google Generative AI (`@google/genai`), Gemini 2.5 Flash model
- **Auth**: JWT (7-day expiry), bcrypt password hashing

### Request Flow
Every protected API request carries two headers:
- `Authorization: Bearer {token}` — verified by `apps/api/src/middlewares/auth.js`
- `X-Profile-Id: {profileId}` — validated by `apps/api/src/middlewares/profileContext.js`

The frontend wrapper at `apps/web/lib/api.ts` injects these from localStorage automatically.

### Multi-Profile System
A single user (email/password) can have multiple profiles (e.g., one per goal). All meals and favorites are scoped to the active profile. The `goal` field on Profile feeds the AI assistant its context without needing to ask the user each time.

### AI Chat Integration
- Frontend route handler: `apps/web/app/api/chat/route.ts`
- Sends conversation + active profile context to Gemini
- System prompt defined in `apps/web/lib/assistant/system-prompt.ts`
- Tools (fetching meals, profile, recipes) implemented in `apps/web/lib/assistant/tool-impl.ts`
- Chat history is stored per profile in React context (`ChatContext` inside `apps/web/lib/app-context.tsx`)

### Global State (`apps/web/lib/app-context.tsx`)
Single `AppProvider` wraps the app with five contexts:
- **ProfileContext** — logged-in user + active profile selection (persisted in localStorage)
- **MealContext** — meals for the selected date
- **WeightContext** — weight tracking records
- **ChatContext** — per-profile message history
- **UIContext** — drawer open/close state, selected calendar date

### Backend Routes
All routes live in `apps/api/src/index.js`:
- `POST /auth/register`, `POST /auth/login`
- `GET/POST/DELETE /profiles`
- `GET/POST /meals`, `DELETE /meals/:id`
- `GET /foods/search` (proxies USDA FDC API)
- `GET/POST /recipes`, `DELETE /recipes/:id`
- `POST/DELETE /recipes/:id/favorite`

### Database Schema (`apps/api/prisma/schema.prisma`)
`User → Profile → Meal → MealItem` (cascade deletes). `Recipe` belongs to a `Profile`. `Favorite` is a join between `Profile` and `Recipe`. All IDs are BigInt autoincrement.

## Environment Variables

**Backend** (`apps/api/.env`):
```
PORT=4000
DATABASE_URL=mysql://root:root@localhost:3306/nutri_app
JWT_SECRET=super_secret_dev_key
USDA_API_KEY=<key>
```

**Frontend** (hosting environment or `.env.local`):
```
GEMINI_API_KEY=<key>
GEMINI_MODEL=gemini-2.5-flash   # optional override
```
