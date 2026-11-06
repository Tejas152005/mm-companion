# Man Matters Companion: Phases 4 to 7 (all at once)

This package finishes the app. It sits on top of Phases 1 to 3, which you already have running.
Everything is a concept app: offers are labelled "concept offer", the AR preview is labelled "illustration, not a guaranteed result", and nothing gives medical advice.

## Install in 8 steps

1. **Back up your project folder** (copy it somewhere).
2. **Unzip this package over your project folder.** Say yes to "replace files". It replaces these files: `src/App.jsx`, `src/components/Shell.jsx`, `src/lib/i18n.js`, `src/lib/session.jsx`, `src/pages/Offers.jsx`, `src/pages/Assistant.jsx`, `api/assistant.js`, `vercel.json`. Everything else in the zip is new.
3. **Make the small edits to your other files:** in the VS Code terminal run
   ```
   node apply-patches.mjs
   ```
   It edits Home, Settings, Onboarding, Routine, Refill, Journey, Progress and `index.html`, prints what it changed, and keeps your originals in `.backup-before-phase4-7/`. If it prints a WARNING, that one edit was not made (see "If a patch warns" at the bottom). You can run it twice safely.
4. **Install the camera library:** `npm install @mediapipe/tasks-vision@0.10.14`
5. **Database:** in the Supabase SQL editor run `supabase/phase4.sql`, then `supabase/phase6.sql`. Each runs once. They need `schema.sql`, `phase2.sql` and `phase3.sql` to have been run before.
6. **Make yourself a brand-team member** (so the real dashboard opens for you). In the SQL editor:
   `insert into brand_admins (email) values ('your-login-email@example.com');`
7. `npm run dev`, then try Demo Mode first. Check each phase below.
8. **Deploy** (Phase 7 steps below). The assistant, camera preview on phones, and install-to-home-screen only work properly on the deployed https link.

Also check that `package.json` contains `"type": "module"` (Vite projects have it by default). The assistant function needs it.

---

## Phases 1 to 3 (already done, for the record)

| Phase | What it is | How it was implemented |
|---|---|---|
| 1 | Sign-in, onboarding, consent, Demo Mode, home | Supabase magic link, six separate consent purposes stored as append-only rows, a seeded demo persona that runs fully in the browser |
| 2 | Routine, reminders, journey, refill and cost, settings | Calendar (.ics) reminders, week-by-week timeline, refill maths from numbers the person types, consent toggles, data export, delete account |
| 3 | Photos, ratings, side-effect notes | Private storage bucket with consent enforced by the database, weekly self-ratings, a summary people can show a doctor or pharmacist |

---

## Phase 4: Offers, Holi mode, referrals, student discount, loyalty

**What it does**
- **Offers tab** with a festival banner. Diwali is live now (8 Nov 2026). **Holi hair-care mode** switches on automatically from 8 March 2027 (14 days before Holi on 22 March) to 24 March, and a "Preview Holi mode (for reviewers)" button shows it any time. Holi mode has a before / during / after checklist (general care habits only) and a button that adds two reminders to the phone calendar.
- **One offer at a time.** The biggest open offer applies, offers never stack. The page shows what it would save using the pack price the person typed in Refill & cost. No Man Matters prices are invented. All percentages are made-up concept values.
- **Rewards tab:** points (10 per check-in, 20 per weekly rating, 15 per photo, 100 when a friend joins with your code, 50 for joining with a code), three tiers, and three concept rewards. The database works out the balance and enforces the cost, so it can't be edited from the browser.
- **Referrals:** each person gets a code and a share link. Opening `https://your-app/?ref=CODE` remembers the code and applies it after sign-up.
- **Student tab:** college name, a photo of the student ID, an explicit tick-box consent, then manual review.

