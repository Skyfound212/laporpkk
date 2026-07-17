import { create } from 'zustand';

/**
 * chatStore — disederhanakan.
 *
 * SQLite offline-cache dihapus karena bertentangan dengan auth custom (profiles table).
 * Semua pengiriman / penerimaan pesan dilakukan langsung di room.tsx via Supabase.
 * Store ini hanya menyimpan state UI (unread per room) yang ringan.
 */

interface ChatState {
  unreadPerRoom: Record<string, number>;
  setUnread: (roomId: string, count: number) => void;
  incrementUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  unreadPerRoom: {},

  setUnread: (roomId, count) =>
    set((s) => ({ unreadPerRoom: { ...s.unreadPerRoom, [roomId]: count } })),

  incrementUnread: (roomId) =>
    set((s) => ({
      unreadPerRoom: {
        ...s.unreadPerRoom,
        [roomId]: (s.unreadPerRoom[roomId] ?? 0) + 1,
      },
    })),

  clearUnread: (roomId) =>
    set((s) => {
      const next = { ...s.unreadPerRoom };
      delete next[roomId];
      return { unreadPerRoom: next };
    }),
}));
