# picachu

Vietnamese-first borrower decision-support web app. Target: Vercel + Solana Devnet.

## Start here

- Read `docs/harness/context/CURRENT_STATE.md`, `docs/harness/context/HANDOFF.md`, and `docs/design/system.md`.
- Active approved sprint: `docs/harness/plans/active/final-repo-polish.md`; user approved the review recommendations end-to-end. Preserve Devnet proof, VI/EN videos, licensing scope and12-slide design. No interviews, new signing or fabricated traction.
- Preserve the user's original architecture draft at `docs/archive/original-architecture.md` byte-for-byte. Application code is under `src/`. Implementation decisions and corrections are in `docs/architecture/README.md`; numeric illustrations in the draft are not test oracles.
- Keep changes scoped to the current task. Work on a branch; do not merge into main without the user's instruction.
- Current user instruction authorizes this picachu release on main. Commit titles and bodies must be in Vietnamese.

## Commands

- Node from `.nvmrc`; `npm ci`.
- `npm run dev` for local UI.
- `npm run check` for format, lint, types, and offline unit checks.
- `npm run verify` also builds and runs browser/a11y tests. Install Chromium first: `npx playwright install chromium`.
- `npm run check:devnet` is a separate, read-only online diagnostic; it is not repayment proof.

## Boundaries

- The user authorized end-to-end implementation and checkpoint commit/push. Current scope: `docs/harness/plans/active/goal-portfolio.md`; old MVP checkpoints remain in `mvp.md`. State explicitly which integrations have actually been verified. Loss allocation must remain hidden until protocol parity is independently verified.
- Preserve source labels. Never turn missing data into zero, failed reads into empty positions, or submitted transactions into success.
- Financial code added later must use explicit units and protocol parameters; AI must not invent metrics or control signing.
- Devnet only. Never add custody, secret keys to the browser, or automatic signing. Confirm chain identity before future live integration.
- Follow the inherited light-terminal system. Preserve VI/EN consistency, keyboard access, visible status text, and responsive layouts.
- SkillBridge is a read-only reference. Do not copy its branding, API, wallet sessions, roles or historical CSS patches.
- Reused code needs source commit, scope, and applicable notices in `THIRD_PARTY_NOTICES.md`.

## Code review rules

- Flag stale/missing data enabling an action and any fixture presented as live.
- Flag financial values produced by random data or an LLM.
- Require meaningful failure cases for changed behavior; test counts are not accuracy claims.
- Record what was actually verified and what remains unverified in the task handoff. Keep instructions short; details belong in docs.
