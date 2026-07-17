import { View, Text, TouchableOpacity, ScrollView, Image, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

interface PostDetail {
  id: string;
  content: string;
  title?: string;
  category: string;
  type: string;
  images?: string[];
  created_at: string;
  likes_count: number;
  user: {
    id: string;
    nama: string;
    jabatan: string;
  };
}

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, content, title, category, type, images, created_at, likes_count,
          user:profiles(id, nama, jabatan)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const userData = Array.isArray(data.user) ? data.user[0] : data.user;
      setPost({
        ...data,
        user: {
          id: userData?.id || '',
          nama: userData?.nama || 'Anggota PKK',
          jabatan: userData?.jabatan || 'Anggota',
        },
      });

      // Check if user liked this post
      const { data: likeData } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user?.id)
        .single();

      setLiked(!!likeData);
    } catch (err) {
      console.error('Error fetching post:', err);
      Alert.alert('Error', 'Gagal memuat postingan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleLike = async () => {
    if (!post || !user?.id) return;

    try {
      if (liked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        await supabase.rpc('decrement_likes', { post_id: post.id });
        setPost({ ...post, likes_count: Math.max(0, post.likes_count - 1) });
      } else {
        await supabase.from('post_likes').insert({
          post_id: post.id,
          user_id: user.id,
        });

        await supabase.rpc('increment_likes', { post_id: post.id });
        setPost({ ...post, likes_count: post.likes_count + 1 });
      }
      setLiked(!liked);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes}m lalu`;
    if (hours < 24) return `${hours}j lalu`;
    if (days < 7) return `${days}h lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-[#636E72]">Memuat postingan...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Ionicons name="document-text-outline" size={48} color="#B2BEC3" />
        <Text className="text-[#636E72] text-center mt-4">Postingan tidak ditemukan</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-4 px-6 py-2 rounded-full bg-[#7ECDC0]"
        >
          <Text className="text-white font-semibold">Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-[#E8F6F3]">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#636E72" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#2D3436] flex-1">Detail Post</Text>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPost(); }} />
        }
      >
        {/* Post Content */}
        <View className="px-4 py-4">
          {/* Author */}
          <View className="flex-row items-center mb-4">
            <TouchableOpacity 
              onPress={() => router.push({ pathname: '/profile/other', params: { id: post.user.id } })}
              className="w-10 h-10 rounded-full bg-[#7ECDC0] items-center justify-center mr-3"
            >
              <Text className="text-white font-bold text-sm">
                {post.user.nama.charAt(0).toUpperCase()}
              </Text>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="font-semibold text-[#2D3436]">{post.user.nama}</Text>
              <Text className="text-xs text-[#636E72]">{post.user.jabatan}</Text>
            </View>
            <Text className="text-xs text-[#B2BEC3]">{formatDate(post.created_at)}</Text>
          </View>

          {/* Category Badge */}
          <View className="self-start px-3 py-1 rounded-full bg-[#E8F6F3] mb-3">
            <Text className="text-xs text-[#5DB9AA] font-medium">{post.category}</Text>
          </View>

          {/* Title */}
          {post.title && (
            <Text className="text-lg font-bold text-[#2D3436] mb-2">{post.title}</Text>
          )}

          {/* Content */}
          <Text className="text-base text-[#2D3436] leading-6 mb-4">{post.content}</Text>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <View className="mb-4">
              {post.images.map((img, index) => (
                <Image 
                  key={index} 
                  source={{ uri: img }} 
                  className="w-full h-64 rounded-xl mb-2"
                  resizeMode="cover"
                />
              ))}
            </View>
          )}

          {/* Like Button Only */}
          <View className="flex-row items-center pt-3 border-t border-[#E8F6F3]">
            <TouchableOpacity 
              onPress={handleLike}
              className="flex-row items-center mr-6"
            >
              <Ionicons 
                name={liked ? 'heart' : 'heart-outline'} 
                size={22} 
                color={liked ? '#FF6B6B' : '#636E72'} 
              />
              <Text className={`ml-2 text-sm ${liked ? 'text-[#FF6B6B] font-medium' : 'text-[#636E72]'}`}>
                {post.likes_count} Suka
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
