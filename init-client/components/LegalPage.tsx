import { type Theme } from '@/constants/theme';
import { useTheme } from '@/context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface LegalPageProps {
  title: string;
  content: string;
}

export function LegalPage({ title, content }: LegalPageProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, insets), [theme, insets]);

  const handleLink = (url: string) => {
    if (url.startsWith('/legal/')) {
      const page = url.replace('/legal/', '');
      router.push(`/legal/${page}` as any);
    } else if (url.startsWith('http')) {
      Linking.openURL(url);
    }
  };

  const renderInline = (text: string): React.ReactNode[] => {
    // Handle **bold**, *italic*, and [links](url)
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Check for links [text](url)
      const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
      // Check for bold **text**
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      // Check for italic *text*
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);

      // Find earliest match
      const matches = [
        linkMatch ? { type: 'link', match: linkMatch, index: linkMatch.index! } : null,
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
        italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
      ].filter(Boolean).sort((a, b) => a!.index - b!.index);

      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }

      const first = matches[0]!;
      if (first.index > 0) {
        parts.push(remaining.slice(0, first.index));
      }

      if (first.type === 'link') {
        const linkText = first.match[1];
        const linkUrl = first.match[2];
        parts.push(
          <Text key={key++} style={styles.link} onPress={() => handleLink(linkUrl)}>
            {linkText}
          </Text>
        );
      } else if (first.type === 'bold') {
        parts.push(<Text key={key++} style={styles.bold}>{first.match[1]}</Text>);
      } else if (first.type === 'italic') {
        parts.push(<Text key={key++} style={styles.italic}>{first.match[1]}</Text>);
      }

      remaining = remaining.slice(first.index + first.match[0].length);
    }

    return parts;
  };

  const renderContent = () => {
    const lines = content.trim().split('\n');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (!trimmed) {
        elements.push(<View key={i} style={styles.spacer} />);
        continue;
      }

      if (trimmed === '---') {
        elements.push(<View key={i} style={styles.separator} />);
        continue;
      }

      if (trimmed.startsWith('# ')) {
        elements.push(<Text key={i} style={styles.h1}>{trimmed.slice(2)}</Text>);
        continue;
      }

      if (trimmed.startsWith('### ')) {
        elements.push(<Text key={i} style={styles.h3}>{trimmed.slice(4)}</Text>);
        continue;
      }

      if (trimmed.startsWith('## ')) {
        elements.push(<Text key={i} style={styles.h2}>{trimmed.slice(3)}</Text>);
        continue;
      }

      if (trimmed.startsWith('- ')) {
        elements.push(
          <View key={i} style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.body}>{renderInline(trimmed.slice(2))}</Text>
          </View>
        );
        continue;
      }

      elements.push(<Text key={i} style={styles.body}>{renderInline(trimmed)}</Text>);
    }

    return elements;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Back button like web */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.backText}>Retour aux paramètres</Text>
        </Pressable>

        {renderContent()}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme, insets: { top: number; bottom: number }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: '#303030' },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: insets.top + 16,
      paddingBottom: Math.max(insets.bottom, 20) + 20,
    },

    // Back button
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 24,
    },
    backText: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.6)',
      fontFamily: 'Roboto',
    },

    // Separator (---)
    separator: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginVertical: 24,
    },

    spacer: { height: 8 },

    // Headings
    h1: {
      fontFamily: 'Poppins-Bold',
      fontSize: 26,
      color: '#fff',
      marginBottom: 16,
    },
    h2: {
      fontFamily: 'Poppins',
      fontWeight: '600',
      fontSize: 18,
      color: '#fff',
      marginTop: 20,
      marginBottom: 10,
    },
    h3: {
      fontFamily: 'Poppins-Medium',
      fontSize: 16,
      color: '#fff',
      marginTop: 14,
      marginBottom: 8,
    },

    // Body
    body: {
      fontSize: 14,
      lineHeight: 22,
      color: 'rgba(255,255,255,0.8)',
      fontFamily: 'Roboto',
    },

    // Inline styles
    bold: {
      fontWeight: '700',
      color: '#fff',
    },
    italic: {
      fontStyle: 'italic',
      color: 'rgba(255,255,255,0.8)',
    },
    link: {
      color: '#1271FF',
      textDecorationLine: 'none',
    },

    // Lists
    listItem: {
      flexDirection: 'row',
      paddingLeft: 8,
      marginBottom: 6,
    },
    bullet: {
      fontSize: 14,
      color: 'rgba(255,255,255,0.8)',
      marginRight: 10,
      lineHeight: 22,
    },
  });
