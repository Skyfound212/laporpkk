import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

interface PostCardProps {
  id: string;
  userId: string;
  userName: string;
  userJabatan: string;
  content: string;
  category: string;
  likesCount: number;
  createdAt: string;
  isLiked: boolean;
}

export function PostCard({
  id,
  userId,
  userName,
  userJabatan,
  content,
  category,
  likesCount,
  createdAt,
  isLiked: initialLiked,
}: PostCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(likesCount);

  const handleLike = async () => {
    if (!user?.id) return;
    try {
      if (liked) {
        await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', user.id);
        await supabase.rpc('decrement_likes', { post_id: id });
        setCount(Math.max(0, count - 1));
      } else {
        await supabase.from('post_likes').insert({ post_id: id, user_id: user.id });
        await supabase.rpc('increment_likes', { post_id: id });
        setCount(count + 1);
      }
      setLiked(!liked);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}j`;
    if (days < 7) return `${days}h`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <View className="bg-white px-4 py-4 border-b border-[#E8F6F3]">
      {/* Header */}
      <View className="flex-row items-center mb-3">
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/profile/other', params: { id: userId } })}
          className="w-10 h-10 rounded-full bg-[#7ECDC0] items-center justify-center mr-3"
        >
          <Text className="text-white font-bold text-sm">
            {userName.charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="font-semibold text-[#2D3436] text-sm">{userName}</Text>
          <Text className="text-xs text-[#636E72]">{userJabatan}</Text>
        </View>
        <View className="px-2.5 py-1 rounded-full bg-[#E8F6F3]">
          <Text className="text-[10px] text-[#5DB9AA] font-medium">{category}</Text>
        </View>
      </View>

      {/* Content */}
      <TouchableOpacity onPress={() => router.push({ pathname: '/post/detail', params: { id } })}>
        <Text className="text-sm text-[#2D3436] leading-5 mb-3">{content}</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View className="flex-row items-center justify-between">
        <TouchableOpacity onPress={handleLike} className="flex-row items-center">
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? '#FF6B6B' : '#636E72'}
          />
          <Text className={`text-xs ml-1.5 ${liked ? 'text-[#FF6B6B]' : 'text-[#636E72]'}`}>
            {count}
          </Text>
        </TouchableOpacity>
        <Text className="text-xs text-[#B2BEC3]">{formatTime(createdAt)}</Text>
      </View>
    </View>
  );
}
