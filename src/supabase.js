// Подключение к Supabase. Адрес и ключ берутся из переменных окружения Vercel.
// Если они не заданы, синхронизация просто выключена, а приложение работает как раньше.
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const sb = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
