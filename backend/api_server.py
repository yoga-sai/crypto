from __future__ import annotations

import json
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from core.crypto_utils import ASCON_AVAILABLE
from core.services import EVGateway, PROVIDERS


_gateway: EVGateway | None = None


def get_gateway() -> EVGateway:
    global _gateway
    if _gateway is None:
        gateway = EVGateway()
        gateway.seed_demo_data()
        _gateway = gateway
    return _gateway


def serialize_user(user) -> dict[str, Any]:
    return {
        "uid": user.uid,
        "name": user.name,
        "mobile": user.mobile,
        "vmid": user.vmid,
        "balance": user.balance,
        "zone_code": user.zone_code,
        "provider": user.provider,
        "created_at": user.created_at,
        "active": user.active,
    }


def serialize_franchise(franchise) -> dict[str, Any]:
    return {
        "fid": franchise.fid,
        "name": franchise.name,
        "balance": franchise.balance,
        "zone_code": franchise.zone_code,
        "provider": franchise.provider,
        "created_at": franchise.created_at,
        "active": franchise.active,
    }


def serialize_block(block) -> dict[str, Any]:
    transaction = block.transaction or {}
    return {
        "index": block.index,
        "transaction_id": block.transaction_id,
        "previous_hash": block.previous_hash,
        "timestamp": block.timestamp,
        "status": block.status,
        "dispute": block.dispute,
        "reason": block.reason,
        "block_hash": block.block_hash,
        "transaction": transaction,
        "vmid": transaction.get("vmid", ""),
        "fid": transaction.get("fid", ""),
        "user_name": transaction.get("user_name", ""),
        "franchise_name": transaction.get("franchise_name", ""),
        "amount": transaction.get("amount", 0),
    }


def build_state(gateway: EVGateway) -> dict[str, Any]:
    return {
        "providers": PROVIDERS,
        "users": [serialize_user(user) for user in gateway.users.values()],
        "franchises": [serialize_franchise(franchise) for franchise in gateway.franchises.values()],
        "blockchain": [serialize_block(block) for block in gateway.blockchain.chain],
        "audit_log": gateway.audit_log,
        "summary": {
            "chain_valid": gateway.blockchain.verify_chain(),
            "ascon_available": ASCON_AVAILABLE,
            "db_path": str(Path(gateway.db_path).resolve()),
        },
    }


class EVGatewayAPIHandler(BaseHTTPRequestHandler):
    server_version = "EVGatewayAPI/1.0"

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self._send_common_headers()
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._send_json({"ok": True})
            return
        if parsed.path == "/api/state":
            self._send_json(build_state(get_gateway()))
            return
        self._send_error_json(HTTPStatus.NOT_FOUND, "Endpoint not found.")

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        body = self._read_json_body()
        gateway = get_gateway()

        try:
            if parsed.path == "/api/users":
                required = ["name", "password", "mobile", "pin", "balance", "zone_code", "provider"]
                self._require_fields(body, required)
                user = gateway.register_user(
                    body["name"].strip(),
                    body["password"],
                    body["mobile"].strip(),
                    body["pin"].strip(),
                    float(body["balance"]),
                    body["zone_code"],
                    body["provider"],
                )
                self._send_json({"user": serialize_user(user), "state": build_state(gateway)}, status=HTTPStatus.CREATED)
                return

            if parsed.path == "/api/franchises":
                required = ["name", "password", "balance", "zone_code", "provider"]
                self._require_fields(body, required)
                franchise = gateway.register_franchise(
                    body["name"].strip(),
                    body["password"],
                    float(body["balance"]),
                    body["zone_code"],
                    body["provider"],
                )
                self._send_json(
                    {"franchise": serialize_franchise(franchise), "state": build_state(gateway)},
                    status=HTTPStatus.CREATED,
                )
                return

            if parsed.path == "/api/station-qr":
                self._require_fields(body, ["fid"])
                qr_info = gateway.create_station_qr(body["fid"])
                self._send_json(
                    {
                        "payload": qr_info["payload"],
                        "fid": qr_info["fid"],
                        "franchise_name": qr_info["franchise_name"],
                        "file_path": str(Path(qr_info["file_path"]).resolve()),
                    }
                )
                return

            if parsed.path == "/api/payments":
                required = ["encrypted_payload", "vmid", "pin", "amount"]
                self._require_fields(body, required)
                chain_length_before = len(gateway.blockchain.chain)
                result = gateway.process_payment(
                    body["encrypted_payload"],
                    body["vmid"].strip(),
                    body["pin"].strip(),
                    float(body["amount"]),
                )
                new_blocks = gateway.blockchain.chain[chain_length_before:]
                self._send_json(
                    {
                        "result": result,
                        "blocks_added": [serialize_block(block) for block in new_blocks],
                        "state": build_state(gateway),
                    }
                )
                return

            if parsed.path == "/api/quantum-demo":
                vmid = str(body.get("vmid", "")).strip()
                if not vmid:
                    if not gateway.users:
                        self._send_error_json(HTTPStatus.BAD_REQUEST, "Register a user before running the quantum demo.")
                        return
                    vmid = next(iter(gateway.users))
                user = gateway.users.get(vmid)
                if user is None:
                    self._send_error_json(HTTPStatus.NOT_FOUND, "User not found for quantum demo.")
                    return
                demo = gateway.quantum_breach_demo(user.vmid, user.pin)
                self._send_json({"demo": demo, "user": serialize_user(user)})
                return

            if parsed.path == "/api/reset":
                gateway.reset()
                gateway.seed_demo_data()
                self._send_json({"state": build_state(gateway)})
                return

            self._send_error_json(HTTPStatus.NOT_FOUND, "Endpoint not found.")
        except ValueError as exc:
            self._send_error_json(HTTPStatus.BAD_REQUEST, str(exc))
        except Exception as exc:
            self._send_error_json(HTTPStatus.INTERNAL_SERVER_ERROR, str(exc))

    def log_message(self, format: str, *args: Any) -> None:
        return

    def _send_common_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Type", "application/json; charset=utf-8")

    def _send_json(self, payload: dict[str, Any], status: HTTPStatus = HTTPStatus.OK) -> None:
        encoded = json.dumps(payload, ensure_ascii=True).encode("utf-8")
        self.send_response(status)
        self._send_common_headers()
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_error_json(self, status: HTTPStatus, message: str) -> None:
        self._send_json({"error": message}, status=status)

    def _read_json_body(self) -> dict[str, Any]:
        content_length = int(self.headers.get("Content-Length", "0") or "0")
        if content_length == 0:
            return {}
        raw_body = self.rfile.read(content_length)
        if not raw_body:
            return {}
        return json.loads(raw_body.decode("utf-8"))

    def _require_fields(self, body: dict[str, Any], fields: list[str]) -> None:
        missing = [field for field in fields if field not in body or body[field] in (None, "")]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")


def run(host: str = "127.0.0.1", port: int = 8000) -> None:
    server = ThreadingHTTPServer((host, port), EVGatewayAPIHandler)
    print(f"EV Gateway API running on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    run()
