"""CH02: inspect the first Bitcoin transaction using its public TXID."""

import requests


TXID = "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16"


def main() -> None:
    response = requests.get(f"https://blockchain.info/rawtx/{TXID}", timeout=15)
    response.raise_for_status()
    transaction = response.json()

    print("Input count:", len(transaction["inputs"]))
    for output in transaction["out"]:
        address = output.get("addr", "(no address)")
        btc = output["value"] / 100_000_000
        print(address, btc, "BTC")


if __name__ == "__main__":
    main()
