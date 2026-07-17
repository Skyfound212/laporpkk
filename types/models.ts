export interface Profile {
  id: string;
  nik: string;
  nama: string;
  jabatan: string;
  no_hp: string;
  email?: string;
  alamat?: string;
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  category: string;
  type: 'text' | 'image';
  images?: string[];
  status: 'draft' | 'published' | 'archived';
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface Laporan {
  id: string;
  user_id: string;
  nomor_dokumen: string;
  judul: string;
  kategori: string;
  deskripsi: string;
  lokasi: string;
  tanggal_kejadian: string;
  waktu?: string;
  agenda?: string;
  dasar_kegiatan?: string;
  jumlah_peserta?: number;
  hasil_kegiatan?: string;
  status: 'pending' | 'terkirim';
  status_admin: 'baru' | 'dibaca' | 'diarsipkan';
  dokumentasi?: string[];
  pdf_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Agenda {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'system' | 'image';
  created_at: string;
  reply_to_id?: string | null;
  reply_to_content?: string | null;
  reply_to_sender_name?: string | null;
  sender?: { nama: string };
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'group' | 'private';
  is_admin: boolean;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}
