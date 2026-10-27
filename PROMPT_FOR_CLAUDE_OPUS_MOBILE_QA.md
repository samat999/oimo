# Prompt for Claude Opus — OIMO full functional and mobile QA

Use **Claude Opus 5.5 with Extra/maximum reasoning** for this task. Work autonomously in the linked `oimo-sales` folder. Do not stop after analysis: inspect, reproduce, fix, test, and document the final result. Do not claim anything passed without evidence from the running application.

## Objective

Audit the complete OIMO sales web application and make every implemented function work as expected on desktop and mobile. Fix the mobile bottom navigation, whose icons and labels currently sit too close to the physical bottom edge. They need to be slightly higher, comfortable to tap, clear of browser/system UI and phone safe areas, while remaining compact.

## Start with evidence

1. Read `README.md`, `CLAUDE_RESULT.md`, `docs/OWNER_GUIDE_RU.md`, `docs/DEVELOPER_GUIDE_RU.md`, `docs/PDF_CHECKLIST.md`, `docs/ARCHITECTURE.md`, `package.json`, the application code, migrations, and all tests.
2. Inspect the current running configuration without printing secrets. Back up the SQLite database before any test that could mutate it. Use only synthetic test accounts, shops, sales, serial numbers, photos, and invitation emails.
3. Reproduce each user journey through the real browser UI. Do not treat a page load, HTTP 200, unit test, or direct API call as proof that a UI function works.
4. Check browser console errors, failed network requests, server logs, validation messages, loading states, empty states, repeated taps, refreshes, back navigation, and session persistence.

## Research and mobile design rules

Before changing the navigation, review current primary guidance and cite the sources in the final report:

- Apple Human Interface Guidelines — tab bars and safe areas: https://developer.apple.com/design/human-interface-guidelines/tab-bars and https://developer.apple.com/documentation/uikit/positioning-content-relative-to-the-safe-area
- MDN CSS environment variables and `env(safe-area-inset-bottom)`: https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Environment_variables/Using
- web.dev accessible tap targets: https://web.dev/articles/accessible-tap-targets

Apply these principles:

- Bottom navigation represents top-level destinations; keep labels visible and stable. The center **Продажа** control is an action and must remain visually distinct.
- Every mobile tap target must be at least 44×44 CSS px; target approximately 48×48 px where the layout allows it.
- Respect `env(safe-area-inset-bottom, 0px)`, but never rely on it as the only bottom spacing because it is commonly zero. Add a small base gap and then the safe-area inset.
- Keep scrolling content above the entire computed navigation height, including the safe area and the raised center action.
- Avoid hard-coded device detection. Use responsive CSS, safe-area variables, dynamic viewport units where appropriate, and `any-pointer: coarse` only when it improves touch behavior.
- No button, label, badge, toast, sheet, keyboard, or browser toolbar may overlap the bottom navigation.

## Specific bottom-navigation defect

The current mobile rules in `app/globals.css` include a fixed `.bottom-nav` with `padding: 6px 4px env(safe-area-inset-bottom)` and buttons with `min-height: 56px`. On devices where the safe-area inset resolves to zero, the labels appear too low. Diagnose this in screenshots and computed styles, then implement the smallest robust correction.

Expected result:

- Give the navigation a modest nonzero bottom breathing space in addition to the safe-area inset, for example through a token and a calculation such as `calc(var(--mobile-nav-bottom-gap) + env(safe-area-inset-bottom, 0px))`. Choose the final value from visual testing, not blindly from this example.
- Raise the icon/label group slightly without making the bar oversized.
- Preserve the centered raised **Продажа** button, its full hit area, border, shadow, label, and correct stacking.
- Derive the page bottom padding and toast position from the final bar geometry so content is never hidden.
- Verify portrait, landscape, browser chrome expanded/collapsed, standalone/PWA mode when possible, iOS-style safe area, Android with zero safe area, and zoom/text scaling.

## Complete functional test matrix

Test both roles and record pass/fail evidence for every row.

### Authentication and onboarding

- Sign up with email and password; validation for invalid email, short password, duplicate account, and wrong password.
- Sign in, sign out, refresh, expired/invalid session behavior, and password recovery behavior supported by the current configuration.
- A new account without a workspace can create a store exactly once; double tap/retry stays idempotent.
- A seller invited to a store cannot create or access an owner-only store.

### Owner workflow

