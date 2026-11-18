const rpcUrl = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const giveChainAddress = process.env.GIVECHAIN_ADDRESS;

async function rpc(method: string, params: unknown[] = []): Promise<unknown> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: Date.now() }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const payload = (await response.json()) as {
    result?: unknown;
    error?: { code: number; message: string };
  };
  if (payload.error) throw new Error(`${payload.error.code}: ${payload.error.message}`);
  if (payload.result === undefined) throw new Error(`No result for ${method}`);
  return payload.result;
}

async function main() {
  const [chainId, blockNumber, accounts] = await Promise.all([
    rpc("eth_chainId"),
    rpc("eth_blockNumber"),
    rpc("eth_accounts"),
  ]);
  if (!Array.isArray(accounts)) throw new Error("eth_accounts did not return an array");
  const accountList = accounts as string[];
  if (accountList.length === 0) throw new Error("The node returned no accounts");

  const balance = await rpc("eth_getBalance", [accountList[0], "latest"]);
  const chainIdHex = chainId as string;
  const blockNumberHex = blockNumber as string;
  console.log("Chain ID (hex):", chainIdHex);
  console.log("Chain ID (decimal):", BigInt(chainIdHex).toString());
  console.log("Block Number:", BigInt(blockNumberHex).toString());
  console.log("First Account:", accountList[0]);
  console.log("Balance (wei):", BigInt(balance as string).toString());

  if (giveChainAddress) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(giveChainAddress)) {
      throw new Error("GIVECHAIN_ADDRESS is not a valid address");
    }
    const code = await rpc("eth_getCode", [giveChainAddress, "latest"]) as string;
    console.log("GiveChain Address:", giveChainAddress);
    console.log("Contract Code Exists:", code !== "0x");
    if (code === "0x") throw new Error("No contract code exists at GIVECHAIN_ADDRESS");
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
