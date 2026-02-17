import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: {
                domain: process.env.NODE_ENV === 'production' ? '.ma-encraft.com' : undefined,
                secure: process.env.NODE_ENV === 'production',
            }
        }
    )
}
