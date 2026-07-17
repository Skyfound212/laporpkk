import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ReportCardProps {
  id: string;
  nomorDokumen: string;
  judul: string;
  status: string;
  tanggal: string;
}

export function ReportCard({ id, nomorDokumen, judul, status, tanggal }: ReportCardProps) {
  const router = useRouter();
  const isPending = status === 'pending';

  return (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/laporan/detail', params: { id } })}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-[#E8F6F3]"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1 mr-3">
          <Text className="text-base font-bold text-[#2D3436] mb-1" numberOfLines={2}>
            {judul}
          </Text>
          <Text className="text-xs text-[#636E72]">{nomorDokumen}</Text>
        </View>
        <View
          className={`px-3 py-1 rounded-full ${
            isPending ? 'bg-[#FFF9E6]' : 'bg-[#E8F6F3]'
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              isPending ? 'text-[#FDCB6E]' : 'text-[#7ECDC0]'
            }`}
          >
            {isPending ? 'Pending' : 'Terkirim'}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center">
        <Ionicons name="calendar-outline" size={14} color="#636E72" />
        <Text className="text-xs text-[#636E72] ml-1">
          {new Date(tanggal).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
