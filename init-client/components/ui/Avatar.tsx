import { useTheme } from '@/context/ThemeContext';
import { Image, Text, View } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

function getPhotoUri(filePath?: string): string | null {
  if (!filePath) return null;
  return filePath.startsWith('http') ? filePath : `${API_URL}${filePath}`;
}

interface AvatarProps {
  firstname?: string;
  lastname?: string;
  photo?: string;
  size?: number;
  bgColor?: string;
}

export function Avatar({ firstname, lastname, photo, size = 44, bgColor }: AvatarProps) {
  const { theme } = useTheme();
  const uri = getPhotoUri(photo);
  const initials = `${firstname?.[0] ?? ''}${lastname?.[0] ?? ''}`.toUpperCase() || '?';
  const bg = bgColor ?? theme.colors.foreground;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: theme.colors.primaryForeground, fontWeight: '700', fontSize: size * 0.35 }}>
        {initials}
      </Text>
    </View>
  );
}
