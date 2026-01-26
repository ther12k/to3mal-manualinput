# TO3 Postgate - Implementation Notes

This document contains API flow documentation and implementation notes for the PostGate manual input application.

## Current Implementation Flow

The actual implemented flow differs from the original design. Here's the current state:

### Implemented Transaction Flow

```
User Input: TR ID + Gate Selection
          ↓
1. GetEticketByTransaction(trxID, laneID)
   → Returns array of etickets (PostGateEticketItem[])
   → Each eticket contains: container, reqno, code, data (gatepass)
          ↓
2. GetTransaction(gatepass from first eticket)
   → Validates transaction exists in backend
   → Retrieves: ENTRYWEIGHT, ENTRYLANENAME, TRUCKID, NOPOL, etc.
          ↓
    ┌─────────────────────────────────────────┐
    │ Transaction Found?                      │
    └─────────────────────────────────────────┘
          ↓                    ↓
       YES                    NO
          ↓                    ↓
┌───────────────────┐   ┌──────────────────┐
│ "review" state    │   │ "list" state     │
│ - Show tabs for   │   │ - Container cards│
│   multiple tickets│   │ - Modal for      │
│ - Show confirm    │   │   details        │
│   button          │   │ - NO confirm btn │
└───────────────────┘   └──────────────────┘
          ↓
3. TruckIN(transactionID, gatepassList, postgate=true)
   → Finalize gate-in process
   → Success: Show success screen, auto-reset after 3s
```

## API Endpoints

### Configuration

#### 1. Get All Lanes/Gates
```bash
POST /Configuration/GetAllLane?Apikey={key}
Content-Type: application/json

Response:
[
  {
    "id": 202,
    "name": "GATE-IN-01",
    "ip": "10.203.0.12",
    "transactiontype": "IN"  // Filtered for IN gates only
  }
]
```

#### 2. Login (Validate API Key)
```bash
POST /Configuration/Login?Apikey={key}
Content-Type: application/json
Body: { "username": "user", "password": "pass" }

Response:
{
  "state": 0,          // 0 = success
  "message": "Success"
}
```

### Transaction

#### 3. Get Eticket By Transaction
```bash
POST /Transaction/GetEticketByTransaction?Apikey={key}&transactionId={id}&laneId={laneId}

Response:
{
  "state": 0,
  "item": [
    {
      "id": 123,
      "transactionid": 1441611,
      "laneid": 202,
      "container": "CMAU1111111",
      "reqno": "REQ001",
      "code": "I",
      "type": "IN",
      "media": "picture1",
      "data": "-1|T3I|TOSNUS|CMAU1111111|..." // gatepass
    }
  ]
}
```

#### 4. Get Transaction By Gatepass
```bash
POST /Transaction/GetTransaction?Apikey={key}&gatepass={gatepass}

Response (Success):
{
  "state": 0,
  "item": {
    "ID": 12345,
    "TERMINAL": "T3I",
    "TRUCKID": "TRK001",
    "NOPOL": "B 1234 ABC",
    "CONTAINER": "CMAU1111111",
    "ENTRYLANEID": 202,
    "ENTRYLANENAME": "GATE-IN-01",
    "ENTRYSTARTTIME": "2026-01-26T10:00:00",
    "ENTRYWEIGHT": 25000,
    "ENTRYFINISHTIME": "2026-01-26T10:05:00",
    "ENTRYELAPSEDTIME": 300,
    "COMPLETE": 0
  }
}

Response (Not Found - New Transaction):
{
  "state": 1,
  "message": "Transaction not found"
}
```

#### 5. TruckIN (Finalize Gate-In)
```bash
POST /Transaction/TruckIN?ApiKey={key}
Content-Type: application/json
Body: {
  "transactionID": 1441611,
  "laneID": 202,
  "truckID": "TOSNUS",              // From reqno or container
  "nopol": "CMAU1111111",           // Container or code
  "postgate": true,
  "mediaScan": "picture1^I",        // media^code
  "gatepassList": ["-1|T3I|TOSNUS|CMAU1111111|..."]
}

Response:
{
  "state": 0,
  "message": "Success",
  "cms": {...},
  "bcData": {...}
}
```

