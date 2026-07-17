import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageBubbleProps {
  content: string;
  isMe: boolean;
  time: string;
  senderName?: string;
  status?: 'sending' | 'sent';
  replyToContent?: string | null;
  replyToSenderName?: string | null;
  onLongPress?: () => void;
}

export function MessageBubble({
  content,
  isMe,
  time,
  senderName,
  status,
  replyToContent,
  replyToSenderName,
  onLongPress,
}: MessageBubbleProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={onLongPress}
      delayLongPress={500}
    >
      <View className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
        isMe
          ? 'bg-[#7ECDC0] rounded-br-md'
          : 'bg-white border border-[#E8F6F3] rounded-bl-md'
      }`}>
        {/* Reply quote */}
        {replyToContent && (
          <View className={`rounded-lg px-2.5 py-1.5 mb-1.5 border-l-2 ${
            isMe ? 'bg-[#5DB9AA] border-white' : 'bg-[#F0FAF9] border-[#7ECDC0]'
          }`}>
            <Text className={`text-[10px] font-semibold mb-0.5 ${
              isMe ? 'text-white' : 'text-[#5DB9AA]'
            }`}>
              {replyToSenderName}
            </Text>
            <Text
              className={`text-xs ${isMe ? 'text-[#E8F6F3]' : 'text-[#636E72]'}`}
              numberOfLines={1}
            >
              {replyToContent}
            </Text>
          </View>
        )}

        {/* Sender name */}
        {!isMe && senderName && (
          <Text className="text-xs text-[#5DB9AA] font-medium mb-0.5">
            {senderName}
          </Text>
        )}

        {/* Content */}
        <Text className={`text-sm leading-5 ${isMe ? 'text-white' : 'text-[#2D3436]'}`}>
          {content}
        </Text>

        {/* Time + status */}
        <View className="flex-row items-center justify-end gap-1 mt-1">
          <Text className={`text-[10px] ${isMe ? 'text-[#E8F6F3]' : 'text-[#B2BEC3]'}`}>
            {time}
          </Text>
          {isMe && status && (
            <Ionicons
              name={status === 'sending' ? 'checkmark-outline' : 'checkmark-done-outline'}
              size={12}
              color="#E8F6F3"
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
