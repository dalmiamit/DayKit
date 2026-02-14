# Daykit

## Overview

Daykit is a minimal habit and task tracking application designed to help users build consistent daily rituals and manage their to-dos. The app emphasizes simplicity and clarity over gamification, providing a calm interface for tracking habits, managing tasks, and visualizing progress through a calendar view.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with custom theme configuration and CSS variables for theming
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Animations**: Framer Motion for subtle, calm animations
- **Forms**: React Hook Form with Zod for validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful endpoints defined in shared/routes.ts with Zod schemas for type-safe request/response validation
- **Build System**: Vite for frontend bundling, esbuild for server bundling

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: shared/schema.ts contains all database table definitions
- **Data Model**: Unified `items` table with type field (todo | habit | event), `item_completions` for habit tracking. Items have scheduling fields: `scheduledDate`, `scheduledTime`, `flexible` (boolean for weekend scheduling), `deadlineDate` (for "within X days" deadlines)
- **Migrations**: Drizzle Kit for database migrations (stored in /migrations)

### Authentication
- **Providers**: Firebase Auth (Google sign-in, passwordless email) with Replit Auth fallback
- **Firebase**: Client SDK in `client/src/lib/firebase.ts`, Admin SDK in `server/firebase-auth.ts`
- **Session Management**: Express sessions with connect-pg-simple for PostgreSQL session storage
- **User ID Prefixing**: Firebase users prefixed with `firebase:` to avoid collision with Replit Auth users
- **User Storage**: Users table managed by auth integration (shared/models/auth.ts)

### Typography
- **Primary Font**: Outfit (loaded via Google Fonts)
- **Font Stack**: Outfit, system-ui, -apple-system, sans-serif

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/  # UI components (shadcn/ui based)
│       ├── hooks/       # Custom React hooks
│       ├── pages/       # Route pages
│       └── lib/         # Utilities
├── server/           # Express backend
│   ├── replit_integrations/auth/  # Auth handling
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Database operations
│   └── db.ts         # Database connection
├── shared/           # Shared code between client/server
│   ├── schema.ts     # Drizzle database schemas
│   ├── routes.ts     # API route type definitions
│   └── models/       # Shared type definitions
└── migrations/       # Database migrations
```

### Key Design Patterns
- **Shared Types**: Route definitions and schemas are shared between frontend and backend via the shared/ directory
- **Type-safe API**: Zod schemas validate both API inputs and outputs
- **Protected Routes**: Authentication middleware guards API endpoints
- **Optimistic Updates**: React Query handles optimistic UI updates for better UX

## External Dependencies

### Database
- **PostgreSQL**: Primary database accessed via DATABASE_URL environment variable
- **Session Storage**: PostgreSQL-backed session storage using connect-pg-simple

### Authentication
- **Replit Auth**: OIDC-based authentication using Replit's identity provider
- **Required Environment Variables**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `SESSION_SECRET`: Secret for signing sessions
  - `ISSUER_URL`: OIDC issuer (defaults to https://replit.com/oidc)
  - `REPL_ID`: Replit deployment identifier

### Frontend Libraries
- **Radix UI**: Accessible UI primitives (dialogs, dropdowns, tooltips, etc.)
- **date-fns**: Date formatting and manipulation for habit tracking
- **react-day-picker**: Calendar component for date selection
- **Framer Motion**: Animation library for UI transitions

### Development Tools
- **Vite**: Frontend development server with HMR
- **Drizzle Kit**: Database migration tooling
- **TSX**: TypeScript execution for development