**How student verification works (and why it is built this way)**
- An ID photo is sensitive, so it is stored in a private bucket, shrunk, visible only to the student, and deleted as soon as the student is approved or cancels.
- A signed-in person can never approve themselves. A database trigger blocks it.
- **You are the reviewer.** To review: Supabase → Storage → `student-ids` → open the person's folder and look at the photo. Then in the SQL editor run `select approve_student('<user id>');` or `select reject_student('<user id>');` (the user id is in Authentication → Users). Approval lasts 365 days.
- The app deletes the ID photo itself the next time that student opens Offers, Rewards or Student. You can also delete the file by hand.
- There is no automatic ID reading. The screen says so.
- In Demo Mode there is a "Demo: simulate approval" button, so reviewers can see the whole flow.

**Check it:** Demo → Offers: see the Diwali banner, press "Preview Holi mode", tick items, download the reminders. Student tab → submit → simulate approval → back to Offers and see the student offer open. Rewards tab: redeem the free-delivery reward. Real account: do the same, then check `student_verifications`, `redemptions`, `referral_codes` in Table Editor.

**Limits:** points go down if someone deletes their check-ins or photos, because they are counted from the data. Referral codes can be abused by someone making many accounts. That is acceptable for a concept app and would need checks in a real product.

---

## Phase 5: AR goal preview

**What it does:** Journey → Goal preview. The phone camera (or an uploaded photo) finds the face on the device with MediaPipe, and an illustration is drawn on top: a hair-density illustration above the forehead, or a beard-density illustration along the jaw. A slider changes the density. "Save snapshot" downloads a picture to the phone with the words "Illustration, not a guaranteed result" burned into it.

**Privacy:** the video never leaves the phone and nothing is uploaded. The face model (a few MB) is downloaded from Google's and jsDelivr's servers the first time, so the first use needs internet. The library is loaded only when someone opens this screen.

**How to implement:** `npm install @mediapipe/tasks-vision@0.10.14` (step 4 above). Files: `src/lib/ar.js` (face finding and drawing), `src/pages/Goal.jsx` (the screen).

**Check it:** on your laptop at localhost: Start camera, allow the camera, switch Hair and Beard, move the slider. Then on your phone using the **deployed https link** (the camera does not work on a plain `http://192.168...` address). If the camera is blocked, "Use a photo instead" works everywhere.

**Limits:** it is an illustration, not a simulation of real hair growth. It looks best with a front-facing face in good light.

---

## Phase 6: Assistant, languages, brand dashboard

**Assistant (Ask tab)**
- Real accounts call `api/assistant.js`, a server function. The Claude key lives only there.
- The function checks, in order: signed in, the assistant consent is on, the daily limit (20 questions a day per person, counted in the database), then calls Claude. It never gives medical advice: no diagnosis, no promises, no changes to treatment, and it sends people with alarming symptoms to medical help.
- It answers in English, Hindi or Bengali, matching the app language, and can see a short summary of the person's routine.
- **Demo Mode uses five pre-written answers**, so a reviewer can't hit a broken or abusable server call.
- Set these in Vercel (Settings → Environment Variables): `ANTHROPIC_API_KEY` (required). Optional: `ANTHROPIC_MODEL` (default `claude-haiku-5-5`, the cheapest) and `ASSISTANT_DAILY_LIMIT` (default 20). **Set a low monthly spend limit in the Anthropic console before you deploy.**
- `npm run dev` does not run `api/`. Test the assistant on the deployed link, or with `npx vercel dev`.

**Languages**
- English, Hindi and Bengali. Pages call `L("English sentence")`, and the sentences and their translations live in `src/lib/strings.json` (about 225 entries). Anything without a translation falls back to English, so nothing breaks.
- **Translated:** welcome, tabs, Home, check-in, consent wording and all six consent purposes, Settings, onboarding, routine labels, offers, rewards, student, goal preview, assistant questions and answers, brand view, and every "not medical advice / concept / illustration" notice.
- **Still in English:** the longer explanatory paragraphs on Journey, Refill and Progress, the Journey stage descriptions, and a few error messages.
- **A native speaker must check the Hindi and Bengali before you submit.** I wrote them carefully, but I can't guarantee they read naturally. Fix any line by editing `strings.json`.

