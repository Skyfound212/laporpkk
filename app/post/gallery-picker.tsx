import { View, Text, TouchableOpacity, FlatList, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';

interface PhotoItem {
  id: string;
  uri: string;
  selected: boolean;
}

export default function GalleryPickerScreen() {
  const router = useRouter();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      setPermissionGranted(true);
      loadPhotos();
    } else {
      setLoading(false);
      Alert.alert(
        'Izin Diperlukan',
        'Aplikasi memerlukan akses ke galeri foto untuk memilih gambar.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const loadPhotos = async () => {
    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        first: 50,
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      const mapped = assets.map((asset) => ({
        id: asset.id,
        uri: asset.uri,
        selected: false,
      }));

      setPhotos(mapped);
    } catch (err) {
      console.error('Error loading photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string, uri: string) => {
    if (selectedPhotos.includes(uri)) {
      setSelectedPhotos(selectedPhotos.filter((p) => p !== uri));
    } else {
      if (selectedPhotos.length >= 5) {
        Alert.alert('Maksimal 5 Foto', 'Anda hanya dapat memilih maksimal 5 foto.');
        return;
      }
      setSelectedPhotos([...selectedPhotos, uri]);
    }

    setPhotos(photos.map((p) => 
      p.id === id ? { ...p, selected: !p.selected } : p
    ));
  };

  const handleNext = () => {
    if (selectedPhotos.length === 0) {
      Alert.alert('Pilih Foto', 'Silakan pilih minimal 1 foto.');
      return;
    }
    router.push({
      pathname: '/post/image-caption',
      params: { photos: JSON.stringify(selectedPhotos) },
    });
  };

  const renderItem = ({ item }: { item: PhotoItem }) => (
    <TouchableOpacity
      onPress={() => toggleSelect(item.id, item.uri)}
      className="relative m-0.5"
      style={{ width: '32%', aspectRatio: 1 }}
    >
      <Image source={{ uri: item.uri }} className="w-full h-full rounded-lg" />
      {item.selected && (
        <View className="absolute inset-0 bg-[#7ECDC0]/40 rounded-lg items-center justify-center">
          <View className="w-6 h-6 rounded-full bg-[#7ECDC0] items-center justify-center">
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#E8F6F3]">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#636E72" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#2D3436]">Pilih Foto</Text>
        <TouchableOpacity 
          onPress={handleNext}
          disabled={selectedPhotos.length === 0}
          className={`px-5 py-2 rounded-full ${selectedPhotos.length > 0 ? 'bg-[#7ECDC0]' : 'bg-[#B2BEC3]'}`}
        >
          <Text className="text-white font-semibold text-sm">Lanjut</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Count */}
      {selectedPhotos.length > 0 && (
        <View className="px-4 py-2 bg-[#E8F6F3] flex-row items-center">
          <MaterialIcons name="photo-library" size={18} color="#5DB9AA" />
          <Text className="ml-2 text-sm text-[#5DB9AA] font-medium">
            {selectedPhotos.length} foto dipilih (maks. 5)
          </Text>
        </View>
      )}

      {/* Photo Grid */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-[#636E72]">Memuat galeri...</Text>
        </View>
      ) : !permissionGranted ? (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialIcons name="no-photography" size={48} color="#B2BEC3" />
          <Text className="text-[#636E72] text-center mt-4">
            Izin galeri diperlukan untuk memilih foto
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerClassName="p-1"
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
