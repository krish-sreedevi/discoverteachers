import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

export let api = null;

export async function initApi() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { createSupabaseApi } = await import('./supabase.js');
    api = await createSupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    const { createLocalApi } = await import('./local.js');
    api = await createLocalApi();
  }
  await api.init();
  return api;
}
