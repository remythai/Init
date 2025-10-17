import { View, Image, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/context/ThemeContext';

interface AuthHeaderProps {
  subtitle?: string;
}

export function AuthHeader({ subtitle = 'Là où tout commence' }: AuthHeaderProps) {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    header: {
      alignItems: 'center',
      marginBottom: theme.spacing['2xl'],
      paddingTop: theme.spacing['2xl'],
    },
    logoContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 120,
      height: 120,
      resizeMode: 'contain',
    },
    subtitle: {
      color: theme.colors.mutedForeground,
    },
  });

  return (
    <View style={styles.header}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/initLogoGray.png')}
          style={styles.logo}
        />
      </View>
      <ThemedText variant="small" style={styles.subtitle}>
        {subtitle}
      </ThemedText>
    </View>
  );
}