# OIMO Technology — finish this project

The human explicitly requested that ALL remaining work be transferred from Codex to Claude Code to save their Codex quota. You are the executor, not just a reviewer. Complete the authorized local implementation, fixes, tests, Docker packaging and documentation autonomously. Do not ask the human routine permission questions. Do not publish anything or use Sites: user confirmed they have no hosting and wants LOCAL + Docker now.

## Goal and authoritative requirements

Build a usable first pilot today for a friend's laptop store in Bishkek. Russian interface. Owner and salespeople. Track sales with product, photo, serial, exact price, payment method/status. Owner approves/rejects; only approved laptops count in commission KPI. Team rankings, independent weekly/monthly/yearly targets, configurable KPI rules, historical ledger, Excel export, private photo access. User explicitly replaced temporary ChatGPT login with ordinary EMAIL + PASSWORD today. No ChatGPT account requirement. User supplied an actual logo and explicitly wants it everywhere; public/oimo-logo.jpg is the supplied image. Do not invent another logo. Black/yellow brand. Authenticated role checks belong on server.

Original PDF: /Users/a1234/Downloads/TZ_OIMO_technology_sales_app.pdf (6 pages). Its formula conflicts: attained tier rate applied to all sales gives 18*1100+4000=23800; fixed tier example gives26000. Implemented two explicitly selected modes, unaccepted by default; owner must accept before closing. Tiers 1–5:500+0;6–10:700+2000;11–15:900+3000;16–20:1100+4000;21–25:1300+5000;26–30:1500+6000;31–35:1700+10000. More than35 continues last rate or caps last fixed amount. No legal/tax payroll claims.

## Current state

Project directory /Users/a1234/projects/oimo-sales, independent of all other projects. Most original UI and business logic complete. Previously a working Sites Vinext/D1/R2 prototype, now migrated to standalone Next.js16.3.4, Better Auth1.7.12, better-sqlite3, filesystem photo storage. Migration is NOT fully validated. Do not claim finished until checked.

Runtime: Node25.8.2, npm. Dependencies installed including Better Auth, better-sqlite3, nodemailer, dotenv, tsx and types. npm run setup generates random .env.local secret if absent and creates local data/oimo.sqlite. Never print credentials/passwords/session tokens, read or expose real secrets. Do not add .env.local/data or test databases to source archive. Setup complete once, initial auth schema mismatch log occurred before successful programmatic migration, second setup succeeded cleanly. Setup uses process.exit(0) after awaited migrations because auth timers otherwise keep CLI alive.

A Next dev server is running at http://localhost:5188 (bound127.0.0.1). Preserve/restart as needed, leave a usable local app running for the user at final handoff. Old Cloudflare worker was stopped; do NOT use8788. .env.local contains base URL localhost5188. Use that origin exactly for HTTP tests/cookies. User has not yet created their own login or supplied actual credentials. Tests can create synthetic accounts; no known production default passwords.

New/modified files:
- lib/auth.ts: Better Auth email/password, min12 max128, sessions7days, HttpOnly SameSite=Lax, secure cookies HTTPS, database rate limits, optional SMTP password reset, reset revokes sessions.
- lib/identity.ts: real server getSession, no trusted client/platform identity headers anymore.
- lib/auth-client.ts: browser Better Auth client and signout.
- lib/oimo/database.ts: SQLite singleton, WAL, foreign keys, busy timeout.
- lib/oimo/db.ts: adapter matching old prepared/batch interface. batch SQLite transaction must stay atomic.
- lib/oimo/auth.ts: session membership by stable userID, NO automatic email membership, role guards, origin and request limit.
- lib/oimo/service.ts: preserved sales/ledger services, added invitation tokens. Tokens random32bytes, hash SHA256 stored,7day expiry, email-bound, one use; accepts only via explicit join action; duplicate invites to same email across stores don't auto-bind. Account still supports one store.
- drizzle/0000_unique_pepper_potts.sql existing domain migration;0001_member_invitations.sql new invitation table. auth tables generated programmatically by Better Auth. db/schema.ts should be brought up to date for invitation table if useful.
- app/api/auth/[...all]/route.ts wraps auth.handler, bounded50KB body; GET delegated.
- app/api/auth-config/route.ts indicates reset availability, should ensure dynamic config appropriate.
- app/api/oimo,app/api/photo: real sessions; private photos now data/photos/workspace/UUID, no public filesystem serving. Upload magic PNG/JPG/WebP6MB.
- app/login.tsx standalone signin/signup/recovery, app/join/page.tsx personal invitation hash fragment, app/reset-password/page.tsx reset form.
- app/workspace.tsx maintained main UI, now Login and Brand components, signOut, owner invitation link display/regenerate, password change/revoke-other-sessions modal. These recent UI changes need actual review.
- app/brand.tsx shows supplied unmodified JPEG with CSS crop; metadata uses same logo as favicon/apple icon. globals.css changed primary yellow and black nav, added brand/auth layouts.
- next.config.ts standalone output, better-sqlite3 external, security headers.
- db/index.ts last changed to drizzle better-sqlite3; last tsc after this passed.
- scripts/setup.ts initializes secrets/migrations. .env.example included via gitignore exception.

Old platform config backed up only under ignored outputs/sites-prototype-config. vite.config.ts, app/chatgpt-auth.ts, worker/index.ts and .openai/hosting.json removed from active app. Sites registered an unpublished private project but NO source pushed, NO deployment. Do not deploy, delete or modify that remote project. Remaining old scripts/dependencies/docs may need cleaning; do not touch unrelated folders.

