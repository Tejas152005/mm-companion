# Man Matters Companion (concept, unofficial) - Phase 1
1. `npm install`
2. Supabase: create a project, run `supabase/schema.sql` in the SQL editor. Auth > URL Configuration: add http://localhost:5173 and your Vercel URL as redirect URLs.
3. `cp .env.example .env` and fill in the URL and anon key.
4. `npm run dev`. Demo Mode works even without Supabase keys.
5. Deploy: import the repo into Vercel and add the two VITE_ env vars. `vercel.json` handles route rewrites.

## Opening it on your phone while developing locally
`npm run dev` only listens on `http://localhost:5173`, which only means "this machine" — your phone
can't reach your laptop's localhost at all, which is why the link doesn't load there. `vite.config.js`
now sets `server: { host: true }`, so after `npm run dev` the terminal will also print a second URL
like `http://192.168.1.23:5173` (your laptop's LAN address). Open that one on your phone instead,
with both devices on the same Wi-Fi. If Windows prompts to allow Node/Vite through the firewall on
private networks, click Allow — if you click Deny by mistake, Windows Defender Firewall settings is
where to fix it. Camera-based AR (`/goal`, Start camera) specifically needs `https`, so test that part
either on the deployed Vercel link or by using the "Use a photo instead" button locally.

## Magic-link sign-in bouncing back to the sign-in screen
If clicking the sign-in link from your email reopens the home/sign-in screen instead of logging you
in, it's almost always one of these two things — both are about your Supabase project settings, not
the code:
- **Auth > URL Configuration** must list every exact address you use: `http://localhost:5173` (or
  whatever your LAN address from above is) for local testing, and your deployed Vercel URL for the
  live link. A mismatch (including `http` vs `https`, or a missing/extra trailing slash) makes
  Supabase refuse the link.
- **Click the link in the same place you requested it.** Opening the email in a different browser
  than the one you used to sign up can break some sign-in flows. The app now uses an "implicit" sign-in
  flow instead, which avoids this in most cases, but if it still happens, copy the link and paste it
  into the same browser you requested it from, rather than letting your mail app's "open in browser"
  button choose one for you.

If the link really has expired or was already used, the app now shows that reason on the sign-in
screen instead of silently asking for your email again — just request a new link.
