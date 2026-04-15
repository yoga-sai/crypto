from __future__ import annotations

import hashlib
import random
from dataclasses import asdict
from typing import Any, Dict, List

from .blockchain import Blockchain
from .crypto_utils import (
    crack_rsa_quantum_sim,
    decrypt_text,
    encrypt_text,
    rsa_decrypt_text,
    rsa_decrypt_number,
    rsa_encrypt_text,
    rsa_encrypt_number,
    rsa_key_gen,
)
from .models import Franchise, User
from .utils import DB_FILE, QR_DIR, now_str, now_ts, random_hardware_outcome, safe_load_json, save_json

try:
    import qrcode
    QRCODE_AVAILABLE = True
except Exception:
    qrcode = None
    QRCODE_AVAILABLE = False

PROVIDERS = {
    'Tata Power': ['TP-N', 'TP-S', 'TP-W'],
    'Adani Energy': ['AD-N', 'AD-S', 'AD-W'],
    'ChargePoint': ['CP-N', 'CP-S', 'CP-W'],
}

RSA_DEMO_PRIMES = [53, 59, 61, 67, 71, 73, 79, 83, 89, 97]


def hash_small_demo(value: str, modulus: int) -> int:
    digest = hashlib.sha256(value.encode('utf-8')).hexdigest()
    return int(digest, 16) % modulus


