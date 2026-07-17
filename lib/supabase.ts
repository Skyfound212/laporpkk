import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    '[PKK Digital] EXPO_PUBLIC_SUPABASE_URL tidak ditemukan.\n' +
    'Pastikan file .env ada di root project dengan isi:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    '[PKK Digital] EXPO_PUBLIC_SUPABASE_ANON_KEY tidak ditemukan.\n' +
    'Pastikan file .env ada di root project dengan isi:\n' +
    'EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n' +
    'EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
  );
}

if (!supabaseUrl.startsWith('https://')) {
  throw new Error(
    `[PKK Digital] EXPO_PUBLIC_SUPABASE_URL tidak valid: "${supabaseUrl}"\n` +
    'URL harus dimulai dengan https://'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
