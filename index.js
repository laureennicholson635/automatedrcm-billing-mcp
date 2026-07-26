#!/usr/bin/env node
/**
 * AutomatedRCM Billing Tools — MCP server
 *
 * Gives any MCP-capable agent (Claude, etc.) medical-billing intelligence:
 * prior-auth determinations, denial-code decoding, unpaid-claim triage,
 * appeal assessments, and a PHI de-identification demo.
 *
 * The intelligence lives server-side at x402.getautomatedrcm.com — this
 * package is a thin client. Free tools work with no setup. Paid tools cost
 * $0.01–$1.50 per call, settled in USDC on Base via the x402 protocol:
 * set X402_PRIVATE_KEY to a funded wallet's key to enable them.
 *
 * NEVER send real PHI. The paid endpoints are deterministic rules engines
 * that accept codes and numbers only; /scrub is a demo for synthetic text.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = process.env.AUTOMATEDRCM_BASE_URL || "https://x402.getautomatedrcm.com";

let payFetch = null;
async function getPayFetch() {
  if (payFetch) return payFetch;
  const pk = process.env.X402_PRIVATE_KEY;
  if (!pk) return null;
  const { wrapFetchWithPaymentFromConfig } = await import("@x402/fetch");
  const { ExactEvmScheme } = await import("@x402/evm");
  const { privateKeyToAccount } = await import("viem/accounts");
  const account = privateKeyToAccount(pk.startsWith("0x") ? pk : "0x" + pk);
  payFetch = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ network: "eip155:8453", client: new ExactEvmScheme(account) }],
  });
  return payFetch;
}

async function callPaid(path, body, price) {
  const f = await getPayFetch();
  if (!f) {
    return {
      error: "payment_not_configured",
      message: `This tool costs ${price} per call (USDC on Base, x402 protocol). Set the X402_PRIVATE_KEY environment variable to a wallet holding a little USDC on Base mainnet to enable paid calls. Free preview: use the free_samples tool.`,
    };
  }
  const res = await f(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: "non-JSON response", status: res.status }));
  if (res.status !== 200) return { error: `HTTP ${res.status}`, detail: data };
  return data;
}

async function callFree(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
  return res.json();
}

const text = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });

const server = new McpServer({ name: "automatedrcm-billing", version: "1.0.0" });

server.registerTool("catalog", {
  description: "Free. List the AutomatedRCM billing-intelligence endpoints, prices, and input shapes.",
  inputSchema: {},
}, async () => text(await callFree("/")));

server.registerTool("free_samples", {
  description: "Free. Real sample outputs from every paid endpoint on fixed example inputs — evaluate quality before paying.",
  inputSchema: {},
}, async () => text(await callFree("/demo")));

server.registerTool("pa_check", {
  description: "Prior-authorization determination for a CPT/HCPCS code + US payer (UHC, Aetna, Cigna, Florida Blue, Humana, Medicare, Medicare Advantage). Returns requirement, clinical criteria, documentation checklist, payer portal and turnaround. $0.05 per call.",
  inputSchema: {
    cpt: z.string().describe("CPT/HCPCS procedure code, e.g. 29881"),
    payer: z.string().describe("Payer: UHC, AETNA, CIGNA, FLBLUE, HUMANA, MEDICARE, MEDICARE_ADV"),
    icd10: z.string().optional().describe("Optional ICD-10 diagnosis code"),
  },
}, async (args) => text(await callPaid("/pa-check", args, "$0.05")));

server.registerTool("denial_decode", {
  description: "Decode a CARC claim-denial code (e.g. CO-50, PR-204): plain-English meaning, category, appealability, concrete next action, and prevention. $0.02 per call.",
  inputSchema: {
    code: z.string().describe("CARC denial code, e.g. CO-50 or bare 50"),
  },
}, async (args) => text(await callPaid("/denial-decode", args, "$0.02")));

server.registerTool("claim_triage", {
  description: "Triage an unpaid claim: given the follow-up action code (RES/CPE/CRO/APP/PAY or empty), balance, and claim ages, returns the work bucket (WORK_NOW/WAITING/REVIEW/COMPLETE), risk flags, priority score, and next action with deadline. $0.03 per call.",
  inputSchema: {
    action_code: z.string().optional().describe("RES|CPE|CRO|APP|PAY or empty string"),
    balance: z.number().describe("Outstanding balance in USD"),
    days_since_last_touch: z.number().describe("Days since the claim was last worked"),
    days_since_dos: z.number().describe("Days since date of service"),
    timely_filing_limit_days: z.number().optional().describe("Default 365"),
  },
}, async (args) => text(await callPaid("/claim-triage", args, "$0.03")));

server.registerTool("appeal_assessment", {
  description: "Full appeal verdict for a denied claim: appeal/fix/write-off decision, deadline math vs the payer's typical appeal window, evidence checklist, payer-specific arguments, and a structured appeal-letter draft. $1.50 per call.",
  inputSchema: {
    denial_code: z.string().describe("CARC denial code, e.g. CO-50"),
    payer: z.string().describe("US payer, e.g. UHC, MEDICARE"),
    cpt: z.string().optional().describe("Optional CPT — unlocks criteria-mapped arguments"),
    balance: z.number().describe("Denied balance in USD"),
    days_since_denial: z.number().describe("Days since the denial posted"),
    days_since_dos: z.number().optional().describe("Optional days since date of service"),
  },
}, async (args) => text(await callPaid("/appeal-assessment", args, "$1.50")));

server.registerTool("phi_scrub_demo", {
  description: "De-identify healthcare text (DEMO — synthetic/test data ONLY, never real PHI). Strips names, DOBs, IDs, phones, addresses; dates become a derived interval timeline so filing-window math survives. Returns scrubbed text + token map. $0.01 per call. Production use runs in your own environment: laureennicholson@getautomatedrcm.com.",
  inputSchema: {
    text: z.string().max(1800).describe("SYNTHETIC/TEST text to de-identify (2 KB max)"),
  },
}, async (args) => text(await callPaid("/scrub", args, "$0.01")));

const transport = new StdioServerTransport();
await server.connect(transport);
