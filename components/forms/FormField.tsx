import { View, Text, TextInput, TextInputProps } from 'react-native';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
}

export function FormField({ label, error, required = false, ...props }: FormFieldProps) {
  return (
    <View className="mb-4">
      <View className="flex-row mb-2">
        <Text className="text-sm font-semibold text-[#636E72]">{label}</Text>
        {required && <Text className="text-sm text-[#FF6B6B] ml-1">*</Text>}
      </View>
      <TextInput
        className={`bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436] ${
          error ? 'border border-[#FF6B6B]' : ''
        }`}
        {...props}
      />
      {error && (
        <Text className="text-xs text-[#FF6B6B] mt-1">{error}</Text>
      )}
    </View>
  );
}
