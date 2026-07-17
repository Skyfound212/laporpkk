/**
 * Hasilkan room ID deterministik untuk chat privat.
 * Urutan dua user ID diurutkan agar A↔B = B↔A.
 */
export function getPrivateRoomId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('__');
}

export const GROUP_ROOM_ID = 'ruang-rumpi';
export const ADMIN_ROOM_ID = 'admin-pkk';
