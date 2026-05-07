# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TO3 Postgate** is a React + TypeScript web application for manual PostGate transaction processing at TO3MAL terminal. It allows operators to manually confirm gate-in transactions when automated systems are unavailable.

- **Deployed URL**: https://to3.halotec.my.id
- **Server**: rizky@halotec.my.id (halotec password)
- **Remote Directory**: ~/to3mal
- **Backend API**: http://183.91.69.74/AGTOSNUS_Prod/api

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7
- **UI**: shadcn/ui (Radix UI primitives + Tailwind CSS v4)
- **Routing**: React Router v7
- **Deployment**: Docker with nginx:alpine (volume-based deployment)
- **Package Manager**: pnpm

## Key Architecture Decisions

### Authentication Flow
- **API Key-based**: User enters API key, validated against `/Configuration/Login` endpoint
- **localStorage Persistence**: token, apikey, username stored in browser
- **Default Username**: "User" stored when username is empty (prevents auth loss on refresh)
- **AuthContext**: Provides `login`, `logout`, `isAuthenticated`, `isAdmin` to app

### API Client Pattern (`src/lib/api/client.ts`)
- All API endpoints require `Apikey` query parameter
- Helper function `getApiKey()` retrieves from localStorage
- Uses standard `fetch` with error handling
- Returns typed responses matching backend structure

### PostGate Transaction Flow

```
1. User inputs Transaction ID + Gate selection
2. GetTransactionByID(trxID)
   → Returns PostGateTransaction with all details
   → Creates synthetic eticket from transaction data
   → Gets weight, container, truck details directly

Two paths:
- Transaction FOUND → Show "review" state with confirm button
- Transaction NOT FOUND → Show "error" state

3. TruckIN(transactionID, gatepassList, postgate=true)
   → Finalize gate-in
```

### URL Routing
- Supports query parameters: `?trid={trxId}&gateId={gateId}`
- Updates URL when searching
- Auto-searches if both params present on mount
- Clears URL when resetting

### Form States
- `"search"` - Initial search form
- `"review"` - Transaction found, show details + confirm button
- `"list"` - Etickets found but transaction not found, show container cards
- `"success"` - Gate-in confirmed
- `"error"` - Error state

## Important File Locations

### Core Application Files
- `src/App.tsx` - Main app with routes (/, /login, /postgate)
- `src/main.tsx` - App entry point
- `src/index.css` - Global styles + Tailwind directives

### Pages
- `src/pages/PostGate/PostGatePage.tsx` - Main transaction processing page (500+ lines)
- `src/pages/LoginPage.tsx` - API key login page

### Context & State
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/lib/api/client.ts` - API client with all endpoints

### Types
- `src/types/index.ts` - All TypeScript interfaces (LoginRequest, PostGateTransaction, PostGateEticketItem, etc.)

### UI Components
- `src/components/ui/` - shadcn/ui components (Button, Card, Dialog, Input, Label, Alert, Select)

### Layout & Navigation
- `src/components/Layout/AppLayout.tsx` - Main layout wrapper with bottom navigation
- `src/components/Layout/BottomNav.tsx` - Bottom navigation bar with Gate In, Customs, Gate Out, Profile, and Logout

### Pages
- `src/pages/PostGate/PostGatePage.tsx` - Main transaction processing page (500+ lines)
- `src/pages/Customs/CustomsPage.tsx` - Customs/AMS manual input page
- `src/pages/GateOut/GateOutPage.tsx` - Gate Out transaction page
- `src/pages/Login/` - Login page with API key authentication
- `src/pages/Profile/ProfilePage.tsx` - User profile page

### Deployment
- `Dockerfile` - nginx:alpine with volume mount for dist
- `nginx.conf` - nginx config with API proxy to 183.91.69.74
- `deploy.sh` - Fast deployment script (builds locally, syncs dist only)

## Deployment Workflow

### Development
```bash
pnpm dev              # Start dev server on port 3000
pnpm build            # Build for production
pnpm test             # Run tests with vitest
pnpm lint             # Run ESLint
```

### Fast Deploy (Recommended)
```bash
./deploy.sh
```

This script:
1. Builds locally (`pnpm build`)
2. Archives `dist` folder
3. Uploads via SSH to server
4. Extracts and replaces on server
5. Container picks up changes immediately (no restart needed)

### Why Volume-Based?
- `dist` folder mounted as read-only volume in container
- No image rebuild needed for code changes
- Faster deployment (seconds vs minutes)
- Only nginx.conf changes require container restart via `docker restart to3mal-postgate`

## Common Tasks

### Adding a New API Endpoint
1. Add TypeScript interface to `src/types/index.ts`
2. Add method to `api` object in `src/lib/api/client.ts`
3. Use `getApiKey()` helper for authentication
4. Return typed response

### Adding a New Page
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx` with ProtectedRoute wrapper
3. Add navigation item to `src/components/Layout/BottomNav.tsx`

### Styling Guidelines
- Use Tailwind utility classes
- Dark theme: `bg-slate-900`, `bg-slate-800`, `text-white`
- Accent colors: `bg-blue-600` (primary), `bg-green-600` (success)
- Use shadcn/ui components from `src/components/ui/`
- Use `@/` path alias for imports (configured in vite.config.ts)

