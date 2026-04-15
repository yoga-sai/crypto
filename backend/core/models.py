from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict

from .utils import generate_16_hex_id, now_ts


@dataclass
class User:
    name: str
    password: str
    mobile: str
    pin: str
    balance: float
    zone_code: str
    provider: str
    uid: str
    vmid: str
    created_at: float
    active: bool = True

    @classmethod
    def create(
        cls,
        name: str,
        password: str,
        mobile: str,
        pin: str,
        balance: float,
        zone_code: str,
        provider: str,
    ) -> 'User':
        created_at = now_ts()
        uid = generate_16_hex_id(name, password, str(created_at))
        vmid = generate_16_hex_id(uid, mobile)
        return cls(
            name=name,
            password=password,
            mobile=mobile,
            pin=pin,
            balance=float(balance),
            zone_code=zone_code,
            provider=provider,
            uid=uid,
            vmid=vmid,
            created_at=created_at,
        )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'User':
        return cls(**data)


@dataclass
class Franchise:
    name: str
    password: str
    balance: float
    zone_code: str
    provider: str
    fid: str
    created_at: float
    active: bool = True

    @classmethod
    def create(
        cls,
        name: str,
        password: str,
        balance: float,
        zone_code: str,
        provider: str,
    ) -> 'Franchise':
        created_at = now_ts()
        fid = generate_16_hex_id(name, password, str(created_at))
        return cls(
            name=name,
            password=password,
            balance=float(balance),
            zone_code=zone_code,
            provider=provider,
            fid=fid,
            created_at=created_at,
        )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Franchise':
        return cls(**data)
