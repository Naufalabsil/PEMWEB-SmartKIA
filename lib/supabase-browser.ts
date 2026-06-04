import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function createSupabaseBrowserClient(accessToken?: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
    
  }
  console.log(
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  console.log(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}
