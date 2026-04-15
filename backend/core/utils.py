from __future__ import annotations

import hashlib
import json
import os
import random
import time
from pathlib import Path
from typing import Any

APP_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = APP_DIR / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_FILE = DATA_DIR / 'ev_gateway.json'
QR_DIR = DATA_DIR / 'qr_codes'
QR_DIR.mkdir(parents=True, exist_ok=True)


def sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def sha3_hex(text: str) -> str:
    return hashlib.sha3_256(text.encode('utf-8')).hexdigest()


def generate_16_hex_id(*parts: str) -> str:
    payload = '|'.join(parts)
    return sha3_hex(payload)[:16]


def now_ts() -> float:
    return time.time()


def now_str() -> str:
    return time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())


def safe_load_json(path: os.PathLike[str] | str, default: Any) -> Any:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return default
    except json.JSONDecodeError:
        return default


def save_json(path: os.PathLike[str] | str, data: Any) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def random_hardware_outcome(success_probability: float = 0.85) -> bool:
    return random.random() < success_probability