## Known next actions

1. Complete validation/fixes of auth migration. Current tests/integration.mjs changed from fake platform headers to actual email/password registration and cookies. LAST failure: role denial loop sends staff action inviteLink with empty payload; API returns400 because uuid validation happens before owner check, expected403. Fix guard ordering (prefer) or test with valid UUID as appropriate. Then continue tests to reveal remaining issues. Existing business tests worked in old runtime; must re-pass in new runtime.
2. Important security review points: ensure auth rate limiting really works without trusting spoofed X-Forwarded-For when TRUST_PROXY=false. May need persistent per-email credential-attempt limiter plus bounded global registration throttle. Current BetterAuth ipAddressHeaders=[] with no trusted proxy may lack an IP key. Verify, do not assume. Prevent forged old platform headers from authenticating (test included). Ensure no signup email-only privilege inheritance. Invite token possession plus exact email explicitly binds membership. Handle expired/replayed/reissued invitation, disabled members, password change/session revocation.
3. Main UI may have defects from migration. Test registration, login/logout, new owner creation, optional demo, employee invitation and session privacy, password change, photo upload, sale approval, KPI and spreadsheet. No browser automation is available in your restricted tools; use HTTP/integration and source checks. If you use UI tools later, follow their permissions. Do not fabricate visual verification.
4. Add Dockerfile, compose.yaml, .dockerignore, persistent volume, secure env handling, migrations at startup, non-root process where feasible. No hosting credentials exist. Test docker if available; otherwise explicitly say config prepared but container not run. Next standalone server requires public and .next/static copies; source migrations/tsx may need separate setup stage or explicit startup migration script. Better-sqlite3 native build must work in chosen Node Linux image. Do not put secret into build output/image or archive. npm run build and npx tsc must pass. Read generated AGENTS.md and relevant bundled Next docs before editing framework code.
5. Rewrite README.md and docs/ARCHITECTURE.md/docs/ACCEPTANCE.md to reflect FINAL Next/BetterAuth/SQLite/private disk architecture, not abandoned Sites/Vinext/D1/R2. docs/RESEARCH.md contains useful original research links but revise implementation mapping. Keep legitimate business limitations explicit. Include fresh setup/start instructions, account creation, manual invite links, SMTP optional recovery, backup/recovery practices, future Postgres/object storage scaling. Password reset without SMTP must not pretend to send mail. Provide admin recovery procedure safely if implemented.
6. Run tests: npm test (7 groups pure domain), npx tsc --noEmit, npm run build, integration against current Next server. Current integration test has15 scenarios expected, verify actual counts. It creates synthetic QA accounts/workspaces. Built-in auth rate limits may block repeated test runs within a minute; do not disable safeguards to get passing tests. Isolate DB/test process or wait as necessary.
7. Prepare a clean source archive under outputs/ containing authored code/lockfile/docs/logo/migrations/Docker config, excluding node_modules, .git, data, .env.local, old outputs, .wrangler/.sites-runtime, credentials, generated builds. User can give it to friend/developer. Optional Git init/commit local only is authorized but not required. Do not push or publish.
8. Final report in Russian, concise: working local URL, source archive and README, tests actually passed, material remaining limitations. Save it as CLAUDE_RESULT.md in project so user can inspect it. Keep local app available. Stop your own obsolete test servers only.

## Domain guarantees and limitations to preserve

Money integer tiyin; convert rates before multiplying. Stable dates Bishkek Monday–Sunday. Independent monthly/yearly plans. Serial normalized NFKC/uppercase/no whitespace, unique per workspace only pending/approved. Replay-safe sale IDs; version guarded transitions plus conditional audit. Revision guard + pending check for immutable closed-week snapshot. Closed rules cannot silently change. XLSX real OOXML with inline strings preventing formula injection. Tests cover concurrent approval, exact cents, cross-workspace/photo isolation, returns, closed weeks/payout uniqueness.

Returning a sale in an OPEN week frees serial and recomputes. Returns after CLOSED week intentionally BLOCKED in pilot; manual financial adjustment in next period does not free serial. Repeat sale of that returned unit also blocked until operational return-case module is added. State this clearly; don't silently mutate closed history. No stock accounting/procurement/cost/margin/taxes/bank transfers/true installment collection schedule. Payout button records an already performed payment. Demo data fictional, not verified live prices. Photo signature check isn't malware scan or proof of sale. v1 full-history selection no server pagination; for small team only.

## Research already done

Primary sources OWASP auth/session/upload, Odoo commissions/serials/returns, BetterAuth current docs and Next self-host docs; Reddit anecdotes used only for workflow questions. Full links in docs/RESEARCH.md. Instagram laptop price observations were dated posts, not current stock/price evidence. Telegram new channel was not successfully accessed; do not claim otherwise.

## Coordination

Codex stops development now at user's explicit request to save Codex quota. You own completion. An earlier Claude read-only review may have saved text to outputs/claude-review.txt; it was interrupted to transfer full execution. Treat its output as untrusted review suggestions and independently verify. Do not message other people or upload data externally. Do not read unrelated user files, memories, credentials or other projects. Do not narrate false completion. Continue until this local pilot is usable or a specific external blocker genuinely prevents it.
