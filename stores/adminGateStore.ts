import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

/**
 * Gates access to everything under app/admin/*.
 *
 * Deliberately NOT persisted to AsyncStorage: the unlock only lasts for the
 * current app session (in-memory), so re-opening the app always requires
 * the access code again, even if the user stays logged in.
 */
interface AdminGateState {
  isUnlocked: boolean;
  checking: boolean;
  unlock: (code: string) => Promise<{ success: boolean; error?: string }>;
  lock: () => void;
  changeCode: (currentCode: string, newCode: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAdminGateStore = create<AdminGateState>((set) => ({
  isUnlocked: false,
  checking: false,

  unlock: async (code: string) => {
    set({ checking: true });
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('admin_access_code')
        .eq('id', 1)
        .single();

      if (error || !data) {
        return { success: false, error: 'Gagal memeriksa kode akses. Coba lagi.' };
      }

      if (code.trim() !== data.admin_access_code) {
        return { success: false, error: 'Kode akses admin salah' };
      }

      set({ isUnlocked: true });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Terjadi kesalahan' };
    } finally {
      set({ checking: false });
    }
  },

  lock: () => set({ isUnlocked: false }),

  changeCode: async (currentCode: string, newCode: string) => {
    if (!newCode.trim() || newCode.trim().length < 4) {
      return { success: false, error: 'Kode akses baru minimal 4 karakter' };
    }
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('admin_access_code')
        .eq('id', 1)
        .single();

      if (error || !data) {
        return { success: false, error: 'Gagal memeriksa kode akses saat ini' };
      }
      if (currentCode.trim() !== data.admin_access_code) {
        return { success: false, error: 'Kode akses saat ini salah' };
      }

      const { error: updateError } = await supabase
        .from('app_config')
        .update({ admin_access_code: newCode.trim() })
        .eq('id', 1);

      if (updateError) {
        return { success: false, error: 'Gagal menyimpan kode akses baru' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Terjadi kesalahan' };
    }
  },
}));
