Here's what you need for the Web App PostGate:

  Web App Flow

  ┌─────────────────────────────────────────────────────────────┐
  │                    WEB POSTGATE APP                          │
  └─────────────────────────────────────────────────────────────┘

  User Input: TR ID + Gate (optional)
          ↓
  ┌──────────────────────────────────────────────────────────┐
  │ 1. GetTransaction(trxID)                                  │
  │    → Fetch transaction details                            │
  │    → Show: Container, Truck, License, Weight             │
  └──────────────────────────────────────────────────────────┘
          ↓
  ┌──────────────────────────────────────────────────────────┐
  │ 2. CheckInspection(transactionID, laneID, gatepass)      │
  │    → Verify inspection status                            │
  │    → Show container details                              │
  └──────────────────────────────────────────────────────────┘
          ↓
  ┌──────────────────────────────────────────────────────────┐
  │ User Review Screen                                        │
  │ → Show all transaction data                              │
  │ → Allow weight edit (optional)                           │
  │ → "CONFIRM GATE-IN" button                               │
  └──────────────────────────────────────────────────────────┘
          ↓
  ┌──────────────────────────────────────────────────────────┐
  │ 3. TruckIN(transactionID, gatepassList, postgate=true)  │
  │    → Finalize gate-in                                    │
  │    → Return: Success + Ticket/Print data                 │
  └──────────────────────────────────────────────────────────┘

  ---
  API Endpoints to Call

  1. Get Transaction

  GET /api/transaction?gatepass={trxID}
  Authorization: apikey {token}

  Response:
  {
    "state": 0,
    "item": {
      "id": 12345,
      "gatepass": "CMAU1111111|...",
      "truckid": "TRK001",
      "nopol": "B 1234 ABC",
      "entryweight": 25000,
      "entrylanename": "GATE-IN-01",
      "container": "CMAU1111111"
    }
  }

  ---
  2. Check Inspection

  POST /api/inspection/check
  Authorization: apikey {token}
  Content-Type: application/json

  {
    "transactionID": 12345,
    "laneID": 1,
    "gatepass": "CMAU1111111|..."
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

  ---
  3. TruckIN (Finalize)

  POST /api/truckin
  Authorization: apikey {token}
  Content-Type: application/json

  {
    "transactionID": 12345,
    "laneID": 1,
    "truckID": "TRK001",
    "nopol": "B 1234 ABC",
    "gatepassList": ["CMAU1111111|..."],
    "postgate": true
  }

  Response:
  {
    "state": 0,
    "message": "Success",
    "cms": {...},
    "bcData": {...}
  }

  ---
  Optional: Update Weight

  POST /api/transaction/weight
  Authorization: apikey {token}
  Content-Type: application/json

  {
    "id": 12345,
    "weight": 26000
  }

  ---
  Web UI Mockup

  ┌─────────────────────────────────────────────────────────┐
  │                 POSTGATE GATE-IN                         │
  ├─────────────────────────────────────────────────────────┤
  │                                                         │
  │  Transaction ID:  [________________] [Search]           │
  │  Gate (Optional):  [GATE-IN-01    ▼]                   │
  │                                                         │
  ├─────────────────────────────────────────────────────────┤
  │                                                         │
  │  Container:     CMAU1111111                            │
  │  Truck ID:      TRK001                                 │
  │  License:       B 1234 ABC                             │
  │  Weight:        25000 kg  [Edit]                       │
  │  Lane:          GATE-IN-01                             │
  │                                                         │
  │  Containers:                                            │
  │  ☑ CMAU1111111  | I  | SEAL001 | 25000 kg             │
  │                                                         │
  │                                                         │
  │  [  CONFIRM GATE-IN  ]                                  │
  │                                                         │
  └─────────────────────────────────────────────────────────┘

  ---