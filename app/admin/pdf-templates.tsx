import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface PdfTemplate {
  id: string;
  name: string;
  description: string;
  style_type: 'formal' | 'modern' | 'minimalis';
  is_active: boolean;
  header_text: string;
  footer_text: string;
  show_logo: boolean;
  show_signature: boolean;
  signature_label: string;
  created_at: string;
}

const TEMPLATE_PREVIEWS: Record<string, { title: string; desc: string; icon: string }> = {
  formal: {
    title: 'Formal',
    desc: 'Header instansi, logo, tanda tangan ketua & sekretaris, kop surat resmi',
    icon: 'document-text',
  },
  modern: {
    title: 'Modern',
    desc: 'Desain bersih, warna tosca, layout kontemporer, minimalis tapi elegan',
    icon: 'sparkles',
  },
  minimalis: {
    title: 'Minimalis',
    desc: 'Tanpa logo, tanpa tanda tangan, hanya konten laporan saja',
    icon: 'remove-circle',
  },
};

export default function PdfTemplatesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pdf_templates')
      .select('*')
      .order('style_type', { ascending: true });

    if (error) {
      Alert.alert('Error', 'Gagal memuat template');
    } else if (data && data.length > 0) {
      setTemplates(data);
    } else {
      // Seed default templates if empty
      await seedDefaultTemplates();
    }
    setLoading(false);
  };

  const seedDefaultTemplates = async () => {
    const defaults = [
      {
        name: 'Template Formal',
        description: 'Kop surat resmi PKK, tanda tangan, logo',
        style_type: 'formal',
        is_active: true,
        header_text: 'PEMBERDAYAAN DAN KESEJAHTERAAN KELUARGA (PKK)',
        footer_text: 'Dokumen Resmi PKK',
        show_logo: true,
        show_signature: true,
        signature_label: 'Ketua PKK',
      },
      {
        name: 'Template Modern',
        description: 'Desain kontemporer dengan warna tosca',
        style_type: 'modern',
        is_active: false,
        header_text: 'Laporan PKK',
        footer_text: 'PKK Digital',
        show_logo: true,
        show_signature: true,
        signature_label: 'Penanggung Jawab',
      },
      {
        name: 'Template Minimalis',
        description: 'Hanya konten laporan tanpa hiasan',
        style_type: 'minimalis',
        is_active: false,
        header_text: '',
        footer_text: '',
        show_logo: false,
        show_signature: false,
        signature_label: '',
      },
    ];

    const { data, error } = await supabase.from('pdf_templates').insert(defaults).select();
    if (!error && data) {
      setTemplates(data);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    setSaving(true);
    // Deactivate all first (only one active at a time)
    await supabase.from('pdf_templates').update({ is_active: false }).neq('id', id);

    const { error } = await supabase
      .from('pdf_templates')
      .update({ is_active: !current })
      .eq('id', id);

    if (error) {
      Alert.alert('Error', 'Gagal mengubah status template');
    } else {
      await fetchTemplates();
    }
    setSaving(false);
  };

  const updateTemplate = async (id: string, field: string, value: any) => {
    const { error } = await supabase
      .from('pdf_templates')
      .update({ [field]: value })
      .eq('id', id);

    if (!error) {
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#7ECDC0" />
        <Text className="text-gray-500 mt-3">Memuat template...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#2D3436" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800 flex-1">Template PDF</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        <Text className="text-gray-500 mb-4 text-sm">
          Pilih template aktif untuk laporan PKK. Anggota akan menggunakan template yang aktif saat export PDF.
        </Text>

        {templates.map((template) => {
          const preview = TEMPLATE_PREVIEWS[template.style_type];
          return (
            <View key={template.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
              {/* Header Card */}
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 rounded-xl bg-[#E8F6F3] items-center justify-center mr-3">
                  <Ionicons name={preview.icon as any} size={24} color="#5DB9AA" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-800">{preview.title}</Text>
                  <Text className="text-xs text-gray-500">{preview.desc}</Text>
                </View>
                {template.is_active && (
                  <View className="bg-[#E8F6F3] px-3 py-1 rounded-full">
                    <Text className="text-xs font-semibold text-[#5DB9AA]">AKTIF</Text>
                  </View>
                )}
              </View>

              {/* Toggle */}
              <TouchableOpacity
                onPress={() => toggleActive(template.id, template.is_active)}
                disabled={saving}
                className={`flex-row items-center justify-center py-3 rounded-xl mb-3 ${
                  template.is_active ? 'bg-[#7ECDC0]' : 'bg-gray-100'
                }`}
              >
                <Ionicons
                  name={template.is_active ? 'checkmark-circle' : 'radio-button-off'}
                  size={20}
                  color={template.is_active ? '#fff' : '#636E72'}
                />
                <Text
                  className={`font-semibold ml-2 ${
                    template.is_active ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {template.is_active ? 'Template Aktif' : 'Aktifkan Template'}
                </Text>
              </TouchableOpacity>

              {/* Customization */}
              {template.is_active && (
                <View className="border-t border-gray-100 pt-3 mt-1">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Kustomisasi</Text>

                  <View className="mb-2">
                    <Text className="text-xs text-gray-500 mb-1">Header</Text>
                    <View className="bg-gray-50 rounded-lg px-3 py-2">
                      <Text className="text-sm text-gray-800">{template.header_text || '-'}</Text>
                    </View>
                  </View>

                  <View className="mb-2">
                    <Text className="text-xs text-gray-500 mb-1">Footer</Text>
                    <View className="bg-gray-50 rounded-lg px-3 py-2">
                      <Text className="text-sm text-gray-800">{template.footer_text || '-'}</Text>
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {template.show_logo && (
                      <View className="bg-[#E8F6F3] px-2 py-1 rounded-md">
                        <Text className="text-xs text-[#5DB9AA]">Logo</Text>
                      </View>
                    )}
                    {template.show_signature && (
                      <View className="bg-[#E8F6F3] px-2 py-1 rounded-md">
                        <Text className="text-xs text-[#5DB9AA]">Tanda Tangan</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* Info */}
        <View className="bg-[#E8F6F3] rounded-2xl p-4 mb-6">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#5DB9AA" className="mr-2 mt-0.5" />
            <View className="flex-1 ml-2">
              <Text className="text-sm font-semibold text-gray-800 mb-1">Catatan</Text>
              <Text className="text-xs text-gray-600 leading-5">
                Hanya satu template yang bisa aktif dalam satu waktu. Anggota akan otomatis menggunakan template aktif saat mengekspor laporan ke PDF. Konten laporan tetap berasal dari input anggota.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
