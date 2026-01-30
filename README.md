# TO3 Postgate - Manual Input Application

A React + TypeScript web application for manual PostGate transaction processing at TO3MAL terminal. Allows operators to manually confirm gate-in transactions when automated systems are unavailable.

## Features

- **API Key Authentication**: Secure authentication using API keys
- **Transaction Search**: Search transactions by Transaction ID with URL parameters support
- **Multiple Etickets Support**: Tabbed view for handling multiple containers per transaction
- **Transaction Validation**: Only allows confirmation when transaction record exists
- **Container List View**: Shows containers in cards when transaction details not found
- **Modal Details**: View full eticket information in a modal dialog
- **Docker Deployment**: Volume-based deployment for fast updates
- **Responsive UI**: Dark theme built with shadcn/ui components

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS v4
- **Routing**: React Router v7
- **Deployment**: Docker, nginx:alpine
- **Backend API**: TO3MAL AGTOSNUS API (183.91.69.74)

## Project Structure

```
to3mal-manualinput/
├── src/
│   ├── components/
│   │   └── ui/              # shadcn/ui components
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication context
│   ├── lib/
│   │   └── api/
│   │       └── client.ts    # API client with endpoints
│   ├── pages/
│   │   ├── PostGate/
│   │   │   └── PostGatePage.tsx
│   │   └── LoginPage.tsx
│   ├── types/
│   │   └── index.ts         # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   └── todos.md             # API flow documentation
├── nginx.conf               # nginx configuration
├── Dockerfile               # Production Dockerfile
├── docker-compose.yml       # Docker compose configuration
└── deploy.sh                # Fast deployment script
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Docker (for deployment)

### Local Development

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env` file:
```env
VITE_API_BASE_URL=/api
```

3. Start development server:
```bash
pnpm dev
```

4. Build for production:
```bash
pnpm build
```

### Docker Deployment

The application uses a volume-based deployment strategy - only the `dist` folder needs to be synced, no image rebuild required.

#### Quick Deploy (Server)

1. Build locally:
```bash
pnpm build
```

2. Run deploy script (from local machine):
```bash
./deploy.sh
```

This will:
- Build the project locally
- Archive the `dist` folder
- Upload to server via SSH
- Extract and replace files on server
- Container picks up new files immediately (no restart needed)

#### Manual Deploy

1. Start container:
```bash
docker-compose up -d
```

2. View logs:
```bash
docker logs -f to3mal-postgate
```

3. Restart container:
```bash
docker restart to3mal-postgate
```

## Application Flow

### PostGate Transaction Flow

```
User Input: TR ID + Gate Selection
    ↓
1. GetTransactionByID(trxID)
   → Returns transaction details
   → Creates synthetic eticket from transaction data
    ↓
IF Transaction Found:
    → Show Review Screen with transaction details
    → User can confirm gate-in
ELSE:
    → Show Error Screen
    ↓
2. TruckIN(transactionID, gatepassList, postgate=true)
   → Finalize gate-in process
```

### URL Parameters

The app supports URL parameters for direct transaction access:

```
/postgate?trid=1441611&gateId=202
```

- `trid`: Transaction ID
- `gateId`: Lane/Gate ID

## API Endpoints

All endpoints require API key authentication via `Apikey` query parameter.

### Configuration

- `POST /Configuration/GetAllLane?Apikey={key}` - Get all lanes/gates
- `POST /Configuration/Login?Apikey={key}` - Validate credentials

### Transaction

- `POST /Transaction/GetTransactionByID?Apikey={key}&trId={id}` - Get transaction details by ID
- `POST /Transaction/TruckIN?Apikey={key}` - Finalize gate-in (postgate=true)

### Inspection

- `POST /Transaction/CheckInspection?ApiKey={key}` - Check inspection status (not used in current flow)

### Weight Update

- `POST /Transaction/UpdateEntryTransactionForWeight?Apikey={key}&id={id}&weight={weight}` - Update entry weight
- `POST /Transaction/UpdateWeight?Apikey={key}&id={id}&weight={weight}` - Alternative weight update

## Authentication

The app uses API key-based authentication:

1. User enters API key on login page
2. App validates by calling `/Configuration/Login` endpoint
3. On success, API key stored in localStorage
4. Subsequent API calls include API key in query parameters
5. Session persists across page refreshes

**Storage**: `localStorage.setItem("apikey", key)`

## Deployment

### Server Details

- **Server**: rizky@halotec.my.id
- **Remote Directory**: ~/to3mal
- **Deployed URL**: https://to3.halotec.my.id
- **Container Port**: 80 (mapped from host port 3000)

### nginx Configuration

nginx proxies API requests to the TO3MAL backend:

```nginx
location /api {
    proxy_pass http://183.91.69.74/AGTOSNUS_Prod/api;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    # CORS headers included
}
```

### Environment Variables

- `VITE_API_BASE_URL`: API base URL (default: `/api`)

## Testing

Run unit tests:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test --watch
```

## Troubleshooting

### 403 Forbidden Error

If you see 403 errors after deployment:
1. Check nginx.conf is correctly mounted
2. Restart container: `docker restart to3mal-postgate`
3. Ensure dist folder contains index.html

### Authentication Not Persisting

If login doesn't persist after refresh:
1. Check browser console for localStorage errors
2. Verify API key is being set correctly
3. Check AuthContext logic

### Gates Not Showing

If gate list is empty:
1. Check API key is valid
2. Verify GetAllLane endpoint is accessible
3. Check browser console for API errors

## License

Proprietary - TO3MAL Internal Use Only
