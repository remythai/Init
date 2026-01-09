// components/CreateEventDialog.tsx
import { eventService } from "@/services/event.service";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { CustomFieldsBuilder } from "./CustomEventBuilder";

interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'date' | 'checkbox' | 'radio' | 'select' | 'multiselect';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface CreateEventDialogProps {
  onEventCreated: () => void;
}

interface AddressSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
  };
}

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showCustomFieldForm, setShowCustomFieldForm] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [currentField, setCurrentField] = useState<CustomField>({
    id: '',
    label: '',
    type: 'text',
    required: false,
    options: [],
  });

  const [isStartDateVisible, setStartDateVisible] = useState(false);
  const [isEndDateVisible, setEndDateVisible] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [locationInput, setLocationInput] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [tempMarker, setTempMarker] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    max_participants: "",
    is_public: true,
    has_whitelist: false,
    has_link_access: true,
    has_password_access: false,
    access_password: "",
    cooldown: "",
    theme: "Professionnel",
  });

  const [error, setError] = useState("");

  const fieldTypes = [
    { value: 'text', label: 'Texte court' },
    { value: 'textarea', label: 'Texte long' },
    { value: 'number', label: 'Nombre' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Téléphone' },
    { value: 'date', label: 'Date' },
    { value: 'checkbox', label: 'Case à cocher' },
    { value: 'select', label: 'Menu déroulant' },
    { value: 'radio', label: 'Choix unique' },
    { value: 'multiselect', label: 'Choix multiples' },
  ];

  const [newOption, setNewOption] = useState({ value: '', label: '' });

  useEffect(() => {
    if (locationInput.length > 2) {
      const timer = setTimeout(() => {
        searchAddress(locationInput);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  }, [locationInput]);

  const searchAddress = async (query: string) => {
    console.log('Recherche pour:', query);
    setLoadingSuggestions(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=5&countrycodes=fr&addressdetails=1`;
      console.log('URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'EventApp/1.0',
        },
      });
      const data = await response.json();
      console.log('Résultats:', data);
      
      setAddressSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Erreur recherche adresse:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    let shortAddress = '';
    
    if (suggestion.address) {
      const addr = suggestion.address;
      const street = addr.house_number && addr.road 
        ? `${addr.house_number} ${addr.road}` 
        : addr.road || '';
      const postcode = addr.postcode || '';
      const city = addr.city || addr.town || addr.village || addr.municipality || '';
      
      if (street && postcode && city) {
        shortAddress = `${street}, ${postcode} ${city}`;
      } else if (street && city) {
        shortAddress = `${street}, ${city}`;
      } else if (postcode && city) {
        shortAddress = `${postcode} ${city}`;
      } else {
        const parts = suggestion.display_name.split(', ');
        shortAddress = parts.slice(0, 3).join(', ');
      }
    } else {
      const parts = suggestion.display_name.split(', ');
      shortAddress = parts.slice(0, 3).join(', ');
    }
    
    console.log('Adresse courte:', shortAddress);
    
    setLocationInput(shortAddress);
    setSelectedLocation({
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      address: shortAddress,
    });
    setShowSuggestions(false);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Impossible d\'accéder à votre position');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setTempMarker({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Erreur géolocalisation:', error);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result && result.length > 0) {
        const addr = result[0];
        const parts = [
          addr.streetNumber,
          addr.street,
          addr.postalCode,
          addr.city,
          addr.country
        ].filter(Boolean);
        return parts.join(', ');
      }
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    } catch (error) {
      console.error('Erreur reverse geocoding:', error);
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setTempMarker({ latitude, longitude });
  };

  const confirmLocationSelection = async () => {
    if (!tempMarker) {
      Alert.alert('Erreur', 'Veuillez sélectionner un emplacement sur la carte');
      return;
    }

    const address = await reverseGeocode(tempMarker.latitude, tempMarker.longitude);
    setSelectedLocation({
      latitude: tempMarker.latitude,
      longitude: tempMarker.longitude,
      address,
    });
    setLocationInput(address);
    setShowLocationPicker(false);
  };

  const formatDateTime = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return "Le nom de l'événement est requis";
    }

    if (!formData.description.trim()) {
      return "La description est requise";
    }

    if (!locationInput.trim()) {
      return "Le lieu est requis";
    }

    const maxParticipants = parseInt(formData.max_participants);
    if (isNaN(maxParticipants) || maxParticipants < 1) {
      return "Le nombre de participants doit être supérieur à 0";
    }

    if (!startDate) {
      return "La date de début est requise";
    }

    if (!endDate) {
      return "La date de fin est requise";
    }

    if (endDate <= startDate) {
      return "La date de fin doit être après la date de début";
    }

    if (startDate < new Date()) {
      return "La date de début ne peut pas être dans le passé";
    }

    if (formData.has_password_access && !formData.access_password.trim()) {
      return "Un mot de passe est requis quand l'accès par mot de passe est activé";
    }

    if (formData.cooldown && isNaN(parseInt(formData.cooldown))) {
      return "Le cooldown doit être un nombre";
    }

    return null;
  };

  const handleAddOption = () => {
    if (!newOption.value.trim() || !newOption.label.trim()) {
      Alert.alert("Erreur", "La valeur et le label sont requis");
      return;
    }

    setCurrentField({
      ...currentField,
      options: [...(currentField.options || []), { ...newOption }],
    });
    setNewOption({ value: '', label: '' });
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = currentField.options?.filter((_, i) => i !== index) || [];
    setCurrentField({ ...currentField, options: updatedOptions });
  };

  const handleSaveCustomField = () => {
    if (!currentField.id.trim()) {
      Alert.alert("Erreur", "L'ID du champ est requis");
      return;
    }

    if (!currentField.label.trim()) {
      Alert.alert("Erreur", "Le label du champ est requis");
      return;
    }

    if (['select', 'radio', 'multiselect'].includes(currentField.type)) {
      if (!currentField.options || currentField.options.length === 0) {
        Alert.alert("Erreur", "Ce type de champ nécessite au moins une option");
        return;
      }
    }

    if (editingFieldIndex !== null) {
      const updatedFields = [...customFields];
      updatedFields[editingFieldIndex] = currentField;
      setCustomFields(updatedFields);
    } else {
      if (customFields.some(f => f.id === currentField.id)) {
        Alert.alert("Erreur", "Un champ avec cet ID existe déjà");
        return;
      }
      setCustomFields([...customFields, currentField]);
    }

    setCurrentField({
      id: '',
      label: '',
      type: 'text',
      required: false,
      options: [],
    });
    setShowCustomFieldForm(false);
    setEditingFieldIndex(null);
  };

  const handleEditCustomField = (index: number) => {
    setCurrentField({ ...customFields[index] });
    setEditingFieldIndex(index);
    setShowCustomFieldForm(true);
  };

  const handleDeleteCustomField = (index: number) => {
    Alert.alert(
      "Confirmer la suppression",
      "Voulez-vous vraiment supprimer ce champ ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            setCustomFields(customFields.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const eventData: any = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        start_at: startDate!.toISOString(),
        end_at: endDate!.toISOString(),
        location: locationInput.trim(),
        max_participants: parseInt(formData.max_participants),
        is_public: formData.is_public,
        has_whitelist: formData.has_whitelist,
        has_link_access: formData.has_link_access,
        has_password_access: formData.has_password_access,
        custom_fields: customFields,
      };

      if (selectedLocation) {
        eventData.latitude = selectedLocation.latitude;
        eventData.longitude = selectedLocation.longitude;
      }

      if (formData.has_password_access && formData.access_password) {
        eventData.access_password = formData.access_password;
      }

      if (formData.cooldown) {
        eventData.cooldown = `${formData.cooldown} hours`;
      }

      await eventService.createEvent(eventData);

      Alert.alert("Succès", "Événement créé avec succès!");

      setFormData({
        name: "",
        description: "",
        max_participants: "",
        is_public: true,
        has_whitelist: false,
        has_link_access: true,
        has_password_access: false,
        access_password: "",
        cooldown: "",
        theme: "Professionnel",
      });
      setStartDate(null);
      setEndDate(null);
      setLocationInput("");
      setSelectedLocation(null);
      setCustomFields([]);

      setOpen(false);
      onEventCreated();
    } catch (err: any) {
      console.error("Erreur création événement:", err);
      Alert.alert(
        "Erreur",
        err.message || "Une erreur est survenue lors de la création de l'événement"
      );
    } finally {
      setLoading(false);
    }
  };

  const themes = [
    "Professionnel",
    "Musique",
    "Sport",
    "Café",
    "Étudiant",
    "Fête",
  ];

  const needsOptions = ['select', 'radio', 'multiselect'].includes(currentField.type);

  return (
    <>
      {/* Floating Action Button */}
      <Pressable style={styles.fab} onPress={() => setOpen(true)}>
        <MaterialIcons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Modal Principal */}
      <Modal
        visible={open}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Créer un nouvel événement</Text>
              <Pressable onPress={() => setOpen(false)} disabled={loading}>
                <MaterialIcons name="close" size={26} color="#303030" />
              </Pressable>
            </View>

            {/* Form */}
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Nom */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Nom de l'événement *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Ex: Soirée Networking"
                  placeholderTextColor="#9CA3AF"
                  editable={!loading}
                />
              </View>

              {/* Thème */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Thème *</Text>
                <View style={styles.themeGrid}>
                  {themes.map((theme) => (
                    <Pressable
                      key={theme}
                      style={[
                        styles.themeButton,
                        formData.theme === theme && styles.themeButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, theme })}
                      disabled={loading}
                    >
                      <Text
                        style={[
                          styles.themeButtonText,
                          formData.theme === theme &&
                            styles.themeButtonTextActive,
                        ]}
                      >
                        {theme}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Décrivez votre événement..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  editable={!loading}
                />
              </View>

              {/* Date de début */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date et heure de début *</Text>

                <Pressable onPress={() => setStartDateVisible(true)}>
                  <View pointerEvents="none">
                    <TextInput
                      style={[styles.input, styles.dateInput]}
                      value={startDate ? formatDateTime(startDate) : ''}
                      placeholder="Sélectionner la date et l'heure"
                      placeholderTextColor="#9CA3AF"
                      editable={false}
                    />
                  </View>
                  <View style={styles.inputIcon}>
                    <MaterialIcons name="event" size={20} color="#6B7280" />
                  </View>
                </Pressable>
              </View>

              {/* Date de fin */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Date et heure de fin *</Text>

                <Pressable onPress={() => setEndDateVisible(true)}>
                  <View pointerEvents="none">
                    <TextInput
                      style={[styles.input, styles.dateInput]}
                      value={endDate ? formatDateTime(endDate) : ''}
                      placeholder="Sélectionner la date et l'heure"
                      placeholderTextColor="#9CA3AF"
                      editable={false}
                    />
                  </View>
                  <View style={styles.inputIcon}>
                    <MaterialIcons name="event" size={20} color="#6B7280" />
                  </View>
                </Pressable>
              </View>

              {/* Lieu avec autocomplete */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Lieu *</Text>
                
                <View style={styles.locationInputContainer}>
                  <MaterialIcons 
                    name="location-on" 
                    size={20} 
                    color="#6B7280" 
                    style={styles.locationInputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.locationInput]}
                    value={locationInput}
                    onChangeText={(text) => {
                      setLocationInput(text);
                      if (text.length <= 2) {
                        setSelectedLocation(null);
                      }
                    }}
                    placeholder="Commencez à taper une adresse..."
                    placeholderTextColor="#9CA3AF"
                    editable={!loading}
                    onFocus={() => {
                      if (addressSuggestions.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                  />
                  {loadingSuggestions && (
                    <ActivityIndicator 
                      size="small" 
                      color="#1271FF" 
                      style={styles.locationLoadingIcon}
                    />
                  )}
                </View>

                {/* Address Suggestions */}
                {showSuggestions && addressSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView 
                      style={styles.suggestionsList}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {addressSuggestions.map((item) => (
                        <Pressable
                          key={item.place_id.toString()}
                          style={styles.suggestionItem}
                          onPress={() => selectAddress(item)}
                        >
                          <MaterialIcons name="place" size={18} color="#6B7280" />
                          <Text style={styles.suggestionText} numberOfLines={2}>
                            {item.display_name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Pressable 
                  style={styles.mapPickerButton}
                  onPress={() => {
                    setShowLocationPicker(true);
                    if (!tempMarker && !selectedLocation) {
                      getCurrentLocation();
                    } else if (selectedLocation) {
                      setTempMarker({
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude,
                      });
                      setMapRegion({
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                      });
                    }
                  }}
                >
                  <MaterialIcons name="map" size={18} color="#1271FF" />
                  <Text style={styles.mapPickerButtonText}>
                    Ou sélectionner sur la carte
                  </Text>
                </Pressable>
              </View>

              {/* Max Participants */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Nombre maximum de participants *
                </Text>
                <TextInput
                  style={styles.input}
                  value={formData.max_participants}
                  onChangeText={(text) =>
                    setFormData({ ...formData, max_participants: text })
                  }
                  placeholder="Ex: 50"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>

              {/* Access Settings */}
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Paramètres d'accès</Text>

                <Pressable
                  style={styles.switchContainer}
                  onPress={() =>
                    setFormData({ ...formData, is_public: !formData.is_public })
                  }
                  disabled={loading}
                >
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>Événement public</Text>
                    <Text style={styles.helperText}>
                      Visible par tous les utilisateurs
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switch,
                      formData.is_public && styles.switchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        formData.is_public && styles.switchThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.switchContainer}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      has_whitelist: !formData.has_whitelist,
                    })
                  }
                  disabled={loading}
                >
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>Liste blanche</Text>
                    <Text style={styles.helperText}>
                      Restreindre l'accès à certaines personnes
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switch,
                      formData.has_whitelist && styles.switchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        formData.has_whitelist && styles.switchThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.switchContainer}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      has_link_access: !formData.has_link_access,
                    })
                  }
                  disabled={loading}
                >
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>Accès par lien</Text>
                    <Text style={styles.helperText}>
                      Autoriser l'inscription via un lien
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switch,
                      formData.has_link_access && styles.switchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        formData.has_link_access && styles.switchThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                <Pressable
                  style={styles.switchContainer}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      has_password_access: !formData.has_password_access,
                    })
                  }
                  disabled={loading}
                >
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>Accès par mot de passe</Text>
                    <Text style={styles.helperText}>
                      Protéger l'événement par mot de passe
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switch,
                      formData.has_password_access && styles.switchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        formData.has_password_access &&
                          styles.switchThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                {formData.has_password_access && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Mot de passe d'accès *</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.access_password}
                      onChangeText={(text) =>
                        setFormData({
                          ...formData,
                          access_password: text,
                        })
                      }
                      placeholder="Entrez un mot de passe"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry
                      editable={!loading}
                    />
                  </View>
                )}
              </View>

              {/* Section Custom Fields */}
              <View style={styles.sectionDivider}>
                <CustomFieldsBuilder
                  fields={customFields}
                  onChange={setCustomFields}
                />
              </View>

              {/* Advanced Settings */}
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Paramètres avancés</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Cooldown (en heures)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.cooldown}
                    onChangeText={(text) =>
                      setFormData({ ...formData, cooldown: text })
                    }
                    placeholder="Ex: 24"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    editable={!loading}
                  />
                  <Text style={styles.helperText}>
                    Délai avant de pouvoir s'inscrire à nouveau
                  </Text>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={20} color="#DC2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.cancelButton, loading && styles.buttonDisabled]}
                onPress={() => setOpen(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.submitButton, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    Créer l'événement
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date/Time Pickers */}
      <DateTimePickerModal
        isVisible={isStartDateVisible}
        mode="datetime"
        onConfirm={(date) => {
          setStartDate(date);
          setStartDateVisible(false);
        }}
        onCancel={() => setStartDateVisible(false)}
        minimumDate={new Date()}
        date={startDate || new Date()}
        locale="fr_FR"
        display="inline"
      />

      <DateTimePickerModal
        isVisible={isEndDateVisible}
        mode="datetime"
        onConfirm={(date) => {
          setEndDate(date);
          setEndDateVisible(false);
        }}
        onCancel={() => setEndDateVisible(false)}
        minimumDate={startDate || new Date()}
        date={endDate || startDate || new Date()}
        locale="fr_FR"
        display="inline"
      />

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={styles.locationModalContainer}>
          <View style={styles.locationModalHeader}>
            <Pressable onPress={() => setShowLocationPicker(false)}>
              <MaterialIcons name="close" size={28} color="#303030" />
            </Pressable>
            <Text style={styles.locationModalTitle}>Sélectionner un lieu</Text>
            <Pressable onPress={getCurrentLocation}>
              <MaterialIcons name="my-location" size={28} color="#1271FF" />
            </Pressable>
          </View>

          <MapView
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
            onPress={handleMapPress}
          >
            {tempMarker && (
              <Marker
                coordinate={tempMarker}
                draggable
                onDragEnd={(e) => setTempMarker(e.nativeEvent.coordinate)}
              />
            )}
          </MapView>

          <View style={styles.mapInstructions}>
            <MaterialIcons name="info-outline" size={20} color="#6B7280" />
            <Text style={styles.mapInstructionsText}>
              Tapez sur la carte pour placer un marqueur ou déplacez-le
            </Text>
          </View>

          <View style={styles.locationModalActions}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setShowLocationPicker(false);
                setTempMarker(selectedLocation ? {
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                } : null);
              }}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={styles.submitButton}
              onPress={confirmLocationSelection}
            >
              <Text style={styles.submitButtonText}>Confirmer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal pour créer/éditer un custom field */}
      <Modal
        visible={showCustomFieldForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomFieldForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFieldIndex !== null ? 'Modifier' : 'Ajouter'} un champ
              </Text>
              <Pressable onPress={() => {
                setShowCustomFieldForm(false);
                setEditingFieldIndex(null);
                setCurrentField({
                  id: '',
                  label: '',
                  type: 'text',
                  required: false,
                  options: [],
                });
              }}>
                <MaterialIcons name="close" size={26} color="#303030" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>ID du champ *</Text>
                <TextInput
                  style={styles.input}
                  value={currentField.id}
                  onChangeText={(text) =>
                    setCurrentField({ ...currentField, id: text })
                  }
                  placeholder="Ex: linkedin_url"
                  placeholderTextColor="#9CA3AF"
                  editable={editingFieldIndex === null}
                />
                <Text style={styles.helperText}>
                  Identifiant unique (sans espaces)
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Label *</Text>
                <TextInput
                  style={styles.input}
                  value={currentField.label}
                  onChangeText={(text) =>
                    setCurrentField({ ...currentField, label: text })
                  }
                  placeholder="Ex: Profil LinkedIn"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Type de champ *</Text>
                <View style={styles.typeGrid}>
                  {fieldTypes.map((type) => (
                    <Pressable
                      key={type.value}
                      style={[
                        styles.typeButton,
                        currentField.type === type.value && styles.typeButtonActive,
                      ]}
                      onPress={() =>
                        setCurrentField({ ...currentField, type: type.value as any })
                      }
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          currentField.type === type.value &&
                            styles.typeButtonTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Placeholder (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  value={currentField.placeholder || ''}
                  onChangeText={(text) =>
                    setCurrentField({ ...currentField, placeholder: text })
                  }
                  placeholder="Ex: https://linkedin.com/in/..."
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <Pressable
                style={styles.switchContainer}
                onPress={() =>
                  setCurrentField({
                    ...currentField,
                    required: !currentField.required,
                  })
                }
              >
                <View style={styles.switchLabel}>
                  <Text style={styles.switchLabelText}>Champ requis</Text>
                  <Text style={styles.helperText}>
                    Obligatoire lors de l'inscription
                  </Text>
                </View>
                <View
                  style={[
                    styles.switch,
                    currentField.required && styles.switchActive,
                  ]}
                >
                  <View
                    style={[
                      styles.switchThumb,
                      currentField.required && styles.switchThumbActive,
                    ]}
                  />
                </View>
              </Pressable>

              {/* Options pour select/radio/multiselect */}
              {needsOptions && (
                <View style={styles.optionsSection}>
                  <Text style={styles.label}>Options *</Text>
                  
                  {currentField.options && currentField.options.length > 0 && (
                    <View style={styles.optionsList}>
                      {currentField.options.map((option, index) => (
                        <View key={index} style={styles.optionItem}>
                          <View style={styles.optionInfo}>
                            <Text style={styles.optionLabel}>{option.label}</Text>
                            <Text style={styles.optionValue}>{option.value}</Text>
                          </View>
                          <Pressable
                            onPress={() => handleRemoveOption(index)}
                            style={styles.iconButton}
                          >
                            <MaterialIcons name="close" size={18} color="#EF4444" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.addOptionForm}>
                    <View style={styles.optionInputs}>
                      <TextInput
                        style={[styles.input, styles.optionInput]}
                        value={newOption.value}
                        onChangeText={(text) =>
                          setNewOption({ ...newOption, value: text })
                        }
                        placeholder="Valeur"
                        placeholderTextColor="#9CA3AF"
                      />
                      <TextInput
                        style={[styles.input, styles.optionInput]}
                        value={newOption.label}
                        onChangeText={(text) =>
                          setNewOption({ ...newOption, label: text })
                        }
                        placeholder="Label"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <Pressable
                      style={styles.addOptionIconButton}
                      onPress={handleAddOption}
                    >
                      <MaterialIcons name="add" size={24} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setShowCustomFieldForm(false);
                  setEditingFieldIndex(null);
                  setCurrentField({
                    id: '',
                    label: '',
                    type: 'text',
                    required: false,
                    options: [],
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={styles.submitButton}
                onPress={handleSaveCustomField}
              >
                <Text style={styles.submitButtonText}>
                  {editingFieldIndex !== null ? 'Modifier' : 'Ajouter'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 80,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#1271FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#303030",
    flex: 1,
    letterSpacing: -0.5,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#303030",
    backgroundColor: "#FFFFFF",
  },
  dateInput: {
    paddingRight: 40,
  },
  inputIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  locationInputContainer: {
    position: 'relative',
  },
  locationInput: {
    paddingLeft: 44,
    paddingRight: 40,
  },
  locationInputIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  locationLoadingIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#303030',
    lineHeight: 20,
  },
  
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  mapPickerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1271FF',
  },
  locationModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  locationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#303030',
  },
  map: {
    flex: 1,
  },
  mapInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  mapInstructionsText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  locationModalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  helperText: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 6,
    lineHeight: 18,
  },
  themeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  themeButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  themeButtonActive: {
    backgroundColor: "#303030",
    borderColor: "#303030",
  },
  themeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#303030",
  },
  themeButtonTextActive: {
    color: "#FFFFFF",
  },
  sectionDivider: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 24,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#303030",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  typeButtonActive: {
    backgroundColor: "#1271FF",
    borderColor: "#1271FF",
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#303030",
  },
  typeButtonTextActive: {
    color: "#FFFFFF",
  },
  optionsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  optionsList: {
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 2,
  },
  optionValue: {
    fontSize: 12,
    color: "#6B7280",
  },
  addOptionForm: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  optionInputs: {
    flex: 1,
    gap: 10,
  },
  optionInput: {
    marginBottom: 0,
  },
  addOptionIconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#1271FF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 0,
  },
  iconButton: {
    padding: 6,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  switchLabel: {
    flex: 1,
    paddingRight: 16,
  },
  switchLabelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 4,
  },
  switch: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#D1D5DB",
    padding: 2,
    justifyContent: "center",
  },
  switchActive: {
    backgroundColor: "#1271FF",
  },
  switchThumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    alignSelf: "flex-end",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    flex: 1,
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#303030",
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#303030",
    alignItems: "center",
    shadowColor: "#303030",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
