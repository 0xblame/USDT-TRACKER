# ETH USDT Tracker → Discord Webhook

Monitors a specific Ethereum address for incoming **USDT (ERC-20)** and sends a real-time alert to a **Discord channel** via webhook.

### Features
- Listens to USDT `Transfer` events
- Triggers only when a defined address receives USDT
- Sends amount, sender, and transaction link to Discord

### Setup
1. Clone the repo
2. Run `npm install`
3. Edit `monitor.js`:
   - Set your target ETH address
   - Add your Discord webhook
   - Use your Infura WebSocket endpoint
4. Run the script:
   ```bash
   node monitor.js