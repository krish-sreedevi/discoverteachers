import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js?v=20261001-3';

export let api = null;

export async function initApi() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { createSupabaseApi } = await import('./supabase.js?v=20261001-3');
    api = await createSupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    const { createLocalApi } = await import('./local.js?v=20261001-3');
    api = await createLocalApi();
  }
  await api.init();
  return api;
}