class EVGateway:
    def __init__(self, db_path=DB_FILE):
        self.db_path = db_path
        self._load()

    def _load(self) -> None:
        data = safe_load_json(
            self.db_path,
            {
                'users': {},
                'franchises': {},
                'blockchain': None,
                'audit_log': [],
            },
        )
        self.users: Dict[str, User] = {
            vmid: User.from_dict(user_data) for vmid, user_data in data.get('users', {}).items()
        }
        self.franchises: Dict[str, Franchise] = {
            fid: Franchise.from_dict(fr_data) for fid, fr_data in data.get('franchises', {}).items()
        }
        self.blockchain = Blockchain(data.get('blockchain'))
        self.audit_log: List[Dict[str, Any]] = data.get('audit_log', [])
        self.rsa_keys = rsa_key_gen()

    def save(self) -> None:
        save_json(
            self.db_path,
            {
                'users': {vmid: user.to_dict() for vmid, user in self.users.items()},
                'franchises': {fid: fr.to_dict() for fid, fr in self.franchises.items()},
                'blockchain': self.blockchain.to_list(),
                'audit_log': self.audit_log,
            },
        )

    def reset(self) -> None:
        self.users = {}
        self.franchises = {}
        self.blockchain = Blockchain()
        self.audit_log = []
        self.save()

    def seed_demo_data(self) -> None:
        if self.users or self.franchises:
            return
        franchise = self.register_franchise('EV Station One', 'pass123', 1000.0, 'TP-N', 'Tata Power')
        self.register_user('Harsh', 'mypassword', '9876543210', '1234', 500.0, 'TP-N', 'Tata Power')
        self.audit_log.append({'time': now_str(), 'event': f'Demo data seeded for franchise {franchise.fid}'})
        self.save()

    def register_user(
        self,
        name: str,
        password: str,
        mobile: str,
        pin: str,
        balance: float,
        zone_code: str,
        provider: str,
    ) -> User:
        user = User.create(name, password, mobile, pin, balance, zone_code, provider)
        self.users[user.vmid] = user
        self.audit_log.append({'time': now_str(), 'event': f'User registered: {user.name} ({user.vmid})'})
        self.save()
        return user

    def register_franchise(
        self,
        name: str,
        password: str,
        balance: float,
        zone_code: str,
        provider: str,
    ) -> Franchise:
        franchise = Franchise.create(name, password, balance, zone_code, provider)
        self.franchises[franchise.fid] = franchise
        self.audit_log.append({'time': now_str(), 'event': f'Franchise registered: {franchise.name} ({franchise.fid})'})
        self.save()
        return franchise

    def get_user_rows(self) -> List[Dict[str, Any]]:
        return [asdict(user) for user in self.users.values()]

    def get_franchise_rows(self) -> List[Dict[str, Any]]:
        return [asdict(fr) for fr in self.franchises.values()]

    def generate_vfid(self, fid: str) -> str:
        return encrypt_text(f'{fid}|{int(now_ts())}')

    def create_station_qr(self, fid: str) -> Dict[str, str]:
        franchise = self.franchises.get(fid)
        if not franchise:
            raise ValueError('Franchise not found.')
        encrypted_payload = self.generate_vfid(fid)
        file_path = QR_DIR / f'{fid}_station_qr.png'
        if QRCODE_AVAILABLE:
            img = qrcode.make(encrypted_payload)
            img.save(file_path)
        return {
            'payload': encrypted_payload,
            'file_path': str(file_path),
            'fid': fid,
            'franchise_name': franchise.name,
        }

    def resolve_fid_from_qr_payload(self, encrypted_payload: str) -> str:
        payload = decrypt_text(encrypted_payload)
        fid = payload.split('|', 1)[0]
        return fid

    def process_payment(self, encrypted_payload: str, vmid: str, pin: str, amount: float) -> Dict[str, Any]:
        amount = float(amount)
        if amount <= 0:
            return {'ok': False, 'message': 'Amount must be positive.'}
        try:
            fid = self.resolve_fid_from_qr_payload(encrypted_payload)
        except Exception as exc:
            return {'ok': False, 'message': f'Unable to read station QR: {exc}'}

        user = self.users.get(vmid)
        if not user:
            return {'ok': False, 'message': 'User not found.'}
        if not user.active:
            return {'ok': False, 'message': 'User account is inactive.'}
        if user.pin != pin:
            return {'ok': False, 'message': 'Incorrect PIN.'}
        if user.balance < amount:
            return {'ok': False, 'message': 'Insufficient balance.'}

        franchise = self.franchises.get(fid)
        if not franchise:
            return {'ok': False, 'message': 'Franchise not found.'}
        if not franchise.active:
            return {'ok': False, 'message': 'Franchise account is inactive.'}

        user.balance -= amount
        franchise.balance += amount

        txn = {
            'vmid': vmid,
            'fid': fid,
            'user_name': user.name,
            'franchise_name': franchise.name,
            'amount': amount,
            'time': now_str(),
        }
        success_block = self.blockchain.add_block(txn, status='SUCCESS')
        hardware_success = random_hardware_outcome()

        if not hardware_success:
            user.balance += amount
            franchise.balance -= amount
            refund_txn = {
                'vmid': vmid,
                'fid': fid,
                'user_name': user.name,
                'franchise_name': franchise.name,
                'amount': amount,
                'time': now_str(),
                'refund_for_block': success_block.block_hash,
            }
            self.blockchain.add_block(refund_txn, status='REFUND', dispute=True, reason='Hardware Failure')
            self.audit_log.append({'time': now_str(), 'event': f'Refund issued for VMID {vmid} at FID {fid}'})
            self.save()
            return {
                'ok': False,
                'message': 'Payment succeeded but charging hardware failed. Refund block added.',
                'fid': fid,
                'user_balance': user.balance,
                'franchise_balance': franchise.balance,
                'hardware_success': False,
            }

        self.audit_log.append({'time': now_str(), 'event': f'Payment success for VMID {vmid} at FID {fid}'})
        self.save()
        return {
            'ok': True,
            'message': 'Payment successful. Charging unlocked.',
            'fid': fid,
            'user_balance': user.balance,
            'franchise_balance': franchise.balance,
            'hardware_success': True,
        }

    def get_ledger_rows(self) -> List[Dict[str, Any]]:
        return [block.to_dict() for block in self.blockchain.chain]

    def secure_credentials_for_demo(self, vmid: str, pin: str) -> Dict[str, Any]:
        p, q = random.sample(RSA_DEMO_PRIMES, 2)
        rsa_keys = rsa_key_gen(p=p, q=q)
        _, n = rsa_keys.public_key
        vmid_small = hash_small_demo(vmid, n)
        pin_small = int(pin) % n
        enc_vmid_small = rsa_encrypt_number(vmid_small, rsa_keys.public_key)
        enc_pin_small = rsa_encrypt_number(pin_small, rsa_keys.public_key)
        enc_vmid_chars = rsa_encrypt_text(vmid, rsa_keys.public_key)
        enc_pin_chars = rsa_encrypt_text(pin, rsa_keys.public_key)
        return {
            'public_key': rsa_keys.public_key,
            'private_key': rsa_keys.private_key,
            'original_vmid': vmid,
            'original_pin': pin,
            'vmid_small': vmid_small,
            'pin_small': pin_small,
            'enc_vmid_small': enc_vmid_small,
            'enc_pin_small': enc_pin_small,
            'enc_vmid': enc_vmid_chars,
            'enc_pin': enc_pin_chars,
        }

    def quantum_breach_demo(self, vmid: str, pin: str) -> Dict[str, Any]:
        secure = self.secure_credentials_for_demo(vmid, pin)
        cracked_key, details = crack_rsa_quantum_sim(secure['public_key'])
        stolen_vmid_small = rsa_decrypt_number(secure['enc_vmid_small'], cracked_key)
        stolen_pin_small = rsa_decrypt_number(secure['enc_pin_small'], cracked_key)
        stolen_vmid = rsa_decrypt_text(secure['enc_vmid'], cracked_key)
        stolen_pin = rsa_decrypt_text(secure['enc_pin'], cracked_key)
        return {
            **secure,
            **details,
            'cracked_private_key': cracked_key,
            'stolen_vmid_small': stolen_vmid_small,
            'stolen_pin_small': stolen_pin_small,
            'stolen_vmid': stolen_vmid,
            'stolen_pin': stolen_pin,
            'matches_original_private_key': cracked_key == secure['private_key'],
        }