- Create/open store and see correct owner navigation on desktop sidebar and mobile bottom navigation/More sheet.
- Create, edit, search/filter, and use catalog items wherever implemented.
- Invite an employee; copy/open the invitation URL; handle invalid, expired, reused, duplicate, and concurrent invitations correctly.
- View team members and role-appropriate data.
- Review a submitted sale: photo, model/category, serial number, price, payment method, employee, date, and status.
- Approve and reject a sale; repeat/double-click actions must not create conflicting state.
- Test returns according to open/closed-period rules and verify audit history.
- Create and view weekly/monthly/yearly plans where supported.
- Verify ranking, dashboard metrics, filters, search, KPI/payroll views, period closing, and exports if actually implemented.

### Seller workflow

- Accept invitation, register/sign in, and see only allowed seller navigation and data.
- Add a sale from a phone using camera/file upload; preview/replace/remove photo; validate missing fields, invalid price, duplicate serial number, long model names, slow upload, repeated submit, and offline/network failure.
- See pending/approved/rejected/returned status updates, personal plan/progress, ranking visibility, and only the seller's permitted payroll data.
- Confirm owner-only controls and other employees' private information are inaccessible through both UI and direct requests.

### Cross-cutting behavior

- Permission/RBAC enforcement server-side, tenant/store isolation, CSRF/trusted-origin behavior, LAN URL and `.local` hostname, test-access mode, photo authorization, audit log, idempotency, and duplicate prevention.
- Empty, loading, success, validation, unauthorized, not-found, and server-error states.
- Keyboard navigation, visible focus, screen-reader labels, color contrast, 200% zoom/reflow, reduced motion, and tap target sizing.
- No secrets, stack traces, framework names, Claude/ChatGPT/Codex references, or development copy in the product UI.

## Responsive visual QA

Test at minimum:

- 320×568 (small iPhone/SE class)
- 360×800 and 360×640 (common Android sizes)
- 375×667, 390×844, 393×852, and 430×932 (modern iPhones)
- 412×915 (large Android)
- 768×1024 and 820×1180 (tablets)
- 1024×768, 1280×800, 1366×768, and 1440×900 (desktop/laptop)
- portrait and landscape for representative phones/tablets

At every size inspect: overflow, clipped text, long names/prices, sticky headers, modals, keyboard-open forms, tables/cards, bottom navigation, More sheet, center sale action, safe area, content bottom padding, and toasts. Take before/after screenshots of the mobile bar at small iPhone, modern iPhone with safe area, and Android with zero safe area. Use screenshot comparison or measurable bounding boxes; visual judgment alone is insufficient.

## Implementation constraints

- Preserve the current brand, information architecture, role model, business rules, and desktop sidebar unless a verified bug requires a change.
- Make focused changes; do not rewrite the application or replace working architecture.
- Do not weaken authentication, authorization, CSRF, tenant isolation, or private-photo access to make tests pass.
- Keep test/LAN access clearly separated from production behavior.
- Add regression tests for every fixed defect, especially bottom spacing/safe-area behavior and content clearance.
- Do not delete real data, Docker data, backups, or user files.

## Required validation

Run and report the exact result of all applicable commands:

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run test:isolated
npm run build
npm run test:e2e
npm audit
```

Also run the full browser matrix against the production build through the actual LAN IP and `MacBook-Air.local`, not only `localhost`. Restart the existing service safely after a successful build and verify that port 5188 listens on all intended interfaces. Keep the service running when finished.

## Deliverables

1. Implemented fixes and regression tests.
2. `outputs/mobile-bottom-nav-before-after/` with labeled screenshots and viewport metadata.
3. A function-by-function test matrix in `docs/FUNCTIONAL_QA_REPORT_RU.md` containing scenario, role, viewport, expected result, actual result, evidence, and pass/fail.
4. Update `CLAUDE_RESULT.md`, `README.md`, and relevant technical documentation with only verified facts.
5. Refresh the source archive without secrets, databases, uploaded photos, test credentials, `node_modules`, or build caches.
6. Final response must state:
   - root cause of every defect fixed;
   - changed files;
   - exact test totals and failures/skips;
   - tested browsers/viewports;
   - location of screenshots and report;
   - remaining limitations or unverified items;
   - current phone URLs and whether the service is running.

Do not use phrases like “should work,” “looks fine,” or “probably.” If something cannot be verified, mark it **UNVERIFIED**, explain why, and provide the smallest next step needed to verify it.
