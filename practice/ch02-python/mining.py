"""CH02: find a nonce whose SHA-256 hash starts with four zeroes."""

import hashlib


def main() -> None:
    block = "Block 1 previous-hash:0000ab transaction: Alice -> Bob 10"
    target = "0000"
    nonce = 0

    while True:
        digest = hashlib.sha256(f"{block}{nonce}".encode()).hexdigest()
        if digest.startswith(target):
            print("Success! nonce =", nonce)
            print("Hash =", digest)
            return
        nonce += 1


if __name__ == "__main__":
    main()