## Known Issues & Solutions

### Issue: 403 Forbidden After Deploy
**Solution**: Restart container to pick up new nginx.conf
```bash
docker restart to3mal-postgate
```

### Issue: Auth Lost on Page Refresh
**Root Cause**: Empty username stored (falsy value)
**Solution**: Store default "User" when username empty, only check token+apikey

### Issue: Old Assets Served After Deploy
**Solution**: Restart container to clear cache
```bash
docker restart to3mal-postgate
```

## Testing

### Run Tests
```bash
pnpm test          # Run tests with vitest
```

### Manual Testing Checklist
- Login with API key persists after refresh
- Gates load and display correctly from GetAllLane endpoint
- Transaction search works with valid TR ID
- Multiple etickets show tabs
- Container list shows when transaction not found
- Modal opens with eticket details
- Confirm button only shows when transaction exists
- URL parameters work: `?trid=123&gateId=456`
- TruckIN API call succeeds
- Server status check displays warning if autogate mode or database down

## Backend API Notes

### Authentication
- All endpoints require `Apikey` query parameter
- Login endpoint validates username/password against API key
- API key stored in localStorage and passed with every request
- No session/token-based auth - uses API key authentication

### Key Endpoints
```
POST /Configuration/GetAllLane?Apikey={key}
POST /Configuration/Login?Apikey={key}&body={username,password}
POST /Configuration/CheckServerStatus?Apikey={key}

POST /Transaction/GetTransactionByID?Apikey={key}&trId={id}
POST /Transaction/TruckIN?Apikey={key}&body={transactionID,laneID,truckID,nopol,postgate,mediaScan,gatepassList}
POST /Transaction/InputManualAMS?Apikey={key}&transactionID={}&noReq={}&container={}&containerCombo={}
POST /Transaction/UpdateManualOUTAMS?Apikey={key}&transactionID={}&noReq={}&container={}&containerCombo={}
```

### Response Format
All responses follow this structure:
```typescript
{
  state: number,        // 0 = success, non-zero = error
  item?: T,            // Response data (on success)
  message?: string     // Error message (on failure)
}
```

## Git Workflow

### Commit Message Format
```
feat: add new feature
fix: fix bug
docs: update documentation
refactor: code refactoring
```

### Current Branch
- Default: `master`
- Deployed from: `master`

## Environment Variables

- `VITE_API_BASE_URL` - API base URL (default: `/api`)
  - In production: proxied through nginx to 183.91.69.74
  - In development: proxied through vite to http://localhost:8080
  - Can be set to full backend URL for local development

## nginx Configuration

The nginx config proxies API requests to the backend:
- `/api` → `http://183.91.69.74/AGTOSNUS_Prod/api`
- `/pictures` → `http://183.91.69.74/AGTOSNUS_Prod`
- All other routes serve static files from `/usr/share/nginx/html` with SPA fallback to index.html

## Code Architecture

### Authentication & Authorization
- API key-based authentication stored in localStorage
- AuthContext provides login, logout, isAuthenticated, isAdmin
- ProtectedRoute wrapper checks authentication before rendering pages
- PublicRoute wrapper redirects authenticated users away from login page
- Default username "User" stored when username empty (prevents auth loss on refresh)

### API Client Pattern
- Centralized API client in `src/lib/api/client.ts`
- All endpoints require `Apikey` query parameter (retrieved via `getApiKey()`)
- Standardized error handling with ApiError type
- Typed responses matching backend structure

### Routing & Navigation
- React Router v7 with BrowserRouter
- Protected routes: `/`, `/customs`, `/gateout`, `/profile`
- Public routes: `/login`
- Bottom navigation component for mobile-friendly navigation
- URL state support for query parameters

### Theme Management
- ThemeProvider context with dark/light/system theme support
- Default dark theme for terminal operations
- Theme persisted in localStorage

### Form Handling
- React Hook Form for form state management
- Zod schemas for validation
- Sonner for toast notifications

## Additional Resources

- [shadcn/ui Docs](https://ui.shadcn.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com/)
- [Vite Docs](https://vitejs.dev/)

## Code Conventions

### TypeScript
- Use strict type checking
- Define interfaces in `src/types/index.ts`
- Use type assertions sparingly
- Prefer `unknown` over `any` for error handling
- Use `@/` path alias for imports (e.g., `@/types`, `@/lib/api/client`)

### React
- Use functional components with hooks
- Use TypeScript for props
- Keep components under 300 lines when possible
- Extract reusable logic to custom hooks
- Use React Router v7 for navigation (useNavigate, useLocation)

### Naming
- Components: PascalCase (`PostGatePage.tsx`)
- Functions: camelCase (`handleSearch`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Types/Interfaces: PascalCase (`LoginRequest`)

## Git Workflow

### Commit Message Format
```
feat: add new feature
fix: fix bug
docs: update documentation
refactor: code refactoring
```

### Current Branch
- Default: `master`
- Deployed from: `master`

## Project Status

- **Phase**: Production
- **Last Updated**: January 2026
- **Maintainer**: TO3MAL Team