### Inspection (Not Currently Used)

#### 6. Check Inspection
```bash
POST /Transaction/CheckInspection?ApiKey={key}
Content-Type: application/json
Body: {
  "transactionID": 1441611,
  "laneID": 202,
  "gatepass": "-1|T3I|TOSNUS|CMAU1111111|...",
  "eticketstring": "optional"
}

Response:
{
  "state": 0,
  "truckId": "TRK001",
  "nopol": "B 1234 ABC",
  "containers": [
    {
      "containerId": "CMAU1111111",
      "idTrx": "TRX001",
      "sealNumber": "SEAL001",
      "weight": "25000"
    }
  ]
}
```

### Weight Update (Optional)

#### 7. Update Entry Transaction Weight
```bash
POST /Transaction/UpdateEntryTransactionForWeight?Apikey={key}&id={id}&weight={weight}

Response:
{
  "state": 0,
  "message": "Weight updated",
  "item": null
}
```

## Form States

### State Machine

```typescript
type FormState =
  | "search"    // Initial: show search form
  | "review"    // Transaction found: show details + confirm button
  | "list"      // Etickets found but transaction not found: show container cards
  | "success"   // Gate-in confirmed: show success message
  | "error";    // Error state: show error message
```

### State Transitions

```
"search" ──┬──→ "review"   (transaction found)
           ├──→ "list"     (etickets found, transaction not found)
           └──→ "error"    (API error or no etickets)

"review" ──┬──→ "success"  (TruckIN successful)
           └──→ "error"    (TruckIN failed)

"list" ────→ "search"    (back button)

"success" ──→ "search"    (auto-reset after 3s)

"error" ───→ "search"    (back button or auto-retry)
```

## URL Routing

### Query Parameters

```
/postgate?trid=1441611&gateId=202
```

- `trid`: Transaction ID (string)
- `gateId`: Lane/Gate ID (number, parsed as int)

### Behavior

1. **On Mount**: Check URL for `trid` and `gateId`
2. **If Present**: Auto-fill form and trigger search
3. **On Search**: Update URL with current values
4. **On Reset**: Clear URL parameters

## Component Structure

### PostGatePage.tsx

```typescript
// State
const [formState, setFormState] = useState<FormState>("search");
const [trxId, setTrxId] = useState("");
const [selectedGate, setSelectedGate] = useState<number>(0);
const [gates, setGates] = useState<Lane[]>([]);
const [etickets, setEtickets] = useState<PostGateEticketItem[]>([]);
const [selectedEticketIndex, setSelectedEticketIndex] = useState(0);
const [transaction, setTransaction] = useState<PostGateTransaction | null>(null);
const [selectedEticketForModal, setSelectedEticketForModal] = useState<PostGateEticketItem | null>(null);

// Effects
useEffect(() => {
  // Fetch gates on mount
}, []);

useEffect(() => {
  // Check URL for trid and gateId on mount
}, [searchParams]);

// Handlers
const handleSearch = async (searchTrxId?: string) => { ... };
const handleConfirmGateIn = async () => { ... };
```

## Key Implementation Details

### 1. Multiple Etickets with Tabs

When `etickets.length > 1`:
- Render tab buttons for each eticket
- Tab label: `et.container || \`Ticket ${index + 1}\``
- Click tab → update `selectedEticketIndex`
- Show details for selected eticket

### 2. Container List View

When transaction not found but etickets exist:
- Show "list" state instead of "review"
- Render cards for each eticket with:
  - Container number
  - Request number
  - Code
  - "View Details" button
- Click card or button → open modal with full details
- **NO confirm button** (transaction not ready)

### 3. Modal for Eticket Details

Dialog modal shows:
- Container
- Request No
- Transaction ID
- Lane ID
- Code
- Type
- Media
- Eticket Data (full gatepass string, monospace)

### 4. Conditional Confirm Button

```typescript
{transaction && (
  <Button onClick={handleConfirmGateIn}>
    CONFIRM GATE-IN
  </Button>
)}
```

Only shows when `transaction` is not null (i.e., GetTransaction succeeded).

### 5. Auto-Reset After Success

