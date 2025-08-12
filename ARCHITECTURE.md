# CardGenius Architecture Documentation

## Project Overview
CardGenius is a full-stack web application for credit card generation and validation, built with Node.js/Express backend and React frontend using Vite as the build tool.

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript (ESM modules)
- **Framework**: Express.js
- **Session Management**: express-session with Redis store (connect-redis)
- **Security**: Helmet, CSRF protection (csurf), rate limiting, XSS protection
- **Database**: PostgreSQL via Drizzle ORM
- **Real-time**: WebSocket support (ws)

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: React Query (TanStack Query)
- **UI Components**: Radix UI primitives with Tailwind CSS
- **Build Tool**: Vite
- **Forms**: React Hook Form with Zod validation

## Project Structure

```
/opt/cardgenius/
├── client/                 # Frontend React application
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── hooks/         # Custom React hooks
│       ├── lib/           # Utilities (queryClient, cache, csrf, sanitize)
│       ├── pages/         # Page components (generator, etc.)
│       ├── services/      # API service layer
│       └── workers/       # Web Workers for background processing
├── server/                # Backend Express application
│   ├── index.ts          # Main server entry point
│   ├── routes.ts         # API route definitions
│   ├── middleware/       # Express middleware
│   │   ├── csrf.ts       # CSRF protection
│   │   ├── errorHandler.ts # Global error handling
│   │   ├── rateLimit.ts # Rate limiting with Redis
│   │   └── session.ts    # Session management
│   ├── gateways/         # Payment gateway integrations
│   └── binDatabase.ts    # BIN database operations
├── shared/               # Shared types and schemas
├── tests/                # Test suites
└── dist/                 # Production build output
```

## Key Routes & Endpoints

### API Routes (`/api/*`)
- `GET /api/csrf-token` - Fetch CSRF token for protected operations
- `POST /api/generate-cards` - Generate credit card numbers with validation
- `GET /api/bins` - Retrieve BIN (Bank Identification Number) information
- `POST /api/payment-gateway/:gateway/test` - Test payment gateway integration

### Application Routes
- `/` - Main application entry
- `/generator` - Card generation interface

## Session Management
- **Store**: Redis-backed sessions via connect-redis
- **Configuration**: Secure cookies with httpOnly, sameSite, and secure flags
- **Session Validation**: Middleware validates and refreshes sessions automatically
- **Redis Connection**: Uses ioredis client with connection pooling

## Build Process

### Development
```bash
npm run dev  # Runs tsx server/index.ts with NODE_ENV=development
```

### Production Build
```bash
npm run build  # Vite builds frontend + esbuild compiles server
npm run start  # Runs compiled dist/index.js with NODE_ENV=production
```

### Database
```bash
npm run db:push  # Pushes Drizzle schema to database
```

## External Resources & Dependencies

### Critical External Services
1. **Redis** - Session storage and rate limiting (Currently failing - needs fix)
2. **PostgreSQL** - Main application database
3. **PM2** - Process management in production

### JavaScript Entry Points
- **Server**: `server/index.ts` - Main Express server
- **Client**: `client/src/main.tsx` - React app entry
- **Workers**: `client/src/workers/` - Background processing workers

## Security Features
- **Helmet.js** - Security headers including CSP
- **CSRF Protection** - Token-based CSRF prevention
- **Rate Limiting** - Redis-backed request throttling
- **Input Sanitization** - DOMPurify for XSS prevention
- **Session Security** - Secure cookie configuration
- **Input Validation** - Zod schemas for type-safe validation

## Current Issues
1. **Redis Connection Failure** - Sessions and rate limiting are impacted
2. **PM2 Process Restarts** - Application is restarting frequently (14 restarts in 2 hours)

## Deployment
- Deployment scripts available in root directory:
  - `update-cardgenius.sh` - Update deployment
  - `rollback-cardgenius.sh` - Rollback to previous version
  - `monitor-cardgenius.sh` - Monitor application health
- GitHub Actions workflow configured for CI/CD
- Cloudflare integration documented in `CLOUDFLARE-SECURITY.md`

## Configuration Files
- `.env` - Environment variables (Redis URL, Database URL, etc.)
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `drizzle.config.ts` - Database ORM configuration

## Testing Infrastructure
- Unit tests with Jest
- Test scripts for various features:
  - `test-csrf.sh` - CSRF protection testing
  - `test-session.sh` - Session management testing
  - `test-rate-limit.sh` - Rate limiting testing
  - `test-validation.sh` - Input validation testing
  - `test-payment-gateway.js` - Payment gateway integration testing

---
*Last Updated: Phase 0 - Security & Performance Refactor*
