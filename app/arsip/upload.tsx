import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export default function ArsipUploadScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const categories = ['Surat', 'Laporan', 'Rapat', 'Kegiatan', 'Lainnya'];

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFile({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          size: asset.size || 0,
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Gagal memilih file');
    }
  };

  const validate = () => {
    if (!title.trim()) return 'Judul dokumen wajib diisi';
    if (!category) return 'Kategori wajib dipilih';
    if (!file) return 'File wajib dipilih';
    return null;
  };

  const handleUpload = async () => {
    const error = validate();
    if (error) {
      Alert.alert('Validasi', error);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Upload file ke Supabase Storage
      const fileExt = file.name.split('.').pop() || 'pdf';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `arsip/${fileName}`;

      // fetch().blob() tidak reliable untuk URI lokal di React Native.
      // Gunakan FileSystem base64 → Uint8Array.
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, byteArray, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Insert record ke database
      const { error: dbError } = await supabase.from('arsip_dokumen').insert({
        title: title.trim(),
        description: description.trim(),
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl,
        category,
        uploaded_by: user?.id,
      });

      if (dbError) throw dbError;

      Alert.alert('Sukses', 'Dokumen berhasil diupload', [
        { text: 'OK', onPress: () => router.push('/(tabs)/arsip') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengupload dokumen');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#E8F6F3]">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#636E72" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#2D3436]">Upload Dokumen</Text>
        <TouchableOpacity 
          onPress={handleUpload}
          disabled={uploading}
          className="px-5 py-2 rounded-full bg-[#7ECDC0]"
        >
          <Text className="text-white font-semibold text-sm">
            {uploading ? '...' : 'Upload'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4 pt-4">
        {/* Title */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-[#636E72] mb-2">Judul Dokumen</Text>
          <TextInput
value={title}
            onChangeText={setTitle}
            className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436]"
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-[#636E72] mb-2">Deskripsi</Text>
          <TextInput
            multiline
value={description}
            onChangeText={setDescription}
            className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436] min-h-[80]"
            textAlignVertical="top"
          />
        </View>

        {/* Category */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-[#636E72] mb-2">Kategori</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat === category ? '' : cat)}
                className={`px-4 py-2 rounded-full border ${
                  category === cat 
                    ? 'bg-[#7ECDC0] border-[#7ECDC0]' 
                    : 'bg-white border-[#E8F6F3]'
                }`}
              >
                <Text className={`text-sm ${category === cat ? 'text-white font-semibold' : 'text-[#636E72]'}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* File Picker */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-[#636E72] mb-2">File</Text>

          {!file ? (
            <TouchableOpacity
              onPress={pickDocument}
              className="bg-[#F8FAFA] rounded-xl border-2 border-dashed border-[#E8F6F3] py-8 items-center"
            >
              <Ionicons name="cloud-upload-outline" size={40} color="#7ECDC0" />
              <Text className="text-[#7ECDC0] font-medium mt-2">Pilih File</Text>
              <Text className="text-xs text-[#B2BEC3] mt-1">PDF, Word, atau Image</Text>
            </TouchableOpacity>
          ) : (
            <View className="bg-[#F8FAFA] rounded-xl p-4 flex-row items-center">
              <View className="w-10 h-10 rounded-lg bg-[#E8F6F3] items-center justify-center mr-3">
                <MaterialIcons name="insert-drive-file" size={20} color="#7ECDC0" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-[#2D3436]" numberOfLines={1}>{file.name}</Text>
                <Text className="text-xs text-[#636E72]">{formatFileSize(file.size)}</Text>
              </View>
              <TouchableOpacity onPress={() => setFile(null)}>
                <Ionicons name="close-circle" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Upload Progress */}
        {uploading && (
          <View className="mt-4">
            <View className="h-2 bg-[#E8F6F3] rounded-full overflow-hidden">
              <View className="h-full bg-[#7ECDC0] rounded-full" style={{ width: `${progress}%` }} />
            </View>
            <Text className="text-xs text-[#636E72] text-center mt-2">Mengupload...</Text>
          </View>
        )}
      </View>
    </View>
  );
}