**Brand dashboard (Home → "Brand view")**
- Shows where customers buy (the Amazon gap from Part 1), why people stop, how many are still using the product by week 4, 8, 12 and 16, how many note something on their skin or scalp in the first two weeks, and how the "do you notice a change" rating moves by week.
- Only people who turned on "Share anonymous trends" are counted. It needs at least 5 such people, and any group under 5 is hidden. Only people listed in `brand_admins` can open the real version.
- **Demo Mode and everyone not on the list see clearly labelled sample data**, so reviewers always see a filled-in dashboard. The numbers are illustrative.

**Check it:** Demo → Ask: tap the sample questions. Switch to Hindi and Bengali in Settings and look through every tab. Brand view shows the sample banner. On the deployed app with a real account (and the assistant consent on): ask a question, and check `assistant_usage` in the Table Editor.

---

## Phase 7: Install on the phone, offline shell, deploy

**What it does:** the app can be added to the home screen and opens like an app. It has a name, an icon (a progress ring), a green status bar, and the app shell opens even with no internet. Pages are always fetched fresh when online. Sign-in, data, the assistant and AR are never cached. An "Add it to your home screen" banner appears (with iPhone instructions on iPhones) and can be dismissed.

**Not included, on purpose: real push notifications.** They need a server that fires at each person's reminder time, and Vercel's free plan only runs scheduled jobs once a day. Reminders still work through the phone-calendar files and the in-app banner.

**Files:** `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`, `src/lib/pwa.js`, `src/components/InstallBanner.jsx`, `vercel.json`. The patch script adds these lines to `index.html` (add them by hand inside `<head>` if it printed a WARNING):
```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#12281F" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="MM Companion" />
```
If your dark green isn't `#12281F`, change `theme_color` in the manifest and the `theme-color` line to match your Tailwind `ink` colour.

**Deploy:**
1. Push to GitHub (make sure `.env` is in `.gitignore`).
2. Vercel → your project → Settings → Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` (and optionally the two others above). Redeploy.
3. Supabase → Authentication → URL Configuration: Site URL and Redirect URL = your Vercel URL (keep the localhost ones too).
4. On your phone, open the Vercel link: install it, then run the full check below.

**Final check (on a phone, deployed link):**
- Demo Mode: Today, Journey (Timeline, Photos & ratings, Goal preview), Routine, Offers (Preview Holi mode), Rewards, Student, Ask, Brand view.
- Switch to Hindi and Bengali and look through each tab.
- Real account: sign up, onboarding, a check-in, a photo, a weekly rating, redeem a reward, ask the assistant, delete account.
- Add to home screen, open it from the icon, turn on airplane mode: the app should still open.

---

## What was and wasn't tested

**Tested here:** all new files compile and every import resolves; the offer and festival rules, points tiers, reward costs against the SQL, Holi calendar dates, translation completeness and placeholders, and the AR drawing code with simulated face points (13 checks); the patch script on copies of your Phase 2/3 code, including running it twice; the icons render.

**Not tested here (no Supabase project, browser, phone or internet in my workspace):** the two SQL files have not been run against a real Postgres, so run them and send me any error text; the screens have not been looked at in a browser; the camera and face model have not run on a real face; the assistant function has not been called; installing and offline mode have not been tried on a phone. Treat the first launch as the real test.

## If a patch warns

The patch script looks for exact lines from the code I gave you earlier. If you edited those lines, it prints a WARNING and skips that one edit. The edits it makes are:
- `Home.jsx`: add `<Link to="/dashboard">Brand view</Link>` beside Settings, and replace the points counter with `<Link to="/rewards">Rewards</Link>`.
- `Settings.jsx`: import `removeAllFiles` from `../lib/files` and call `removeAllFiles(user.id)` instead of `removeAllPhotos(user.id)` when deleting the account.
- Translation: wrapping text in `L("...")`. If it was skipped, that screen simply stays in English.
Send me the warning text and the file, and I'll give you the exact lines.
