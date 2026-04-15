from __future__ import annotations

import base64
import math
from dataclasses import dataclass
from typing import Optional, Tuple

try:
    from ascon import decrypt as ascon_decrypt
    from ascon import encrypt as ascon_encrypt
    ASCON_AVAILABLE = True
except Exception:
    ASCON_AVAILABLE = False
    ascon_encrypt = None
    ascon_decrypt = None


DEFAULT_KEY = b'this_is_16_bytes'
DEFAULT_NONCE = b'unique_nonce_123'
DEFAULT_ASSOCIATED_DATA = b'ev-kiosk'


def _xor_fallback(data: bytes, key: bytes) -> bytes:
    return bytes(b ^ key[i % len(key)] for i, b in enumerate(data))


def encrypt_text(plaintext: str, key: bytes = DEFAULT_KEY, nonce: bytes = DEFAULT_NONCE) -> str:
    raw = plaintext.encode('utf-8')
    if ASCON_AVAILABLE:
        ciphertext = ascon_encrypt(key, nonce, DEFAULT_ASSOCIATED_DATA, raw)
        return ciphertext.hex()
    fallback = _xor_fallback(raw, key)
    return base64.urlsafe_b64encode(fallback).decode('ascii')


def decrypt_text(ciphertext: str, key: bytes = DEFAULT_KEY, nonce: bytes = DEFAULT_NONCE) -> str:
    if ASCON_AVAILABLE:
        clear = ascon_decrypt(key, nonce, DEFAULT_ASSOCIATED_DATA, bytes.fromhex(ciphertext))
        if clear is None:
            raise ValueError('Unable to decrypt ASCON ciphertext.')
        return clear.decode('utf-8')
    raw = base64.urlsafe_b64decode(ciphertext.encode('ascii'))
    clear = _xor_fallback(raw, key)
    return clear.decode('utf-8')


def string_to_int(text: str) -> int:
    return int.from_bytes(text.encode('utf-8'), 'big')


def int_to_string(number: int) -> str:
    if number == 0:
        return ''
    length = (number.bit_length() + 7) // 8
    return number.to_bytes(length, 'big').decode('utf-8', errors='ignore')


def egcd(a: int, b: int) -> Tuple[int, int, int]:
    if a == 0:
        return b, 0, 1
    g, x1, y1 = egcd(b % a, a)
    return g, y1 - (b // a) * x1, x1


def mod_inverse(a: int, m: int) -> int:
    g, x, _ = egcd(a, m)
    if g != 1:
        raise ValueError('Inverse does not exist')
    return x % m


@dataclass(frozen=True)
class RSAKeyPair:
    public_key: Tuple[int, int]
    private_key: Tuple[int, int]
    p: int
    q: int


def rsa_key_gen(p: int = 61, q: int = 53, e: int = 17) -> RSAKeyPair:
    n = p * q
    phi = (p - 1) * (q - 1)
    if math.gcd(e, phi) != 1:
        raise ValueError('e must be coprime with phi(n)')
    d = mod_inverse(e, phi)
    return RSAKeyPair(public_key=(e, n), private_key=(d, n), p=p, q=q)


def rsa_encrypt_number(message_int: int, public_key: Tuple[int, int]) -> int:
    e, n = public_key
    if message_int >= n:
        raise ValueError(
            'Message integer is too large for the toy RSA modulus. '
            'Use a smaller demo value.'
        )
    return pow(message_int, e, n)


def rsa_decrypt_number(ciphertext: int, private_key: Tuple[int, int]) -> int:
    d, n = private_key
    return pow(ciphertext, d, n)


def rsa_encrypt_text(plaintext: str, public_key: Tuple[int, int]) -> list[int]:
    return [rsa_encrypt_number(ord(char), public_key) for char in plaintext]


def rsa_decrypt_text(ciphertext: list[int], private_key: Tuple[int, int]) -> str:
    return ''.join(chr(rsa_decrypt_number(value, private_key)) for value in ciphertext)


def classical_period_finding(a: int, n: int) -> int:
    r = 1
    while pow(a, r, n) != 1:
        r += 1
        if r > 10_000:
            raise RuntimeError('Period search exceeded safe demo bound.')
    return r


def factorize_modulus_quantum_sim(n: int, a: int = 2) -> Tuple[int, int, int]:
    r = classical_period_finding(a, n)
    if r % 2 == 0:
        x = pow(a, r // 2, n)
        p = math.gcd(x - 1, n)
        q = math.gcd(x + 1, n)
        if p > 1 and q > 1 and p * q == n:
            return p, q, r
    for i in range(2, int(math.sqrt(n)) + 1):
        if n % i == 0:
            return i, n // i, r
    raise ValueError('Unable to factor modulus in demo.')


def crack_rsa_quantum_sim(public_key: Tuple[int, int]) -> Tuple[Tuple[int, int], dict]:
    e, n = public_key
    p, q, r = factorize_modulus_quantum_sim(n)
    phi = (p - 1) * (q - 1)
    d = mod_inverse(e, phi)
    cracked_key = (d, n)
    return cracked_key, {
        'public_key': public_key,
        'modulus': n,
        'period_r': r,
        'recovered_p': p,
        'recovered_q': q,
        'recovered_private_key': cracked_key,
    }
