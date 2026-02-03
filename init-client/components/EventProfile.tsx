// components/EventProfile.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export interface EventProfileData {
  bio: string;
  interests: string[];
  customFields: Record<string, string>;
}

interface EventProfileProps {
  eventTheme: string;
  eventName: string;
  profileData: EventProfileData;
  onSave: (data: EventProfileData) => void;
}

export function EventProfile({
  eventTheme,
  eventName,
  profileData,
  onSave,
}: EventProfileProps) {
  const [bio, setBio] = useState(profileData.bio);
  const [interests, setInterests] = useState(profileData.interests.join(', '));
  const [customFields, setCustomFields] = useState(profileData.customFields);

  const getCustomFieldsForTheme = (theme: string): string[] => {
    const themeFields: Record<string, string[]> = {
      musique: ['Genre musical préféré', 'Instrument que vous jouez', 'Concert mémorable'],
      professionnel: ['Poste actuel', "Secteur d'activité", 'Objectif professionnel'],
      étudiant: ["Filière d'études", "Année d'étude", 'Université/École'],
      sport: ['Sport pratiqué', 'Niveau', "Fréquence d'entraînement"],
      café: ['Café préféré', 'Sujet de discussion favori', 'Disponibilité'],
      fête: ['Style de musique préféré', 'Type de soirée favori', 'Mood du moment'],
    };
    return themeFields[theme.toLowerCase()] || ['Information 1', 'Information 2', 'Information 3'];
  };

  const customFieldLabels = getCustomFieldsForTheme(eventTheme);

  const handleSave = () => {
    const interestsArray = interests
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    onSave({
      bio,
      interests: interestsArray,
      customFields,
    });

    Alert.alert('Succès', 'Votre profil a été enregistré !');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainCard}>
          <View style={styles.headerSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>U</Text>
            </View>
            <Text style={styles.title}>Profil pour {eventName}</Text>
            <Text style={styles.subtitle}>
              Personnalisez votre profil pour cet événement
            </Text>
          </View>

          <View style={styles.formSection}>
            {/* Bio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Parlez de vous pour cet événement..."
                placeholderTextColor="#9E9E9E"
                multiline
                numberOfLines={4}
                style={styles.textarea}
                textAlignVertical="top"
              />
            </View>

            {/* Interests */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Centres d'intérêt</Text>
              <TextInput
                value={interests}
                onChangeText={setInterests}
                placeholder="Séparez par des virgules"
                placeholderTextColor="#9E9E9E"
                style={styles.input}
              />
              <Text style={styles.hint}>
                Ex: Jazz, Networking, Photographie
              </Text>
            </View>

            {/* Custom Fields */}
            <View style={styles.divider} />
            <View style={styles.customFieldsSection}>
              <Text style={styles.sectionTitle}>Informations spécifiques</Text>
              {customFieldLabels.map((label) => (
                <View key={label} style={styles.inputGroup}>
                  <Text style={styles.labelSmall}>{label}</Text>
                  <TextInput
                    value={customFields[label] || ''}
                    onChangeText={(text) =>
                      setCustomFields({
                        ...customFields,
                        [label]: text,
                      })
                    }
                    placeholder={`Votre ${label.toLowerCase()}`}
                    placeholderTextColor="#9E9E9E"
                    style={styles.input}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
            ]}
          >
            <Text style={styles.saveButtonText}>Enregistrer les modifications</Text>
          </Pressable>
        </View>

        {/* Preview Section */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Aperçu de votre profil</Text>
          <View style={styles.previewContent}>
            {bio ? (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Bio</Text>
                <Text style={styles.previewText}>{bio}</Text>
              </View>
            ) : null}
            {interests ? (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>Centres d'intérêt</Text>
                <View style={styles.interestTags}>
                  {interests.split(',').map((interest, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{interest.trim()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontFamily: 'Poppins-SemiBold',
    color: '#303030',
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#303030',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: '#303030',
    marginBottom: 8,
  },
  labelSmall: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#303030',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#303030',
    minHeight: 44,
  },
  textarea: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#303030',
    minHeight: 96,
    maxHeight: 150,
  },
  hint: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  customFieldsSection: {
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#303030',
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#303030',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonPressed: {
    backgroundColor: '#404040',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-Medium',
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: '#303030',
    marginBottom: 16,
  },
  previewContent: {
    gap: 12,
  },
  previewSection: {
    marginBottom: 12,
  },
  previewLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#303030',
    marginBottom: 6,
  },
  previewText: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 20,
  },
  interestTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#303030',
  },
});
