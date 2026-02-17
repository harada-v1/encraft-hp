import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'antigravity-auth-token',
        // @ts-ignore: cookieOptions is used for cross-domain session sharing but may not be in all type versions
        cookieOptions: {
            domain: process.env.NODE_ENV === 'production' ? '.ma-encraft.com' : undefined,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        }
    }
});
