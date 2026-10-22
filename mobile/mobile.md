# Mobile build checklist

One feature at a time: pick the next unchecked item, build it, verify (`npx tsc --noEmit` + `npx expo export --platform ios`), commit, push, then move on.

UI reference for every screen: the **"Vitals iOS v5"** artifact (https://claude.ai/artifact/SkvEMr7uqwyj3fMETZKMqV). Where an item says "design", that is where the layout comes from.

Status: `[x]` done, `[ ]` not started.

---

## A. Foundation (no visible UI, everything else depends on it)

- [x] **A1. Theme tokens** — The 5 color schemes (vitals, forest, ocean, dusk, rose) in light and dark, plus a `useAppTheme` hook. Every screen reads its colors from here instead of hardcoding them.
- [x] **A2. Navigation shell** — The 4 bottom tabs (Budget, Score, Progress, Me) and an auth group, with placeholder screens.
- [x] **A3. API connection** — Tell the shared package where the backend lives (`setApiBaseUrl` with `EXPO_PUBLIC_API_URL`), same pattern web uses. Needed before any score/narrative call works.
- [x] **A4. Supabase client** — Create the Supabase client for the phone, storing the login session in secure storage (`expo-secure-store`) instead of cookies. Needed before sign-in works.
- [x] **A5. Mobile store (guest mode)** — A Zustand store holding budget cards, goals, financial profile, score results. In-memory only, same as web's guests. Uses the shared types and shared helper functions (`budgetToFormData` etc.). Every screen reads from it.
- [x] **A6. Store sync for signed-in users** — On login, load the user's cards/goals/profile from Supabase into the store; after that every change also saves to Supabase in the background. Mirrors web's `AccountHydrator` + store write-through.

## B. Auth

- [x] **B1. Sign-in screen UI** — Logo, email + password fields, sign in / sign up switch, "Continue without account" link, trust line ("your data is private and never sold").
- [x] **B2. Email sign-in and sign-up logic** — Wire B1 to Supabase.
- [x] **B3. Google sign-in** — Native Google button and flow.
- [x] **B4. Apple sign-in** — Required by the App Store once Google sign-in exists. Needs the Apple Developer account.
- [x] **B5. Profile setup screen** — First login only: name, date of birth, gender, country (all skippable). Same fields as web's `/profile`.
- [x] **B6. Auth routing** — Decide which screen opens at launch: guests go straight to Budget, signed-out first launch sees sign-in, signed-in users go to Budget. Never block guests.

## C. Budget tab (the main screen — design: "Budget")

Build in this order, each piece visible on its own with sample data first, then wired to the store.

- [x] **C1. Screen header** — Title "Budget", two icon buttons: score form (opens E6) and Split.
- [x] **C2. Score card front** — Big score number, label ("Good"), "3 of 4 metrics covered". Shows the live partial score.
- [x] **C3. Metric pills** — 2x2 grid: Savings, Debt, Housing, Emergency. Green when answered, amber with "?" when not. Tap one to expand (C4).
- [x] **C4. Metric expand panel** — Opens under the card: a slider to try different values and see the score change; shows the real value and where it came from ("Based on: your Rent card"). Needs a slider library.
- [x] **C5. Score card flip (back = AI narrative)** — Info button flips the card in 3D to show the AI narrative; flip back with the same button.
- [x] **C6. AI insight strip** — One-line summary under the score card; tapping it jumps to the Score tab.
- [x] **C7. Income card** — System card: balance to split, amount input + Add button, tap the balance to correct it.
- [x] **C8. Float card** — System card (the design calls it "Float"; web calls it "Cash in Hand"): unallocated cash, "Next split: +$X".
- [x] **C9. Category card** — Colored header with Expense/Saving chip and pause button, name, amount, "% of income", and a progress bar for saving cards with a goal. Paused cards are faded.
- [x] **C10. Card grid** — 2-column list of C7 + C8 + C9 cards.
- [x] **C11. Add card button** — Dashed "+ Add card" button; opens the card sheet (C12) in "new" mode.
- [x] **C12. Card detail sheet** — Bottom sheet: editable name in the colored header, Expense/Saving toggle, Pause and Delete (delete asks to confirm), allocation field with $ / % toggle, goal amount (saving only), read-only stats (balance, last split, next split), goal progress bar, Save button. Also needs "move from Float" and balance correction, which web has.
- [x] **C13. Split action** — The Split button spreads the income across cards (same logic as web's `distributeBudget`), with the glow cue after income changes.
- [x] **C14. Live score calculation** — When cards or profile change, wait ~1.5s then call the score API and refresh C2/C3. Show a real error if it fails (web hides nothing now).
- [x] **C15. Financial profile prompts** — The three questions (total debt, monthly debt payments, total savings) plus the rent/mortgage and monthly-expenses fallbacks. Fallbacks start as "Not set" and only save on explicit confirm.

## D. Score tab (design: "Score")

- [x] **D1. Score ring** — Circular SVG ring that fills to the score, big number in the middle.
- [x] **D2. Label and change** — "Good", and "+3 from last check-in".
- [x] **D3. Story / What If sub-tabs** — Two-tab switch under the ring.
- [x] **D4. Your Story tab** — Streamed AI narrative card, plus the 4 metric mini-tiles (value + status).
- [x] **D5. What If tab** — 4 tappable tiles; each expands into a slider and the resulting score.
- [ ] **D6. Score form sheet** — 4-step bottom sheet (Income, Expenses, Position, Profile) matching web's form fields. Ends with "Calculate score".

## E. Progress tab (design: "Progress")

- [x] **E1. Score trend chart** — Bar/line chart of the score month by month.
- [x] **E2. Started / Trend / Now row** — Three numbers under the chart.
- [x] **E3. Metric change rows** — Per-metric "12% → 18%" lines with colored arrows.
- [x] **E4. Streak note** — "4-month streak" line.
- Needs snapshots saved to Supabase first (see G4), otherwise guests only see the current session.

## F. Me tab (design: "Me")

- [x] **F1. Profile header** — Avatar, name, score badge.
- [x] **F2. Dark mode switch** — Follows the system by default.
- [x] **F3. Theme picker** — Choose one of the 5 schemes; saved so it persists (`user_settings.color_scheme` for signed-in users). Makes A1's fixed "vitals" scheme selectable.
- [ ] **F4. Notification toggles** — Weekly check-in and goal milestones. Needs G2 first.
- [ ] **F5. Export data** — PDF share sheet.
- [x] **F6. Clear all data** — Deletes the signed-in user's budget/goals/history but keeps the account.
- [x] **F7. Delete account** — Calls the backend `DELETE /account`.
- [ ] **F8. Footer** — Disclaimer, version, feedback link. **Fix the wording**: the design says "Data stays on your device", which is wrong now that signed-in data is stored in Supabase.

## G. After V1 (deliberately later)

- [x] **G1. Chat** — Floating chat button and chat bottom sheet with starter questions (design shows it on Budget). Needs the streaming test on React Native first.
- [x] **G2. Push notifications** — `expo-notifications` setup.
- [x] **G3. PDF bank statement import** — File picker, upload, review screen.
- [x] **G4. Snapshots sync** — Save score check-ins to Supabase so Progress works across sessions and devices (also still missing on web).
- [ ] **G5. Free-tier one-device limit** — Register the session on login and enforce the limit (the table exists, nothing uses it yet, on web or mobile).
- [ ] **G6. TestFlight build** — Needs the Apple Developer account ($99/year).
- [ ] **G7. App Store submission** — Icons, screenshots, privacy details.

---

## Notes

- Other design artifacts to read before building the matching item: **Partial Score UX** (https://claude.ai/artifact/Tf6HXKjmYfJYtT3XdX3jGU) for C2 to C4, **Chat FAB Icons / Options** for G1. Some of this already exists on web and must match.
- The mobile store (`src/lib/store.ts`) repeats the web store's budget logic (Split, transfer, delete) instead of sharing it. If the web logic changes, change it here too, or move the logic into `packages/shared`.
- Needs a real `mobile/.env` (copy `.env.example`) for sign-in and sync to work. Without it the app still opens for guests.
- Not yet tried on a simulator or phone: Xcode isn't installed here, so checks so far are typecheck + bundle only.
- Streaming (narrative, chat) uses `res.body.getReader()`, which React Native's fetch may not support. Test this early when starting D4 or G1; a fallback may be needed.
- Keep code simple. Prefer the plainest construct that works.
