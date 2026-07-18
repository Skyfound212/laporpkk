import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export default function AgendaFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const isEdit = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000));
  const [status, setStatus] = useState<'upcoming' | 'ongoing' | 'completed'>('upcoming');
  const [loading, setLoading] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const statusOptions = [
    { key: 'upcoming' as const, label: 'Akan Datang', color: '#FDCB6E' },
    { key: 'ongoing' as const, label: 'Berlangsung', color: '#7ECDC0' },
    { key: 'completed' as const, label: 'Selesai', color: '#636E72' },
  ];

  useEffect(() => {
    if (isEdit) fetchAgendaDetail();
  }, [id]);

  const fetchAgendaDetail = async () => {
    try {
      const { data, error } = await supabase.from('agenda').select('*').eq('id', id).single();
      if (error) throw error;
      setTitle(data.title || '');
      setDescription(data.description || '');
      setLocation(data.location || '');
      setStartDate(new Date(data.start_date));
      setEndDate(new Date(data.end_date));
      setStatus(data.status || 'upcoming');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memuat data');
    }
  };

  const validate = () => {
    if (!title.trim()) return 'Judul kegiatan wajib diisi';
    if (!description.trim()) return 'Deskripsi wajib diisi';
    if (!location.trim()) return 'Lokasi wajib diisi';
    if (endDate <= startDate) return 'Tanggal selesai harus setelah tanggal mulai';
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) { Alert.alert('Validasi', error); return; }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status,
        created_by: user?.id,
      };

      if (isEdit) {
        const { error } = await supabase.from('agenda').update(payload).eq('id', id);
        if (error) throw error;
        Alert.alert('Sukses', 'Agenda berhasil diperbarui', [
          { text: 'OK', onPress: () => router.push({ pathname: '/agenda/detail', params: { id } }) },
        ]);
      } else {
        const { data, error } = await supabase.from('agenda').insert(payload).select('id').single();
        if (error) throw error;
        Alert.alert('Sukses', 'Agenda berhasil dibuat', [
          { text: 'OK', onPress: () => router.push({ pathname: '/agenda/detail', params: { id: data.id } }) },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const onStartChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
      if (selectedDate > endDate) setEndDate(new Date(selectedDate.getTime() + 3600000));
    }
  };

  const onEndChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) setEndDate(selectedDate);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-tosca-light">
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={24} color="#636E72" /></TouchableOpacity>
        <Text className="text-lg font-bold text-primary">{isEdit ? 'Edit Agenda' : 'Agenda Baru'}</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading} className="px-5 py-2 rounded-full bg-tosca">
          <Text className="text-white font-semibold text-sm">{loading ? '...' : 'Simpan'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        <View className="mb-4">
          <Text className="text-sm font-semibold text-secondary mb-2">Judul Kegiatan</Text>
          <TextInput
value={title} onChangeText={setTitle}
            className="bg-[#F8FAFA] rounded-xl px-4 py-3 text-base text-primary" />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-secondary mb-2">Deskripsi</Text>
          <TextInput multiline
value={description} onChangeText={setDescription}
            className="bg-[#F8FAFA] rounded-xl px-4 py-3 text-base text-primary min-h-[100]" textAlignVertical="top" />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-secondary mb-2">Lokasi</Text>
          <TextInput
value={location} onChangeText={setLocation}
            className="bg-[#F8FAFA] rounded-xl px-4 py-3 text-base text-primary" />
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-secondary mb-2">Waktu Mulai</Text>
          <TouchableOpacity onPress={() => setShowStartPicker(true)} className="bg-[#F8FAFA] rounded-xl px-4 py-3 flex-row items-center">
            <Ionicons name="calendar" size={18} color="#7ECDC0" />
            <Text className="text-base text-primary ml-3">{formatDateTime(startDate)}</Text>
          </TouchableOpacity>
          {showStartPicker && <DateTimePicker value={startDate} mode="datetime" display="default" onChange={onStartChange} minimumDate={new Date()} />}
        </View>

        <View className="mb-4">
          <Text className="text-sm font-semibold text-secondary mb-2">Waktu Selesai</Text>
          <TouchableOpacity onPress={() => setShowEndPicker(true)} className="bg-[#F8FAFA] rounded-xl px-4 py-3 flex-row items-center">
            <Ionicons name="flag" size={18} color="#7ECDC0" />
            <Text className="text-base text-primary ml-3">{formatDateTime(endDate)}</Text>
          </TouchableOpacity>
          {showEndPicker && <DateTimePicker value={endDate} mode="datetime" display="default" onChange={onEndChange} minimumDate={startDate} />}
        </View>

        <View className="mb-8">
          <Text className="text-sm font-semibold text-secondary mb-2">Status</Text>
          <View className="flex-row gap-2">
            {statusOptions.map((opt) => (
              <TouchableOpacity key={opt.key} onPress={() => setStatus(opt.key)}
                className={`flex-1 py-3 rounded-xl items-center border ${status === opt.key ? 'border-tosca bg-tosca-light' : 'border-[#F0F0F0] bg-[#F8FAFA]'}`}>
                <View className="w-3 h-3 rounded-full mb-1" style={{ backgroundColor: opt.color }} />
                <Text className={`text-xs font-medium ${status === opt.key ? 'text-primary' : 'text-secondary'}`}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
