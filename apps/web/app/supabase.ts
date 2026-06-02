import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qxndlpezwqjhlecdxbwe.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4bmRscGV6d3FqaGxlY2R4YndlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MDI5NzksImV4cCI6MjA5NTQ3ODk3OX0.Z2ndjjhTfE8857vb8rbrWNZoLTF5LL24wXw24bnrOxM';

let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_supabase) {
    if (!supabaseUrl) {
      throw new Error('supabaseUrl is required.');
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return (getSupabase() as any)[prop];
  },
});
