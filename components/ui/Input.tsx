import { View, Text, TextInput, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="mb-4">
      {label && (
        <Text className="text-sm font-semibold text-[#636E72] mb-2">{label}</Text>
      )}
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
