# Secure Centralized EV Charging Payment Gateway

This is a Streamlit web app version of the EV charging project. It includes:

- EV Owner registration
- Franchise registration
- Encrypted QR payload generation for stations
- Payment processing through a centralized grid
- Blockchain ledger logging
- Refund block creation on simulated hardware failure
- Toy quantum breach simulation for RSA-style public-key exchange

## Project structure

```text
app.py
core/
  __init__.py
  utils.py
  crypto_utils.py
  models.py
  blockchain.py
  services.py
data/
requirements.txt
README.md
```

## Setup

### Windows PowerShell

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run app.py
```

### macOS / Linux

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

## Notes

- If `ascon` is not installed, the app falls back to a very simple reversible demo cipher so the UI still works.
- The quantum page is an educational toy demo. It is not a real scalable Shor implementation.
- App data is stored in `data/ev_gateway.json`.
- Generated QR images are stored in `data/qr_codes/`.

## Demo flow

1. Register an EV owner.
2. Register a franchise.
3. Generate a station QR payload from the Franchise page.
4. Open Charging Session and paste or auto-fill the encrypted payload.
5. Enter VMID, PIN, and amount.
6. View balances and the blockchain in Grid Authority.
7. Run Quantum Demo to show the toy RSA breach.
