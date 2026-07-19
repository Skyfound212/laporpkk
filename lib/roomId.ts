/**
 * Hasilkan room ID deterministik untuk chat privat.
 * Urutan dua user ID diurutkan agar A<->B = B<->A.
 */
export function getPrivateRoomId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('__');
}

export const GROUP_ROOM_ID = 'ruang-rumpi';

/**
 * Room ID personal untuk chat keluhan antara satu user dan admin.
 * Setiap user punya room sendiri -> privasi terjaga, admin bisa balas personal.
 */
export function getAdminRoomId(userId: string): string {
  return `admin-pkk-${userId}`;
}

/** Cek apakah sebuah room ID adalah room admin personal */
export function isAdminRoom(roomId: string): boolean {
  return roomId.startsWith('admin-pkk-');
}

/**
 * @deprecated Hanya dipakai untuk pesan broadcast sistem ke semua anggota.
 * Untuk chat keluhan personal, gunakan getAdminRoomId(userId).
 */
export const ADMIN_ROOM_ID = 'admin-pkk';

