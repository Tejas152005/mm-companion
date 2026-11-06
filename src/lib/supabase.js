import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL, key = import.meta.env.VITE_SUPABASE_ANON_KEY
// flowType: 'implicit' puts the session tokens directly in the magic-link URL, so the link works
// even if it's opened in a different browser/app than the one used to request it (e.g. a mail app
// opening the link in the system default browser). PKCE's alternative requires a locally-stored
// code verifier from the *same* browser, which is the usual cause of a magic link bouncing back
// to the sign-in screen instead of logging you in.
export const supabase = url && key
  ? createClient(url, key, { auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } })
  : null   // null => demo-only mode
