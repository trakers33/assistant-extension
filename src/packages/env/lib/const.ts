export const IS_DEV = process.env['CLI_CEB_DEV'] === 'true';
export const IS_PROD = !IS_DEV;
export const IS_FIREFOX = process.env['CLI_CEB_FIREFOX'] === 'true';
export const IS_CI = process.env['CEB_CI'] === 'true';
export const SUPABASE_URL = process.env['CEB_SUPABASE_URL'];
export const SUPABASE_ANON_KEY = process.env['CEB_SUPABASE_ANON_KEY'];
export const GOOGLE_CLIENT_ID = process.env['CEB_GOOGLE_CLIENT_ID'];
