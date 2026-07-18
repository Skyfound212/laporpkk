import { View, Text, TouchableOpacity, Modal, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

export default function PostOptionsScreen() {
  const router = useRouter();
  const [showOptions, setShowOptions] = useState(true);
  const [savingPhoto, setSavingPhoto] = useState(false);

  const handleClose = () => {
    setShowOptions(false);
    setTimeout(() => router.back(), 200);
  };

  const handleSelect = (route: string) => {
    setShowOptions(false);
    setTimeout(() => router.push(route), 200);
  };

  // Ambil foto dengan kamera → simpan langsung ke galeri perangkat
  const handleAmbilFotoKeGallery = async () => {
    setShowOptions(false);
    setSavingPhoto(true);

    try {
      // Minta izin kamera
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus !== 'granted') {
        Alert.alert('Izin Diperlukan', 'Akses kamera diperlukan untuk mengambil foto.');
        setSavingPhoto(false);
        setTimeout(() => router.back(), 100);
        return;
      }

      // Minta izin media library (untuk simpan)
      const { status: libStatus } = await MediaLibrary.requestPermissionsAsync();
      if (libStatus !== 'granted') {
        Alert.alert('Izin Diperlukan', 'Akses galeri diperlukan untuk menyimpan foto.');
        setSavingPhoto(false);
        setTimeout(() => router.back(), 100);
        return;
      }

      // Buka kamera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) {
        setSavingPhoto(false);
        setTimeout(() => router.back(), 100);
        return;
      }

      // Simpan ke galeri perangkat
      await MediaLibrary.saveToLibraryAsync(result.assets[0].uri);

      Alert.alert(
        '✅ Foto Tersimpan',
        'Foto berhasil disimpan ke galeri perangkat Anda.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Tidak dapat menyimpan foto');
      setTimeout(() => router.back(), 100);
    } finally {
      setSavingPhoto(false);
    }
  };

  return (
    <Modal
      visible={showOptions}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        className="flex-1 bg-black/40 justify-end"
        onPress={handleClose}
      >
        <Pressable className="bg-white rounded-t-3xl px-6 pt-4 pb-8">
          {/* Handle bar */}
          <View className="items-center mb-5">
            <View className="w-12 h-1.5 bg-[#B2BEC3] rounded-full" />
          </View>

          <Text className="text-xl font-bold text-[#2D3436] mb-5 text-center">
            Buat Sesuatu
          </Text>

          {/* Loading saat simpan foto */}
          {savingPhoto && (
            <View className="items-center py-6">
              <ActivityIndicator size="large" color="#7ECDC0" />
              <Text className="text-[#636E72] mt-3">Menyimpan foto ke galeri...</Text>
            </View>
          )}

          {!savingPhoto && (
            <View className="space-y-3">

              {/* Update Status */}
              <TouchableOpacity
                onPress={() => handleSelect('/post/text-only')}
                className="flex-row items-center p-4 rounded-2xl bg-[#E8F6F3] active:bg-[#7ECDC0]/20"
              >
                <View className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-[#7ECDC020]">
                  <Ionicons name="flash" size={22} color="#7ECDC0" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-[#2D3436]">Update Status</Text>
                  <Text className="text-sm text-[#636E72] mt-0.5">Bagikan pemikiran atau informasi singkat</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#B2BEC3" />
              </TouchableOpacity>

              {/* Ambil Foto ke Gallery */}
              <TouchableOpacity
                onPress={handleAmbilFotoKeGallery}
                className="flex-row items-center p-4 rounded-2xl bg-[#E8F6F3] active:bg-[#7ECDC0]/20"
              >
                <View className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-[#00B89420]">
                  <Ionicons name="camera" size={22} color="#00B894" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-[#2D3436]">Ambil Foto ke Galeri</Text>
                  <Text className="text-sm text-[#636E72] mt-0.5">Foto tersimpan otomatis ke galeri perangkat</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#B2BEC3" />
              </TouchableOpacity>

              {/* Unggah Foto (posting) */}
              <TouchableOpacity
                onPress={() => handleSelect('/post/gallery-picker')}
                className="flex-row items-center p-4 rounded-2xl bg-[#E8F6F3] active:bg-[#7ECDC0]/20"
              >
                <View className="w-12 h-12 rounded-xl items-center justify-center mr-4 bg-[#5DB9AA20]">
                  <FontAwesome5 name="image" size={20} color="#5DB9AA" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-[#2D3436]">Unggah Foto</Text>
                  <Text className="text-sm text-[#636E72] mt-0.5">Pilih & bagikan foto dari galeri</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#B2BEC3" />
              </TouchableOpacity>


            </View>
          )}

          <TouchableOpacity
            onPress={handleClose}
            className="mt-6 py-3.5 rounded-2xl bg-[#E8F6F3] items-center"
          >
            <Text className="text-base font-semibold text-[#5DB9AA]">Batal</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
