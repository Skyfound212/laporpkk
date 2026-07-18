import { create } from 'zustand';

/**
 * chatStore — state UI chat global.
 *
 * - unreadPerRoom: jumlah pesan belum dibaca per room (di-init dari DB saat fetchRooms)
 * - activeRoomId: room yang sedang terbuka, agar useChatRealtime tidak double-count
 */

interface ChatState {
  unreadPerRoom: Record<string, number>;
  activeRoomId: string | null;
  setUnread: (roomId: string, count: number) => void;
  incrementUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;
  setActiveRoom: (roomId: string | null) => void;
  initFromDb: (counts: Record<string, number>) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  unreadPerRoom: {},
  activeRoomId: null,

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

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  /** Inisialisasi unread dari query DB (dipanggil saat fetchRooms selesai) */
  initFromDb: (counts) =>
    set((s) => ({
      unreadPerRoom: { ...counts, ...s.unreadPerRoom }, // realtime increment menang
    })),
}));
