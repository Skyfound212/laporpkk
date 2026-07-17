import { View, Text, TouchableOpacity } from 'react-native';

interface CategorySelectorProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

export function CategorySelector({ options, selected, onSelect }: CategorySelectorProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onSelect(opt === selected ? '' : opt)}
          className={`px-4 py-2 rounded-full border ${
            selected === opt 
              ? 'bg-[#7ECDC0] border-[#7ECDC0]' 
              : 'bg-white border-[#E8F6F3]'
          }`}
        >
          <Text className={`text-sm ${selected === opt ? 'text-white font-semibold' : 'text-[#636E72]'}`}>
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
