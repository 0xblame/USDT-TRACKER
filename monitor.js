// watchAllERC20_ws.js
// ——————————————
// Listens for ERC-20 Transfer (IN + OUT) and native ETH transfers for one address.
// Posts to Discord via WebSocket—no polling. Uses one RPC call per new block,
// plus real-time logs, so API usage is minimal.
//
// 1) Replace TARGET_ADDRESS (lowercase).
// 2) Replace DISCORD_WEBHOOK_URL.
// 3) Run `node watchAllERC20_ws.js`.

const { ethers } = require("ethers");
const axios = require("axios");

// ─── CONFIG ────────────────────────────────────────────────────────────────────

const TARGET_ADDRESS = "your_eth_addy".toLowerCase();
const DISCORD_WEBHOOK_URL =
  "discord_webhook";

// ─── HELPERS ────────────────────────────────────────────────────────────────────

async function postToDiscord(content) {
  try {
    await axios.post(DISCORD_WEBHOOK_URL, { content });
  } catch (err) {
    console.error("Discord webhook error:", err.message || err);
  }
}

function formatERC20Log(log) {
  const from = ethers.utils.getAddress(
    ethers.utils.hexDataSlice(log.topics[1], 12)
  );
  const to = ethers.utils.getAddress(
    ethers.utils.hexDataSlice(log.topics[2], 12)
  );
  const valueBN = ethers.BigNumber.from(log.data);
  const tokenAddress = ethers.utils.getAddress(log.address);
  return { from, to, value: valueBN.toString(), tokenAddress, txHash: log.transactionHash };
}

// ─── STARTUP ────────────────────────────────────────────────────────────────────

console.log("▶️  Starting watcher (ETH + ERC-20 WS) for:", TARGET_ADDRESS);
postToDiscord(`✅ **Watcher Started (ETH + ERC-20)**\nWatching: ${TARGET_ADDRESS}`);

// ─── WEBSOCKET PROVIDER ─────────────────────────────────────────────────────────

const wsProvider = new ethers.providers.WebSocketProvider(
  "wss://mainnet.infura.io/ws/v3/api(get it from metamask website)"
);

// ─── ERC-20 🔔─── SUBSCRIPTIONS ─────────────────────────────────────────────

const TRANSFER_TOPIC = ethers.utils.id("Transfer(address,address,uint256)");
const TARGET_TOPIC = ethers.utils.hexZeroPad(TARGET_ADDRESS, 32);

// Outgoing ERC-20 (you → someone)
wsProvider.on(
  {
    topics: [TRANSFER_TOPIC, TARGET_TOPIC, null],
  },
  async (log) => {
    try {
      const { from, to, value, tokenAddress, txHash } = formatERC20Log(log);
      if (from === TARGET_ADDRESS) {
        const msg = [
          `📤 **OUTGOING ERC-20**`,
          `• You:   ${TARGET_ADDRESS}`,
          `• To:    ${to}`,
          `• Token: ${tokenAddress}`,
          `• Value: ${value}`,
          `• Tx:    https://etherscan.io/tx/${txHash}`,
        ].join("\n");
        await postToDiscord(msg);
        console.log("OUT ERC-20 →", tokenAddress, value, txHash);
      }
    } catch (e) {
      console.error("Error handling ERC-20 OUT log:", e.message || e);
    }
  }
);

// Incoming ERC-20 (someone → you)
wsProvider.on(
  {
    topics: [TRANSFER_TOPIC, null, TARGET_TOPIC],
  },
  async (log) => {
    try {
      const { from, to, value, tokenAddress, txHash } = formatERC20Log(log);
      if (to === TARGET_ADDRESS) {
        const msg = [
          `📥 **INCOMING ERC-20**`,
          `• From:  ${from}`,
          `• You:   ${TARGET_ADDRESS}`,
          `• Token: ${tokenAddress}`,
          `• Value: ${value}`,
          `• Tx:    https://etherscan.io/tx/${txHash}`,
        ].join("\n");
        await postToDiscord(msg);
        console.log("IN ERC-20 ←", tokenAddress, value, txHash);
      }
    } catch (e) {
      console.error("Error handling ERC-20 IN log:", e.message || e);
    }
  }
);

// ─── ETH 🔔─── BLOCK LISTENER ───────────────────────────────────────────────────

wsProvider.on("block", async (blockNumber) => {
  try {
    const block = await wsProvider.getBlockWithTransactions(blockNumber);
    for (const tx of block.transactions) {
      const fromLower = tx.from.toLowerCase();
      const toLower = tx.to ? tx.to.toLowerCase() : null;
      if (fromLower === TARGET_ADDRESS || toLower === TARGET_ADDRESS) {
        const direction = toLower === TARGET_ADDRESS ? "IN" : "OUT";
        const counterparty = direction === "IN" ? tx.from : tx.to || "contract";
        const etherValue = ethers.utils.formatEther(tx.value);
        const msg = [
          direction === "IN" ? "📥 **ETH RECEIVED**" : "📤 **ETH SENT**",
          `• You:        ${TARGET_ADDRESS}`,
          `• ${direction === "IN" ? "From" : "To"}:  ${counterparty}`,
          `• Amount:     ${etherValue} ETH`,
          `• Tx:         https://etherscan.io/tx/${tx.hash}`,
        ].join("\n");
        await postToDiscord(msg);
        console.log(`${direction} ETH: ${etherValue} in tx ${tx.hash}`);
      }
    }
  } catch (e) {
    console.error("Error scanning block:", e.message || e);
  }
});

// ─── WS ERROR HANDLING ───────────────────────────────────────────────────────────

wsProvider._websocket.on("error", (err) => {
  console.error("WebSocket error:", err);
});
wsProvider._websocket.on("close", (code) => {
  console.error("WebSocket closed. Code:", code, "— restarting process...");
  setTimeout(() => process.exit(1), 1000);
});
