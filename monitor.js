const { ethers } = require("ethers");
const axios = require("axios");

// Your ETH address
const targetAddress = "0xTargetAddressHere".toLowerCase();

// Discord webhook
const discordWebhook = "https://discord.com/api/webhooks/xxxx";

// USDT contract + ABI
const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const ABI = [
  "event Transfer(address indexed from, address indexed to, uint value)"
];

// Connect to provider
const provider = new ethers.providers.WebSocketProvider("wss://mainnet.infura.io/ws/v3/YOUR_INFURA_KEY");

// Connect to USDT contract
const contract = new ethers.Contract(USDT_ADDRESS, ABI, provider);

// Listen for Transfer events
contract.on("Transfer", async (from, to, value, event) => {
  if (to.toLowerCase() === targetAddress) {
    const amount = ethers.utils.formatUnits(value, 6); // USDT has 6 decimals

    await axios.post(discordWebhook, {
      content: `🎯 **USDT Received**
Address: ${targetAddress}
From: ${from}
Amount: ${amount} USDT
Tx: https://etherscan.io/tx/${event.transactionHash}`
    });

    console.log(`USDT Received: ${amount} from ${from}`);
  }
});