from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List

from .utils import now_ts, sha3_hex


@dataclass
class Block:
    index: int
    transaction_id: str
    transaction: Dict[str, Any]
    previous_hash: str
    timestamp: float
    status: str
    dispute: bool
    reason: str
    block_hash: str

    @classmethod
    def create(
        cls,
        index: int,
        transaction: Dict[str, Any],
        previous_hash: str,
        status: str,
        dispute: bool = False,
        reason: str = '',
    ) -> 'Block':
        timestamp = now_ts()
        transaction_id = sha3_hex(
            '|'.join(
                [
                    str(transaction.get('vmid', '')),
                    str(transaction.get('fid', '')),
                    str(timestamp),
                    str(transaction.get('amount', '')),
                ]
            )
        )
        payload = f'{index}|{transaction_id}|{transaction}|{previous_hash}|{timestamp}|{status}|{dispute}|{reason}'
        block_hash = sha3_hex(payload)
        return cls(
            index=index,
            transaction_id=transaction_id,
            transaction=transaction,
            previous_hash=previous_hash,
            timestamp=timestamp,
            status=status,
            dispute=dispute,
            reason=reason,
            block_hash=block_hash,
        )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Block':
        return cls(**data)


class Blockchain:
    def __init__(self, blocks: List[Dict[str, Any]] | None = None):
        if blocks:
            self.chain = [Block.from_dict(block) for block in blocks]
        else:
            self.chain = [
                Block.create(
                    index=0,
                    transaction={'message': 'Genesis Block'},
                    previous_hash='0',
                    status='GENESIS',
                )
            ]

    def add_block(
        self,
        transaction: Dict[str, Any],
        status: str,
        dispute: bool = False,
        reason: str = '',
    ) -> Block:
        previous = self.chain[-1]
        block = Block.create(
            index=len(self.chain),
            transaction=transaction,
            previous_hash=previous.block_hash,
            status=status,
            dispute=dispute,
            reason=reason,
        )
        self.chain.append(block)
        return block

    def to_list(self) -> List[Dict[str, Any]]:
        return [block.to_dict() for block in self.chain]

    def verify_chain(self) -> bool:
        for i in range(1, len(self.chain)):
            prev = self.chain[i - 1]
            curr = self.chain[i]
            expected = sha3_hex(
                f'{curr.index}|{curr.transaction_id}|{curr.transaction}|{curr.previous_hash}|{curr.timestamp}|{curr.status}|{curr.dispute}|{curr.reason}'
            )
            if curr.block_hash != expected:
                return False
            if curr.previous_hash != prev.block_hash:
                return False
        return True
