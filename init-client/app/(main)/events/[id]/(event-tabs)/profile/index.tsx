// app/(main)/events/[id]/(event-tabs)/profile/index.tsx
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface EventProfileData {
  bio: string;
  interests: string[];
  customFields: Record<string, string>;
}

export default function EventMyProfileScreen() {
  const { id: eventId } = useLocalSearchParams();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('Hâte de découvrir de nouvelles personnes et de passer une excellente soirée !');
  const [interests, setInterests] = useState('Musique, Networking');
  const [customFields, setCustomFields] = useState<Record<string, string>>({
    'Genre musical préféré': 'Jazz, Rock',
    'Instrument que vous jouez': 'Guitare',
    'Concert mémorable': 'Daft Punk @ Paris 2007',
  });

  const eventTheme = 'musique';
  const eventName = 'Décoeurtique moi';

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

    // TODO: Appel API pour sauvegarder
    console.log('Sauvegarde:', { bio, interests: interestsArray, customFields });

    Alert.alert('Succès', 'Votre profil a été mis à jour !');
    setIsEditing(false);
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler les modifications',
      'Voulez-vous vraiment annuler ? Vos modifications seront perdues.',
      [
        { text: 'Continuer à modifier', style: 'cancel' },
        { 
          text: 'Annuler', 
          style: 'destructive',
          onPress: () => setIsEditing(false)
        },
      ]
    );
  };

  const handleBackToEvents = () => {
    router.push('/(main)/events');
  };

  return (
    <>
      {/* Vue en lecture seule */}
      <ScrollView style={styles.container}>
        {/* Header avec bouton retour */}
        {/* <View style={styles.headerBar}>
          <Pressable onPress={handleBackToEvents} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#303030" />
          </Pressable>
          <Text style={styles.headerTitle}>Mon profil événement</Text>
          <View style={styles.backButton} />
        </View> */}

        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>JD</Text>
            </View>
          </View>

          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.bio}>Mon profil pour cet événement</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statut dans l'événement</Text>
          <Text style={styles.info}>✅ Inscrit</Text>
          <Text style={styles.info}>🎯 Intéressé par: {interests}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ma présentation pour cet événement</Text>
          <Text style={styles.description}>{bio}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations spécifiques</Text>
          {customFieldLabels.map((label) => (
            <Text key={label} style={styles.info}>
              {label}: {customFields[label] || 'Non renseigné'}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          <Text style={styles.stat}>5 matchs dans cet événement</Text>
          <Text style={styles.stat}>12 conversations</Text>
        </View>

        <Pressable style={styles.editButton} onPress={() => setIsEditing(true)}>
          <MaterialIcons name="edit" size={20} color="#fff" />
          <Text style={styles.editButtonText}>Personnaliser mon profil événement</Text>
        </Pressable>
      </ScrollView>

      {/* Modal de modification */}
      <Modal
        visible={isEditing}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          {/* Header de la modal */}
          <View style={styles.modalHeader}>
            <Pressable onPress={handleCancel} style={styles.modalHeaderButton}>
              <MaterialIcons name="close" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.modalTitle}>Modifier mon profil</Text>
            <Pressable onPress={handleSave} style={styles.modalHeaderButton}>
              <MaterialIcons name="check" size={24} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Contenu de la modal */}
          <KeyboardAvoidingView
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.mainCard}>
                <View style={styles.headerSection}>
                  <View style={styles.avatarEdit}>
                    <Text style={styles.avatarText}>JD</Text>
                  </View>
                  <Text style={styles.title}>Profil pour {eventName}</Text>
                  <Text style={styles.subtitle}>Personnalisez votre profil pour cet événement</Text>
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
                    <Text style={styles.hint}>Ex: Jazz, Networking, Photographie</Text>
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
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#303030',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#303030',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEdit: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#303030',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontFamily: 'Poppins-Bold',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    marginBottom: 8,
    color: '#303030',
  },
  bio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    marginBottom: 12,
    color: '#303030',
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
    color: '#303030',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  stat: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  editButton: {
    backgroundColor: '#303030',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#303030',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalHeaderButton: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
  },
  saveHeaderText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#303030',
    textAlign: 'right',
  },
  modalContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 16,
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
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    marginTop: 0,
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
