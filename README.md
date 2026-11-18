# GiveChain practice project

CH06-CH09 blockchain exercises: ETH campaigns, a local JSON-RPC node, MetaMask, ERC-20 tokens, and ETH/ERC-20 campaign settlement.

## Install

```bash
npm install
```

The project uses Hardhat 3, the Mocha + ethers toolbox, and OpenZeppelin Contracts 5. Solidity sources use `^0.8.20`.

## CH02: Python blockchain exercises

These standalone exercises do not require the GiveChain contracts. Install their one Python dependency and run a script:

```bash
python -m pip install -r practice/ch02-python/requirements.txt
python practice/ch02-python/block_view.py
python practice/ch02-python/tx_view.py
python practice/ch02-python/mining.py
```

The first two scripts call the public Blockchain.com API; `mining.py` runs locally and needs no network.

## CH06-CH07: ETH campaigns and local RPC

Run a local chain in Terminal 1 and leave it running:

```bash
npx hardhat node --network hardhatMainnet
```

In Terminal 2, compile and deploy GiveChain:

```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network localhost
```

The local network uses Chain ID `31338` (`0x7a6a`) and RPC URL `http://127.0.0.1:8545`.
Check the node directly with:

```bash
npx hardhat run scripts/rpcCheck.ts
```

To verify a deployed contract, set `GIVECHAIN_ADDRESS` before running the same command. Open `wallet-check.html` with a local web server, connect MetaMask, and add/switch to GiveChain Local.

## CH08: fixed-supply GVT

Deploy the ERC-20 token to the running local chain:

```bash
npx hardhat run scripts/deployToken.ts --network localhost
```

Copy the printed token address. Set `TOKEN_ADDRESS` and `USER_ADDRESS`, then run `scripts/prepareTokenUser.ts` on `localhost` to send the practice account 5 local ETH and 1,000 GVT. Open `token-app.html` with a local web server, connect MetaMask, enter the token address, and try reading the balance, transferring tokens, and approving an allowance.

## CH09: chargeable GVT and GiveChainV2

Deploy both V2 contracts:

```bash
npx hardhat run scripts/deployV2.ts --network localhost
```

Record the printed `GiveTokenV2` and `GiveChainV2` addresses. `chargeGVT.ts` simulates a completed off-chain payment by minting GVT; it does not process real fiat payments. `scenarioV2.ts` runs one successful campaign and one failed campaign with a refund.

PowerShell example:

```powershell
$env:TOKEN_ADDRESS = "0x..."
$env:GIVECHAIN_ADDRESS = "0x..."
$env:USER_ADDRESS = "0x..."
$env:CHARGE_AMOUNT = "50000"
npx hardhat run scripts/chargeGVT.ts --network localhost
npx hardhat run scripts/scenarioV2.ts --network localhost
```

## Sepolia

Use a dedicated Sepolia account and keep its private key out of source files, commits, and chat. Store the RPC URL and key in Hardhat's encrypted keystore:

```bash
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set SEPOLIA_PRIVATE_KEY
npx hardhat run scripts/deployV2.ts --network sepolia
```

Local Hardhat test keys are public practice keys. Never use them for mainnet funds. Local deployment addresses disappear when the node is restarted.

## Automated exercises

The `test/` folder contains the CH06 ETH campaign checks and CH09 token-campaign checks. Run them with `npm test`.
