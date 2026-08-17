# AutomatedRCM Billing Tools — MCP Server

Give your AI agent **medical-billing intelligence** in five minutes: prior-authorization determinations, claim-denial decoding, unpaid-claim triage, appeal assessments, and a PHI de-identification demo.

Built by [AutomatedRCM](https://getautomatedrcm.com) — an AI-powered medical billing company run by a biller with 10 years in the field. The rules engines run server-side; every answer is deterministic (no LLM on the paid path, no PHI accepted). Also listed on Coinbase's [x402 Bazaar](https://x402.getautomatedrcm.com).

## Tools

| Tool | What it does | Price |
|---|---|---|
| `catalog` | List endpoints, prices, input shapes | Free |
| `free_samples` | Real sample outputs on fixed inputs — try before you buy | Free |
| `pa_check` | Prior-auth determination: CPT + payer → requirement, criteria, documentation checklist, portal, turnaround | $0.05 |
| `denial_decode` | CARC code (CO-50, PR-204, …) → plain-English meaning, appealability, next action, prevention | $0.02 |
| `claim_triage` | Unpaid claim → work bucket, risk flags, priority score, next action + deadline | $0.03 |
| `appeal_assessment` | Denied claim → appeal/fix/write-off verdict, deadline math, evidence checklist, structured appeal-letter draft | $1.50 |
| `phi_scrub_demo` | De-identify text (synthetic/test data ONLY) with interval-preserving date timeline | $0.01 |

Payments use the [x402 protocol](https://docs.cdp.coinbase.com/x402/welcome) — USDC on Base, settled per call, no account or API key.

## Setup

Easiest — no install, straight from npm:

```json
{
  "mcpServers": {
    "automatedrcm-billing": {
      "command": "npx",
      "args": ["-y", "automatedrcm-billing-mcp"],
      "env": { "X402_PRIVATE_KEY": "0x..." }
    }
  }
}
```

Or from source:

```bash
git clone https://github.com/laureennicholson635/automatedrcm-billing-mcp
cd automatedrcm-billing-mcp
npm install
```

```json
{
  "mcpServers": {
    "automatedrcm-billing": {
      "command": "node",
      "args": ["/path/to/automatedrcm-billing-mcp/index.js"],
      "env": { "X402_PRIVATE_KEY": "0x..." }
    }
  }
}
```

- **Free tools** (`catalog`, `free_samples`) work with no configuration.
- **Paid tools** need `X402_PRIVATE_KEY` — a wallet private key holding a little USDC on **Base mainnet** ($1 covers ~30 mixed calls). Payments are gasless for the buyer (EIP-3009); the wallet needs USDC only, no ETH. Use a dedicated low-balance wallet, never your main one.

## Rules of the road

- **Never send real PHI.** Paid endpoints accept codes and numbers; `phi_scrub_demo` is for synthetic/test text only and stores nothing. Production de-identification runs licensed in *your* environment — contact laureennicholson@getautomatedrcm.com.
- Determinations reflect typical published payer policy; plan-level variations exist. Verify plan-specific requirements for final decisions.

## Who made this

Laureen Nicholson — 10 years in medical billing, now building an AI-agent billing company in public. Live demos: [Flow (claim journey)](https://flow.getautomatedrcm.com) · [WorkQueue](https://workqueue.getautomatedrcm.com) · [PHI Scrubber](https://scrub.getautomatedrcm.com) · [marketplace stats](https://x402.getautomatedrcm.com/stats). Want the full billing service or a white-label deal? [getautomatedrcm.com](https://getautomatedrcm.com).