After successful TruckIN:
- Show success screen
- Wait 3 seconds
- Reset to "search" state
- Clear all form data
- Clear URL parameters

## Authentication

### Login Flow

1. User enters API key (no username/password required initially)
2. Frontend calls `/Configuration/Login?Apikey={key}` with dummy credentials
3. If `state === 0`, store credentials in localStorage:
   - `localStorage.setItem("apikey", key)`
   - `localStorage.setItem("token", "authenticated")`
   - `localStorage.setItem("username", username || "User")`
4. Redirect to home page

### Persistence Check

On app mount, AuthContext checks:
```typescript
const token = localStorage.getItem("token");
const apikey = localStorage.getItem("apikey");
const username = localStorage.getItem("username") || "User";

if (token && apikey) {
  setUser({ id: 0, username, role: "User" });
}
```

**Important**: Only `token` and `apikey` are required. Username has default value to prevent empty string from failing the check.

### Logout

Clears localStorage:
```typescript
localStorage.removeItem("apikey");
localStorage.removeItem("token");
localStorage.removeItem("username");
```

## TypeScript Types

### Key Interfaces

```typescript
// API Response Wrapper
interface ApiResponse<T> {
  state: number;
  item?: T;
  message?: string;
}

// Lane/Gate
interface Lane {
  id: number;
  name: string;
  ip: string;
  transactiontype: "IN" | "OUT";
}

// Eticket Item
interface PostGateEticketItem {
  id: number;
  transactionid: number;
  laneid: number;
  container: string;
  reqno: string;
  code: string;
  type: string;
  media: string;
  data: string;  // gatepass
}

// Transaction
interface PostGateTransaction {
  ID: number;
  DATETIME: string;
  TERMINAL: string;
  TRUCKID: string;
  NOPOL: string;
  CONTAINER: string;
  ENTRYLANEID: number;
  ENTRYLANEIP: string;
  ENTRYLANENAME: string;
  ENTRYSTARTTIME: string;
  ENTRYPICTURE: number;
  ENTRYWEIGHT: number;
  ENTRYFINISHTIME: string;
  ENTRYELAPSEDTIME: number;
  ENTRYSTATUS: string;
  ENTRYPRINT: string;
  // ... exit fields may be null
  POSTGATETIME: string | null;
  COMPLETE: number;
}
```

## Deployment

### Local Development

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

### Production Build

```bash
pnpm build        # Creates dist/
```

### Docker Deployment (Volume-Based)

```bash
# On server
docker-compose up -d

# View logs
docker logs -f to3mal-postgate

# Restart (only needed for nginx.conf changes)
docker restart to3mal-postgate
```

### Fast Deploy Script

```bash
./deploy.sh
```

This script:
1. Builds locally (`pnpm build`)
2. Archives `dist/` to `dist.tar.gz`
3. Uploads to server via SSH
4. Extracts and replaces on server
5. No container restart needed (volume mount)

## Known Behaviors

### When GetTransaction Fails

If `GetTransaction` returns an error or `state !== 0`:
1. Set `transaction` to `null`
2. Set `weight` to `0`
3. Set `formState` to `"list"`
4. Show container cards instead of review form
5. **Do not show confirm button**

This is intentional - the transaction must exist in the backend before allowing gate-in confirmation.

### When GetEticketByTransaction Fails

If `GetEticketByTransaction` returns `state !== 0` or empty `item`:
1. Show error message: "No etickets found for this transaction"
2. Set `formState` to `"error"`
3. User can try again or go back

### When TruckIN Fails

If `TruckIN` returns `state !== 0`:
1. Show error message from `response.message`
2. Set `formState` to `"error"`
3. User can retry or go back

## Future Enhancements

### Potential Features
- [ ] Weight editing (currently read-only from transaction)
- [ ] Bulk processing (multiple transactions at once)
- [ ] Transaction history/search log
- [ ] Print ticket generation
- [ ] Camera integration for container OCR
- [ ] Real-time transaction updates via WebSocket

### Technical Debt
- [ ] Extract custom hooks for API calls
- [ ] Add error boundary component
- [ ] Implement proper loading skeleton UI
- [ ] Add unit tests for components
- [ ] Add E2E tests for full flow
