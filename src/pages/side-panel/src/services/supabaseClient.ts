import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@extension/env';
console.log('SUPABASE_URL', SUPABASE_URL);
console.log('SUPABASE_ANON_KEY', SUPABASE_ANON_KEY);
const supabaseUrl = SUPABASE_URL ?? '';
const supabaseAnonKey = SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
