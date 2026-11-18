"""CH02: request and print the latest public Bitcoin block."""

import requests


def main() -> None:
    response = requests.get("https://blockchain.info/latestblock", timeout=15)
    response.raise_for_status()
    block = response.json()
    print("Block number:", block["height"])
    print("Block hash:", block["hash"])
    print("Created at:", block["time"])


if __name__ == "__main__":
    main()
