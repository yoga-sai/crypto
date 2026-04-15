# Secure Centralized EV Charging Payment Gateway

This project now combines:

- `backend/`: the real EV gateway logic, crypto utilities, blockchain ledger, refund flow, and quantum breach demo
- `frontend/`: the polished React UI connected to the live backend API

## Run the final integrated project

Open two terminals from the project root.

### Terminal 1: start the Python backend API

```powershell
cd backend
python api_server.py
```

The API runs on `http://127.0.0.1:8000`.

### Terminal 2: start the React frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend runs on `http://127.0.0.1:8080` and proxies `/api` requests to the backend.

## Available modules

- Dashboard
- Grid Authority registration and audit console
- Charging Kiosk with real QR payload generation and payment processing
- Blockchain Ledger viewer
- Quantum Vulnerability demo using the backend RSA/Shor simulation

## Verification completed

- Python API import and state serialization smoke test
- Live backend payment flow test including blockchain update and refund path
- Frontend production build with Vite
