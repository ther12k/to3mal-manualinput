# TO3 Postgate - Claude Code Context

This document provides context for Claude Code AI assistant working on this project.

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

### Deployment
- `Dockerfile` - nginx:alpine with volume mount for dist
- `docker-compose.yml` - Container orchestration
- `nginx.conf` - nginx config with API proxy to 183.91.69.74
- `deploy.sh` - Fast deployment script (builds locally, syncs dist only)
- `.dockerignore` - Exclude node_modules, .git, etc.

## Deployment Workflow

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
- `dist` folder mounted as read-only volume
- No image rebuild needed for code changes
- Faster deployment (seconds vs minutes)
- Only nginx.conf changes require container restart

## Common Tasks

### Adding a New API Endpoint
1. Add TypeScript interface to `src/types/index.ts`
2. Add method to `api` object in `src/lib/api/client.ts`
3. Use `getApiKey()` helper for authentication
4. Return typed response

### Adding a New Page
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Update navigation if needed

### Styling Guidelines
- Use Tailwind utility classes
- Dark theme: `bg-slate-900`, `bg-slate-800`, `text-white`
- Accent colors: `bg-blue-600` (primary), `bg-green-600` (success)
- Use shadcn/ui components from `src/components/ui/`

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

### Unit Tests
```bash
pnpm test          # Run once
pnpm test --watch  # Watch mode
```

### Manual Testing Checklist
- [ ] Login with API key persists after refresh
- [ ] Gates load and display correctly
- [ ] Transaction search works with valid TR ID
- [ ] Multiple etickets show tabs
- [ ] Container list shows when transaction not found
- [ ] Modal opens with eticket details
- [ ] Confirm button only shows when transaction exists
- [ ] URL parameters work: `?trid=123&gateId=456`
- [ ] TruckIN API call succeeds

## Backend API Notes

### Authentication
- All endpoints require `Apikey` query parameter
- Login endpoint validates username/password against API key
- No session/token-based auth - API key is passed with every request

### Key Endpoints
```
POST /Configuration/GetAllLane?Apikey={key}
POST /Configuration/Login?Apikey={key}&body={username,password}

POST /Transaction/GetTransactionByID?Apikey={key}&trId={id}
POST /Transaction/TruckIN?Apikey={key}&body={transactionID,laneID,truckID,nopol,postgate,mediaScan,gatepassList}
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
  - In development: can be set to full backend URL

## Code Conventions

### TypeScript
- Use strict type checking
- Define interfaces in `src/types/index.ts`
- Use type assertions sparingly
- Prefer `unknown` over `any` for error handling

### React
- Use functional components with hooks
- Use TypeScript for props
- Keep components under 300 lines when possible
- Extract reusable logic to custom hooks

### Naming
- Components: PascalCase (`PostGatePage.tsx`)
- Functions: camelCase (`handleSearch`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Types/Interfaces: PascalCase (`LoginRequest`)

## Additional Resources

- [shadcn/ui Docs](https://ui.shadcn.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com/)
- [Vite Docs](https://vitejs.dev/)

## Project Status

- **Phase**: Production
- **Last Updated**: January 2026
- **Maintainer**: TO3MAL Team
