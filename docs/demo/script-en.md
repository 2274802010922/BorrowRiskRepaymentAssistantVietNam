# picachu — English narration

## Repayment with a clear goal

Picachu helps borrowers on Solana decide how much to repay and how much cash to keep. Use a limited budget to reduce risk while preserving funds for other needs. This walkthrough covers the complete planner, allocation when funds are insufficient, and a verified repayment receipt on the test network.

## Select loans and a shared balance

First, select the loans to include. This labeled synthetic example has debts of sixty-five, fifty-five, and forty-five U S D C. Each has one SOL of collateral at an assumed price of one hundred dollars. Connecting a wallet loads supported Kamino Devnet positions. The wallet balance is shared, rather than counted once for every position.

## Budget, reserve and price scenario

Next, the example wallet holds eighty U S D C. Keep twenty, repay at most thirty, and test a thirty percent fall in SOL's price. The target is an additional five percent price buffer after that fall, before liquidation. The budget is a limit, not a requirement to spend everything. This is a chosen scenario, not a market forecast.

## Affordable goal: repay only what is needed

Loan A needs eleven point eight U S D C, loan B one point eight, and loan C no extra repayment. The total, thirteen point six, is below the budget, leaving sixty-six point four in the wallet. Each row shows its repayment and scenario buffer. The core uses the example's liquidation threshold and borrowing factor; AI does not invent these amounts.

## Describe a goal in plain language

You can write: repay up to ten U S D C, keep twenty, if SOL falls thirty percent. Picachu creates a draft for review and explicit application. AI can extract the goal, while the core validates its values. If fixed rules are used instead, the interface identifies that source. AI cannot decide the allocation or sign a transaction.

## The budget cannot meet every goal

Ten dollars is three point six U S D C short of meeting every goal. The warning remains: partial payment is not full protection. Explore allocation to compare repayments that reduce estimated liquidation costs in this scenario. You can still increase the budget or change the goal.

## Allocation and comparable alternatives

The model proposes about nine U S D C for A, leaving nearly one dollar unused. The exact amount is visible. A still lacks the five percent target buffer, so this remains partial improvement. The explanation separates loss from one assumed liquidation event and repayment fees. Compare no repayment, equal split, risk-first repayment, and the proposal using the same data and budget. The lowest cost among these candidates is different from meeting every goal. Repayment principal is not liquidation loss.

## Review, sign and verify

Review the amount, fee, and expiry, then sign with your wallet. Plan changes require another review. Each step opens only after the previous receipt is verified. The journal preserves progress across reloads. An uncertain status blocks further sending until checked, avoiding blind retries. Your wallet keeps the private key. This is a workflow explanation, not footage of a Phantom confirmation popup.

## A verified Devnet repayment receipt

This real receipt comes from a separate Vercel API test with a dedicated Devnet wallet. The budget and reserve were each one U S D C, with a forty-five percent SOL scenario. After reviewing the new preview, the wallet repaid about zero point seven eight; the full amount is shown. The journal verified the step. About sixteen point six two remained, above the reserve. A successful receipt does not mean every current goal is met; prices and interest can change.

## Scope and next step

The model matched twenty-five cases against the Kamino Devnet executable. Unsupported versions or configurations disable allocation. It finds the best result in a finite grid for one event, without predicting probabilities or cascading liquidations. Picachu supports one wallet and up to three SOL and U S D C loans. Try the planner, choose your goal, and inspect the source and evidence on GitHub.
