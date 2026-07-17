import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { sendLocalNotification } from '@/lib/notifications';

interface Profile {
  id: string;
  nik: string;
  login_id?: string;
  nama: string;
  jabatan: string;
  no_hp: string;
  email?: string;
  alamat?: string;
  status: string;
  role?: string;
  avatar_url?: string;
  created_at: string;
}

interface AuthState {
  user: Profile | null;
  session: Session | null;
  isLoading: boolean;
  setUser: (user: Profile | null) => void;
  setSession: (session: Session | null) => void;
  login: (loginId: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),

      // Login menggunakan login_id (auto-generated) + password
      login: async (loginId: string, password: string) => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('login_id', loginId)
            .eq('password_hash', password)
            .eq('status', 'active')
            .single();

          if (error || !data) {
            return { success: false, error: 'ID Anggota atau Password salah' };
          }

          // Log aktivitas login
          await supabase.rpc('log_user_activity', {
            p_user_id: data.id,
            p_user_name: data.nama,
            p_action: 'login',
            p_details: 'Login berhasil',
          });

          // Notifikasi lokal
          await sendLocalNotification(
            'Selamat Datang',
            `Halo ${data.nama}, Anda berhasil login ke PKK Digital`
          );

          set({ user: data });
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      },

      logout: async () => {
        const { user } = get();
        if (user) {
          await supabase.rpc('log_user_activity', {
            p_user_id: user.id,
            p_user_name: user.nama,
            p_action: 'logout',
            p_details: 'Logout berhasil',
          });
        }
        await supabase.auth.signOut();
        set({ user: null, session: null });
      },

      updatePassword: async (newPassword: string) => {
        const { user } = get();
        if (!user) return { success: false, error: 'Tidak ada sesi aktif' };
        try {
          const { error } = await supabase
            .from('profiles')
            .update({ password_hash: newPassword })
            .eq('id', user.id);
          if (error) throw error;
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message };
        }
      },
    }),
    {
      name: 'pkk-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setUser(state.user);
        useAuthStore.setState({ isLoading: false });
      },
    }
  )
);
