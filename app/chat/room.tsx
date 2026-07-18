import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, Alert, AppState, AppStateStatus,
  StyleSheet, Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import NetInfo from '@react-native-community/netinfo';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase';
import { sendChatMessageNotification } from '@/lib/notifications';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { GROUP_ROOM_ID, ADMIN_ROOM_ID } from '@/lib/roomId';

// ─── Tipe ─────────────────────────────────────────────────────────────────────

interface ReplyInfo {
  id: string;
  content: string;
  senderName: string;
}

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name?: string | null;
  content: string;
  type: 'text' | 'system' | 'image';
  created_at: string;
  status: 'sending' | 'sent' | 'read';
  is_read: boolean;
  reply_to_id?: string | null;
  reply_to_content?: string | null;
  reply_to_sender_name?: string | null;
  sender?: { nama: string; avatar_url?: string | null };
}

type ListItem =
  | { type: 'date_separator'; id: string; label: string }
  | { type: 'message'; id: string; data: Message };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

const fmtDateLabel = (d: string): string => {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hari ini';
  if (date.toDateString() === yesterday.toDateString()) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const buildListItems = (messages: Message[]): ListItem[] => {
  const items: ListItem[] = [];
  let lastDateKey = '';
  for (const msg of messages) {
    const key = new Date(msg.created_at).toDateString();
    if (key !== lastDateKey) {
      items.push({ type: 'date_separator', id: `sep-${key}-${msg.id}`, label: fmtDateLabel(msg.created_at) });
      lastDateKey = key;
    }
    items.push({ type: 'message', id: msg.id, data: msg });
  }
  return items;
};

const avatarLetter = (name: string) => (name ?? '?').trim().charAt(0).toUpperCase();

const msgStatus = (msg: Message): 'sending' | 'sent' | 'read' => {
  if (msg.status === 'sending') return 'sending';
  return msg.is_read ? 'read' : 'sent';
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatRoomScreen() {
  const router = useRouter();
  const { id, name, type, profileId } = useLocalSearchParams<{
    id: string; name: string; type: string; profileId?: string;
  }>();
  const { user } = useAuthStore();
  const { clearUnread, setActiveRoom } = useChatStore();

  const isGroup   = id === GROUP_ROOM_ID;
  const isAdmin   = id === ADMIN_ROOM_ID;
  const isPrivate = !isGroup && !isAdmin;

  // ── State ─────────────────────────────────────────────────────────────────

  const [messages,        setMessages]        = useState<Message[]>([]);
  const [inputText,       setInputText]       = useState('');
  const [loading,         setLoading]         = useState(true);
  const [loadingMore,     setLoadingMore]      = useState(false);
  const [hasMore,         setHasMore]         = useState(true);
  const [replyTo,         setReplyTo]         = useState<ReplyInfo | null>(null);
  const [isOtherTyping,   setIsOtherTyping]   = useState(false);
  const [showScrollBtn,   setShowScrollBtn]   = useState(false);
  const [isOnline,        setIsOnline]        = useState(true);
  const [otherOnline,     setOtherOnline]     = useState(false);
  const [msgMenuTarget,   setMsgMenuTarget]   = useState<Message | null>(null);
  const [otherAvatarUrl,  setOtherAvatarUrl]  = useState<string | null>(null);

  const flatListRef   = useRef<FlatList>(null);
  const swipeRefs     = useRef<Map<string, Swipeable | null>>(new Map());
  const channelRef    = useRef<RealtimeChannel | null>(null);
  const typingRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAtBottomRef = useRef(true);
  const appStateRef   = useRef(AppState.currentState);
  // Cache avatar URL per sender (untuk grup/admin)
  const avatarCache   = useRef<Map<string, string | null>>(new Map());

  const roomName = name || (isGroup ? 'Ruang Rumpi PKK' : isAdmin ? 'Chat Admin PKK' : 'Chat');

  // ── Tandai room sebagai aktif (agar useChatRealtime tidak double-count) ────

  useEffect(() => {
    setActiveRoom(id);
    clearUnread(id);
    return () => { setActiveRoom(null); };
  }, [id, setActiveRoom, clearUnread]);

  // ── Fetch avatar lawan (private chat) ─────────────────────────────────────

  useEffect(() => {
    if (!isPrivate || !profileId) return;
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', profileId)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setOtherAvatarUrl(data.avatar_url);
      });
  }, [isPrivate, profileId]);

  // ── Fetch pesan (paginasi: load 50 terbaru) ───────────────────────────────

  const fetchMessages = useCallback(async (before?: string) => {
    try {
      let query = supabase
        .from('messages')
        .select('id, room_id, sender_id, sender_name, content, type, created_at, is_read, reply_to_id, reply_to_content, reply_to_sender_name, sender:profiles(nama, avatar_url)')
        .eq('room_id', id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (error) throw error;

      const fetched = ((data ?? []) as any[]).reverse().map((m): Message => ({
        ...m,
        is_read: m.is_read ?? false,
        status: m.is_read ? 'read' : 'sent',
        sender: m.sender
          ? { nama: m.sender.nama ?? 'Anggota', avatar_url: m.sender.avatar_url ?? null }
          : { nama: m.sender_name ?? 'Anggota', avatar_url: null },
      }));

      if (!before) {
        setMessages(fetched);
        setHasMore(fetched.length === PAGE_SIZE);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
      } else {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const newOnes = fetched.filter((m) => !ids.has(m.id));
          return [...newOnes, ...prev];
        });
        setHasMore(fetched.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error('fetchMessages:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [id]);

  // ── Load pesan lebih lama ─────────────────────────────────────────────────

  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore || messages.length === 0) return;
    setLoadingMore(true);
    const oldest = messages[0]?.created_at;
    await fetchMessages(oldest);
  }, [loadingMore, hasMore, messages, fetchMessages]);

  // ── Tandai semua pesan dari orang lain sebagai sudah dibaca ───────────────

  const markAllRead = useCallback(async () => {
    if (!user?.id) return;
    const unreadIds = messages
      .filter((m) => m.sender_id !== user.id && !m.is_read)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', unreadIds);

    setMessages((prev) =>
      prev.map((m) =>
        unreadIds.includes(m.id)
          ? { ...m, is_read: true, status: 'read' as const }
          : m
      )
    );
    clearUnread(id);
  }, [messages, user?.id, id, clearUnread]);

  // Tandai saat pesan berubah
  useEffect(() => {
    if (messages.length > 0) markAllRead();
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscription ─────────────────────────────────────────────────

  const subscribeChannel = useCallback(() => {
    if (channelRef.current) channelRef.current.unsubscribe();

    const ch = supabase
      .channel(`room-${id}`, { config: { presence: { key: user?.id ?? '' } } })

      // ── Pesan baru (INSERT) ──────────────────────────────────────────────
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `room_id=eq.${id}`,
      }, async (payload) => {
        const raw = payload.new as any;
        const isFromMe = raw.sender_id === user?.id;

        // Resolusi sender info: gunakan sender_name dari payload dulu
        let senderNama = raw.sender_name ?? '';
        let senderAvatar: string | null = null;

        if (!senderNama && !isFromMe) {
          // Fetch dari profiles (fallback jika sender_name belum ter-denormalisasi)
          const { data: prof } = await supabase
            .from('profiles').select('nama, avatar_url').eq('id', raw.sender_id).single();
          senderNama  = prof?.nama ?? 'Anggota';
          senderAvatar = prof?.avatar_url ?? null;
          avatarCache.current.set(raw.sender_id, senderAvatar);
        } else if (!isFromMe) {
          senderAvatar = avatarCache.current.get(raw.sender_id) ?? null;
        }

        const newMsg: Message = {
          id: raw.id,
          room_id: raw.room_id,
          sender_id: raw.sender_id,
          sender_name: raw.sender_name ?? senderNama,
          content: raw.content,
          type: raw.type ?? 'text',
          created_at: raw.created_at,
          is_read: raw.is_read ?? false,
          status: 'sent',
          reply_to_id: raw.reply_to_id ?? null,
          reply_to_content: raw.reply_to_content ?? null,
          reply_to_sender_name: raw.reply_to_sender_name ?? null,
          sender: {
            nama: isFromMe ? (user?.nama ?? 'Saya') : senderNama,
            avatar_url: isFromMe ? (user as any)?.avatar_url ?? null : senderAvatar,
          },
        };

        setMessages((prev) => {
          // Hapus optimistic jika ada
          const withoutTemp = prev.filter(
            (m) => !(m.status === 'sending' && m.sender_id === user?.id && m.content === newMsg.content)
          );
          if (withoutTemp.find((m) => m.id === newMsg.id)) return withoutTemp;
          return [...withoutTemp, newMsg];
        });

        // Scroll ke bawah jika sudah di bawah
        if (isAtBottomRef.current) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
        }

        // Tandai sebagai dibaca jika dari orang lain dan kita sedang di bawah
        if (!isFromMe && isAtBottomRef.current) {
          await supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
          setMessages((prev) =>
            prev.map((m) => m.id === newMsg.id ? { ...m, is_read: true, status: 'read' } : m)
          );
        }
      })

      // ── Pesan diupdate (UPDATE) — misalnya is_read berubah ───────────────
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `room_id=eq.${id}`,
      }, (payload) => {
        const updated = payload.new as any;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === updated.id
              ? { ...m, is_read: updated.is_read ?? m.is_read, status: updated.is_read ? 'read' : m.status }
              : m
          )
        );
      })

      // ── Pesan dihapus (DELETE) ────────────────────────────────────────────
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages',
        filter: `room_id=eq.${id}`,
      }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
      })

      // ── Presence (typing + online) ────────────────────────────────────────
      .on('presence', { event: 'sync' }, () => {
        const state = ch.presenceState<{ user_id: string; is_typing?: boolean }>();
        const others = Object.values(state).flat().filter((p) => p.user_id !== user?.id);
        setIsOtherTyping(others.some((p) => p.is_typing));
        if (isPrivate && profileId) {
          setOtherOnline(Object.keys(state).includes(profileId));
        }
      })

      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user?.id) {
          await ch.track({ user_id: user.id, is_typing: false });
        }
      });

    channelRef.current = ch;
  }, [id, user?.id, isPrivate, profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Setup: fetch + subscribe ───────────────────────────────────────────────

  useEffect(() => {
    fetchMessages();
    subscribeChannel();

    const appSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && next === 'background') {
        channelRef.current?.unsubscribe();
      } else if (appStateRef.current === 'background' && next === 'active') {
        subscribeChannel();
        fetchMessages();
      }
      appStateRef.current = next;
    });

    const netUnsub = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? true;
      setIsOnline(online);
      if (online) { subscribeChannel(); fetchMessages(); }
    });

    return () => {
      appSub.remove();
      netUnsub();
      channelRef.current?.unsubscribe();
      if (typingRef.current) clearTimeout(typingRef.current);
    };
  }, [fetchMessages, subscribeChannel]);

  // ── Kirim pesan ───────────────────────────────────────────────────────────

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !user?.id) return;

    const tempId = `temp-${Date.now()}`;
    const currentReply = replyTo;

    const optimistic: Message = {
      id: tempId,
      room_id: id,
      sender_id: user.id,
      sender_name: user.nama,
      content: text,
      type: 'text',
      created_at: new Date().toISOString(),
      is_read: false,
      status: 'sending',
      reply_to_id: currentReply?.id ?? null,
      reply_to_content: currentReply?.content ?? null,
      reply_to_sender_name: currentReply?.senderName ?? null,
      sender: { nama: user.nama ?? 'Saya', avatar_url: (user as any)?.avatar_url ?? null },
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputText('');
    setReplyTo(null);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    channelRef.current?.track({ user_id: user.id, is_typing: false });
    if (typingRef.current) clearTimeout(typingRef.current);

    try {
      const { data: inserted, error } = await supabase.from('messages').insert({
        room_id: id,
        sender_id: user.id,
        sender_name: user.nama ?? 'Anggota',
        content: text,
        type: 'text',
        is_read: false,
        reply_to_id: currentReply?.id ?? null,
        reply_to_content: currentReply?.content ?? null,
        reply_to_sender_name: currentReply?.senderName ?? null,
      }).select('id').single();

      if (error) throw error;

      // Update optimistic dengan ID asli
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: inserted?.id ?? tempId, status: 'sent' as const }
            : m
        )
      );

      // Notifikasi push untuk private chat
      if (isPrivate && profileId) {
        sendChatMessageNotification(
          profileId,
          user.nama ?? 'Anggota PKK',
          text,
          id,
          name,
          'private',
          user.id,
        );
      }
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert('Gagal mengirim', err.message || 'Periksa koneksi internet Anda');
    }
  };

  // ── Typing indicator ──────────────────────────────────────────────────────

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!user?.id || !channelRef.current) return;
    channelRef.current.track({ user_id: user.id, is_typing: text.length > 0 });
    if (typingRef.current) clearTimeout(typingRef.current);
    if (text.length > 0) {
      typingRef.current = setTimeout(() => {
        channelRef.current?.track({ user_id: user.id, is_typing: false });
      }, 3000);
    }
  };

  // ── Hapus pesan ───────────────────────────────────────────────────────────

  const deleteMessage = async (msg: Message) => {
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    const { error } = await supabase.from('messages').delete().eq('id', msg.id);
    if (error) {
      // Rollback optimistic delete
      setMessages((prev) => {
        const has = prev.find((m) => m.id === msg.id);
        if (has) return prev;
        // Re-insert in the right position
        const idx = prev.findIndex((m) => new Date(m.created_at) > new Date(msg.created_at));
        if (idx === -1) return [...prev, msg];
        return [...prev.slice(0, idx), msg, ...prev.slice(idx)];
      });
      Alert.alert('Gagal hapus', error.message);
    }
  };

  // ── Forward / Teruskan pesan ──────────────────────────────────────────────

  const forwardMessage = async (msg: Message) => {
    setMsgMenuTarget(null);
    // Copy to clipboard and show hint
    await Clipboard.setStringAsync(msg.content);
    Alert.alert(
      'Teruskan Pesan',
      'Teks pesan telah disalin. Buka room tujuan dan tempel pesan di sana.',
      [{ text: 'OK' }]
    );
  };

  // ── Scroll ────────────────────────────────────────────────────────────────

  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const dist = contentSize.height - layoutMeasurement.height - contentOffset.y;
    isAtBottomRef.current = dist < 80;
    setShowScrollBtn(dist > 200);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const listItems = buildListItems(messages);

  const renderDateSep = (label: string) => (
    <View style={styles.dateSepWrap}>
      <View style={styles.dateSepBubble}>
        <Text style={styles.dateSepText}>{label}</Text>
      </View>
    </View>
  );

  const renderMessage = ({ item: listItem, index }: { item: ListItem; index: number }) => {
    if (listItem.type === 'date_separator') return renderDateSep(listItem.label);

    const item = listItem.data;

    if (item.type === 'system') {
      return (
        <View style={styles.systemWrap}>
          <View style={styles.systemBubble}>
            <Text style={styles.systemText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    const isMe = item.sender_id === user?.id;

    // Grouping: apakah pesan sebelumnya dari sender yang sama?
    const prevListItem = listItems[index - 1];
    const prevMsg = prevListItem?.type === 'message' ? prevListItem.data : null;
    const isContinued =
      prevMsg &&
      prevMsg.type !== 'system' &&
      prevMsg.sender_id === item.sender_id &&
      new Date(item.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 120_000;

    const showAvatar = !isMe && !isContinued;
    const senderDisplayName = item.sender?.nama ?? item.sender_name ?? 'Anggota';
    const status = msgStatus(item);

    return (
      <Swipeable
        ref={(ref) => { swipeRefs.current.set(item.id, ref); }}
        friction={2}
        leftThreshold={55}
        overshootLeft={false}
        renderLeftActions={() => (
          <View style={styles.swipeAction}>
            <View style={styles.swipeIcon}>
              <Ionicons name="return-up-forward-outline" size={18} color="#7ECDC0" />
            </View>
          </View>
        )}
        onSwipeableOpen={(dir) => {
          if (dir === 'left') {
            setReplyTo({
              id: item.id,
              content: item.content,
              senderName: isMe ? (user?.nama ?? 'Saya') : senderDisplayName,
            });
            swipeRefs.current.get(item.id)?.close();
          }
        }}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={() => setMsgMenuTarget(item)}
          delayLongPress={400}
        >
          <View style={[
            styles.msgRow,
            isMe ? styles.msgRowMe : styles.msgRowOther,
            isContinued && { marginTop: 1 },
          ]}>
            {/* Avatar lawan bicara */}
            {!isMe && (
              <View style={[styles.msgAvatar, { opacity: showAvatar ? 1 : 0, overflow: 'hidden' }]}>
                {item.sender?.avatar_url ? (
                  <Image
                    source={{ uri: item.sender.avatar_url }}
                    style={{ width: 32, height: 32, borderRadius: 16 }}
                  />
                ) : (
                  <Text style={styles.msgAvatarText}>
                    {avatarLetter(senderDisplayName)}
                  </Text>
                )}
              </View>
            )}

            <View style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
              isContinued && (isMe ? styles.bubbleMeContinued : styles.bubbleOtherContinued),
            ]}>
              {/* Reply quote */}
              {item.reply_to_content ? (
                <View style={[styles.replyQuote, isMe ? styles.replyQuoteMe : styles.replyQuoteOther]}>
                  <Text style={[styles.replyName, isMe ? { color: '#E8F6F3' } : { color: '#5DB9AA' }]}>
                    {item.reply_to_sender_name}
                  </Text>
                  <Text
                    style={[styles.replyContent, isMe ? { color: '#D1F0EC' } : { color: '#636E72' }]}
                    numberOfLines={2}
                  >
                    {item.reply_to_content}
                  </Text>
                </View>
              ) : null}

              {/* Nama pengirim (grup/admin, bukan saya) */}
              {!isMe && (isGroup || isAdmin) && !isContinued && (
                <Text style={styles.senderName}>{senderDisplayName}</Text>
              )}

              {/* Konten */}
              <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextOther]}>
                {item.content}
              </Text>

              {/* Waktu + centang */}
              <View style={styles.msgMeta}>
                <Text style={[styles.msgTime, isMe ? { color: 'rgba(255,255,255,0.65)' } : { color: '#B2BEC3' }]}>
                  {fmtTime(item.created_at)}
                </Text>
                {isMe && (
                  <Ionicons
                    name={
                      status === 'sending'
                        ? 'checkmark-outline'
                        : status === 'read'
                        ? 'checkmark-done'
                        : 'checkmark-done-outline'
                    }
                    size={13}
                    color={status === 'read' ? '#B2F2EE' : 'rgba(255,255,255,0.65)'}
                    style={{ marginLeft: 3 }}
                  />
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // ── Render utama ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#2D3436" />
        </TouchableOpacity>

        <View style={[styles.headerAvatar, { overflow: 'hidden' }]}>
          {isPrivate && otherAvatarUrl ? (
            <Image source={{ uri: otherAvatarUrl }} style={{ width: 38, height: 38, borderRadius: 19 }} />
          ) : (
            <Text style={styles.headerAvatarText}>{avatarLetter(roomName)}</Text>
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headerName} numberOfLines={1}>{roomName}</Text>
          <Text style={styles.headerStatus}>
            {!isOnline
              ? '⚠️ Tidak ada koneksi'
              : isGroup
              ? `${Object.keys(channelRef.current?.presenceState() ?? {}).length} online`
              : isAdmin
              ? 'Admin PKK'
              : otherOnline
              ? '🟢 Online'
              : '⚫ Offline'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => Alert.alert(roomName, `Jenis: ${isGroup ? 'Grup' : isAdmin ? 'Admin' : 'Privat'}`)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color="#636E72" />
        </TouchableOpacity>
      </View>

      {/* Konten */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={listItems}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 4 }}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={Platform.OS === 'android'}
            maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            onEndReached={loadOlderMessages}
            onEndReachedThreshold={0.15}
            ListHeaderComponent={
              loadingMore ? (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: '#B2BEC3', fontSize: 12 }}>Memuat pesan lama...</Text>
                </View>
              ) : hasMore && messages.length > 0 ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={loadOlderMessages}
                >
                  <Text style={styles.loadMoreText}>⬆ Muat pesan lebih lama</Text>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={() =>
              !loading ? (
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name={isGroup ? 'people' : 'chatbubbles'} size={36} color="#7ECDC0" />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {isGroup ? 'Selamat datang di Ruang Rumpi!' : `Mulai percakapan dengan ${roomName}`}
                  </Text>
                  <Text style={styles.emptySub}>Kirim pesan pertama untuk memulai.</Text>
                </View>
              ) : null
            }
          />

          {/* Typing indicator */}
          {isOtherTyping && (
            <TypingIndicator avatarLetter={avatarLetter(roomName)} />
          )}

          {/* Scroll-to-bottom button */}
          {showScrollBtn && (
            <TouchableOpacity
              style={styles.scrollBtn}
              onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
              activeOpacity={0.85}
            >
              <Ionicons name="chevron-down" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Reply preview bar */}
        {replyTo && (
          <View style={styles.replyBar}>
            <Ionicons name="return-up-back-outline" size={18} color="#7ECDC0" style={{ marginRight: 10 }} />
            <View style={styles.replyBarContent}>
              <Text style={styles.replyBarName}>{replyTo.senderName}</Text>
              <Text style={styles.replyBarText} numberOfLines={1}>{replyTo.content}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setReplyTo(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color="#636E72" />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={2000}
              placeholder="Pesan..."
              placeholderTextColor="#B2BEC3"
              style={styles.input}
              textAlignVertical="center"
              returnKeyType="default"
            />
          </View>

          <TouchableOpacity
            onPress={sendMessage}
            disabled={!inputText.trim()}
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modal aksi pesan (long press) */}
      <Modal
        visible={!!msgMenuTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setMsgMenuTarget(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMsgMenuTarget(null)}
        />
        {msgMenuTarget && (
          <View style={styles.msgMenu}>
            <View style={styles.msgMenuHandle} />

            {/* Preview pesan */}
            <View style={styles.msgMenuPreview}>
              <Text style={styles.msgMenuPreviewText} numberOfLines={3}>
                {msgMenuTarget.content}
              </Text>
            </View>

            {/* Balas */}
            <TouchableOpacity
              style={styles.msgMenuItem}
              onPress={() => {
                const isMe = msgMenuTarget.sender_id === user?.id;
                setReplyTo({
                  id: msgMenuTarget.id,
                  content: msgMenuTarget.content,
                  senderName: isMe
                    ? (user?.nama ?? 'Saya')
                    : (msgMenuTarget.sender?.nama ?? msgMenuTarget.sender_name ?? 'Anggota'),
                });
                setMsgMenuTarget(null);
              }}
            >
              <Ionicons name="return-up-back-outline" size={20} color="#5DB9AA" />
              <Text style={styles.msgMenuItemText}>Balas</Text>
            </TouchableOpacity>

            {/* Salin */}
            <TouchableOpacity
              style={styles.msgMenuItem}
              onPress={async () => {
                await Clipboard.setStringAsync(msgMenuTarget.content);
                setMsgMenuTarget(null);
                Alert.alert('Disalin', 'Pesan berhasil disalin ke clipboard');
              }}
            >
              <Ionicons name="copy-outline" size={20} color="#636E72" />
              <Text style={styles.msgMenuItemText}>Salin Teks</Text>
            </TouchableOpacity>

            {/* Teruskan */}
            <TouchableOpacity
              style={styles.msgMenuItem}
              onPress={() => forwardMessage(msgMenuTarget)}
            >
              <Ionicons name="share-outline" size={20} color="#636E72" />
              <Text style={styles.msgMenuItemText}>Teruskan</Text>
            </TouchableOpacity>

            {/* Hapus (hanya pesan sendiri) */}
            {msgMenuTarget.sender_id === user?.id && (
              <TouchableOpacity
                style={[styles.msgMenuItem, { borderTopWidth: 1, borderTopColor: '#F0F0F0' }]}
                onPress={() => {
                  const target = msgMenuTarget;
                  setMsgMenuTarget(null);
                  Alert.alert(
                    'Hapus Pesan',
                    'Pesan ini akan dihapus secara permanen untuk semua orang.',
                    [
                      { text: 'Batal', style: 'cancel' },
                      { text: 'Hapus', style: 'destructive', onPress: () => deleteMessage(target) },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                <Text style={[styles.msgMenuItemText, { color: '#FF6B6B' }]}>Hapus Pesan</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#EDF7F6' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#E8F6F3',
    shadowColor: '#7ECDC0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
    elevation: 4,
  },
  backBtn: { padding: 4, marginRight: 4 },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#7ECDC0',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  headerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  headerName: { fontSize: 15, fontWeight: '700', color: '#2D3436' },
  headerStatus: { fontSize: 11, color: '#7ECDC0', marginTop: 1 },
  headerAction: { padding: 6, marginLeft: 4 },

  // Pesan
  msgRow: { flexDirection: 'row', marginVertical: 3, paddingHorizontal: 10 },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start', alignItems: 'flex-end' },

  msgAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#5DB9AA',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, flexShrink: 0,
  },
  msgAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  bubble: {
    maxWidth: '78%', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleMe: { backgroundColor: '#2E9F95', borderBottomRightRadius: 4 },
  bubbleMeContinued: { borderTopRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E8F6F3' },
  bubbleOtherContinued: { borderTopLeftRadius: 4 },

  senderName: { fontSize: 11, fontWeight: '700', color: '#5DB9AA', marginBottom: 3 },

  msgText: { fontSize: 14.5, lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTextOther: { color: '#2D3436' },

  msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 5 },
  msgTime: { fontSize: 10 },

  // Reply quote
  replyQuote: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: 8, borderLeftWidth: 3,
  },
  replyQuoteMe: { backgroundColor: 'rgba(255,255,255,0.18)', borderLeftColor: '#fff' },
  replyQuoteOther: { backgroundColor: '#F0FAF9', borderLeftColor: '#7ECDC0' },
  replyName: { fontSize: 10, fontWeight: '700', marginBottom: 2 },
  replyContent: { fontSize: 12, lineHeight: 16 },

  // Separator tanggal
  dateSepWrap: { alignItems: 'center', marginVertical: 12 },
  dateSepBubble: {
    backgroundColor: 'rgba(126,205,192,0.2)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  dateSepText: { fontSize: 11, color: '#5DB9AA', fontWeight: '600' },

  // Sistem
  systemWrap: { alignItems: 'center', marginVertical: 8 },
  systemBubble: {
    backgroundColor: '#F5F5F5', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  systemText: { fontSize: 11, color: '#636E72' },

  // Empty
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingTop: 80, paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#E8F6F3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16, fontWeight: '700', color: '#2D3436',
    textAlign: 'center', marginBottom: 8,
  },
  emptySub: { fontSize: 13, color: '#B2BEC3', textAlign: 'center' },

  // Load more
  loadMoreBtn: {
    alignItems: 'center', paddingVertical: 10,
    marginBottom: 4,
  },
  loadMoreText: { fontSize: 12, color: '#5DB9AA', fontWeight: '600' },

  // Scroll btn
  scrollBtn: {
    position: 'absolute', bottom: 12, right: 16,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#2E9F95',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6,
    elevation: 6,
  },

  // Swipe
  swipeAction: { justifyContent: 'center', paddingLeft: 10, paddingRight: 4 },
  swipeIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#E8F6F3',
    alignItems: 'center', justifyContent: 'center',
  },

  // Reply bar
  replyBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#E8F6F3',
  },
  replyBarContent: { flex: 1 },
  replyBarName: { fontSize: 11, fontWeight: '700', color: '#5DB9AA', marginBottom: 2 },
  replyBarText: { fontSize: 12, color: '#636E72' },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#E8F6F3',
    gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04, shadowRadius: 6,
    elevation: 4,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#F8FAFA',
    borderRadius: 22,
    borderWidth: 1, borderColor: '#E8F6F3',
    paddingHorizontal: 16, paddingVertical: 8,
    maxHeight: 120,
  },
  input: { fontSize: 14.5, color: '#2D3436', minHeight: 22 },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#2E9F95',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2E9F95', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6,
    elevation: 5,
  },
  sendBtnDisabled: { backgroundColor: '#C8EDEA', shadowOpacity: 0 },

  // Modal menu pesan
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  msgMenu: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 34,
    overflow: 'hidden',
  },
  msgMenuHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0',
    alignSelf: 'center', marginTop: 12, marginBottom: 6,
  },
  msgMenuPreview: {
    marginHorizontal: 20, marginVertical: 12,
    backgroundColor: '#F8FAFA', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#E8F6F3',
  },
  msgMenuPreviewText: { fontSize: 13, color: '#636E72', lineHeight: 18 },
  msgMenuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 14,
  },
  msgMenuItemText: { fontSize: 15, color: '#2D3436', fontWeight: '500' },
});
