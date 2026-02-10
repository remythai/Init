// components/CreateEventDialog.tsx
import { CustomField, getFieldId, eventService } from "@/services/event.service";
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

  // Date pickers states
  const [isAppStartDateVisible, setAppStartDateVisible] = useState(false);
  const [isAppEndDateVisible, setAppEndDateVisible] = useState(false);
  const [isPhysicalStartDateVisible, setPhysicalStartDateVisible] = useState(false);
  const [isPhysicalEndDateVisible, setPhysicalEndDateVisible] = useState(false);

  const [appStartDate, setAppStartDate] = useState<Date | null>(null);
  const [appEndDate, setAppEndDate] = useState<Date | null>(null);
  const [physicalStartDate, setPhysicalStartDate] = useState<Date | null>(null);
  const [physicalEndDate, setPhysicalEndDate] = useState<Date | null>(null);

  // Location states
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
    has_physical_event: false,
  });

  const [error, setError] = useState("");

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

    const maxParticipants = parseInt(formData.max_participants);
    if (isNaN(maxParticipants) || maxParticipants < 1) {
      return "Le nombre de participants doit être supérieur à 0";
    }

    // App availability dates are required
    if (!appStartDate) {
      return "La date de début de disponibilité de l'app est requise";
    }

    if (!appEndDate) {
      return "La date de fin de disponibilité de l'app est requise";
    }

    if (appEndDate <= appStartDate) {
      return "La date de fin de l'app doit être après la date de début";
    }

    // Physical event validation (optional)
    if (formData.has_physical_event) {
      if (!locationInput.trim()) {
        return "Le lieu est requis pour un événement physique";
      }

      if (!physicalStartDate) {
        return "La date de début de l'événement physique est requise";
      }

      if (!physicalEndDate) {
        return "La date de fin de l'événement physique est requise";
      }

      if (physicalEndDate <= physicalStartDate) {
        return "La date de fin de l'événement physique doit être après la date de début";
      }
    }

    if (formData.has_password_access && !formData.access_password.trim()) {
      return "Un mot de passe est requis quand l'accès par mot de passe est activé";
    }

    if (formData.cooldown && isNaN(parseInt(formData.cooldown))) {
      return "Le cooldown doit être un nombre";
    }

    return null;
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
      // ✅ GARDER l'ID - le backend en a besoin
      const customFieldsForBackend = customFields.map(field => ({
        ...field,
        id: field.id || getFieldId(field.label)  // S'assurer que l'ID existe
      }));

      const eventData: Parameters<typeof eventService.createEvent>[0] = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        max_participants: parseInt(formData.max_participants),
        is_public: formData.is_public,
        has_whitelist: formData.has_whitelist,
        has_link_access: formData.has_link_access,
        has_password_access: formData.has_password_access,
        custom_fields: customFieldsForBackend.length > 0 ? customFieldsForBackend : undefined,
        // App availability dates (required)
        app_start_at: appStartDate!.toISOString(),
        app_end_at: appEndDate!.toISOString(),
        // Theme
        theme: formData.theme,
      };

      // Physical event dates and location (optional)
      if (formData.has_physical_event && physicalStartDate && physicalEndDate) {
        eventData.start_at = physicalStartDate.toISOString();
        eventData.end_at = physicalEndDate.toISOString();
        eventData.location = locationInput.trim();
      }

      if (formData.has_password_access && formData.access_password) {
        eventData.access_password = formData.access_password;
      }

      if (formData.cooldown) {
        eventData.cooldown = `${formData.cooldown} hours`;
      }

      console.log('Sending event data:', JSON.stringify(eventData, null, 2));  // Debug

      await eventService.createEvent(eventData);

      Alert.alert("Succès", "Événement créé avec succès!");

      // Reset form
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
        has_physical_event: false,
      });
      setAppStartDate(null);
      setAppEndDate(null);
      setPhysicalStartDate(null);
      setPhysicalEndDate(null);
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
                  maxLength={100}
                />
                <Text style={[styles.helperText, formData.name.length >= 90 && styles.warningText]}>
                  {formData.name.length}/100
                </Text>
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
                  maxLength={1000}
                />
                <Text style={[styles.helperText, formData.description.length >= 900 && styles.warningText]}>
                  {formData.description.length}/1000
                </Text>
              </View>

              {/* Banner Info */}
              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color="#1271FF" />
                <Text style={styles.infoText}>
                  Image de bannière : Vous pourrez ajouter une image de bannière personnalisée après la création de l'événement.
                </Text>
              </View>

              {/* App Availability Section */}
              <View style={styles.sectionDivider}>
                <Text style={styles.sectionTitle}>Disponibilité de l'app *</Text>
                <Text style={styles.helperText}>
                  Période pendant laquelle les utilisateurs peuvent accéder au swiper, matcher et discuter.
                </Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Début de disponibilité *</Text>
                  <Pressable onPress={() => setAppStartDateVisible(true)}>
                    <View pointerEvents="none">
                      <TextInput
                        style={[styles.input, styles.dateInput]}
                        value={appStartDate ? formatDateTime(appStartDate) : ''}
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

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Fin de disponibilité *</Text>
                  <Pressable onPress={() => setAppEndDateVisible(true)}>
                    <View pointerEvents="none">
                      <TextInput
                        style={[styles.input, styles.dateInput]}
                        value={appEndDate ? formatDateTime(appEndDate) : ''}
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
              </View>

              {/* Physical Event Toggle */}
              <View style={styles.sectionDivider}>
                <Pressable
                  style={styles.switchContainer}
                  onPress={() =>
                    setFormData({ ...formData, has_physical_event: !formData.has_physical_event })
                  }
                  disabled={loading}
                >
                  <View style={styles.switchLabel}>
                    <Text style={styles.switchLabelText}>Événement physique</Text>
                    <Text style={styles.helperText}>
                      {formData.has_physical_event ? "L'événement a un lieu et une date" : "Pas de lieu ni de date physique"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.switch,
                      formData.has_physical_event && styles.switchActive,
                    ]}
                  >
                    <View
                      style={[
                        styles.switchThumb,
                        formData.has_physical_event && styles.switchThumbActive,
                      ]}
                    />
                  </View>
                </Pressable>

                {/* Physical Event Dates and Location */}
                {formData.has_physical_event && (
                  <View style={styles.physicalEventSection}>
                    <Text style={styles.helperText}>
                      Quand et où se déroule l'événement physique.
                    </Text>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Début de l'événement *</Text>
                      <Pressable onPress={() => setPhysicalStartDateVisible(true)}>
                        <View pointerEvents="none">
                          <TextInput
                            style={[styles.input, styles.dateInput]}
                            value={physicalStartDate ? formatDateTime(physicalStartDate) : ''}
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

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Fin de l'événement *</Text>
                      <Pressable onPress={() => setPhysicalEndDateVisible(true)}>
                        <View pointerEvents="none">
                          <TextInput
                            style={[styles.input, styles.dateInput]}
                            value={physicalEndDate ? formatDateTime(physicalEndDate) : ''}
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

                    {/* Location */}
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
                  </View>
                )}
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
                    <Text style={[
                      styles.helperText,
                      styles.publicStatusText,
                      formData.is_public ? styles.publicStatus : styles.privateStatus
                    ]}>
                      {formData.is_public ? "✓ PUBLIC - Visible dans la liste" : "✗ PRIVÉ - Non visible"}
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
        isVisible={isAppStartDateVisible}
        mode="datetime"
        onConfirm={(date) => {
          setAppStartDate(date);
          setAppStartDateVisible(false);
        }}
        onCancel={() => setAppStartDateVisible(false)}
        minimumDate={new Date()}
        date={appStartDate || new Date()}
        locale="fr_FR"
        display="inline"
      />

      <DateTimePickerModal
        isVisible={isAppEndDateVisible}
        mode="datetime"
        onConfirm={(date) => {
          setAppEndDate(date);
          setAppEndDateVisible(false);
        }}
        onCancel={() => setAppEndDateVisible(false)}
        minimumDate={appStartDate || new Date()}
        date={appEndDate || appStartDate || new Date()}
        locale="fr_FR"
        display="inline"
      />

      <DateTimePickerModal
        isVisible={isPhysicalStartDateVisible}
        mode="datetime"
        onConfirm={(date) => {
          setPhysicalStartDate(date);
          setPhysicalStartDateVisible(false);
        }}
        onCancel={() => setPhysicalStartDateVisible(false)}
        minimumDate={new Date()}
        date={physicalStartDate || new Date()}
        locale="fr_FR"
        display="inline"
      />

      <DateTimePickerModal
        isVisible={isPhysicalEndDateVisible}
        mode="datetime"
        onConfirm={(date) => {
          setPhysicalEndDate(date);
          setPhysicalEndDateVisible(false);
        }}
        onCancel={() => setPhysicalEndDateVisible(false)}
        minimumDate={physicalStartDate || new Date()}
        date={physicalEndDate || physicalStartDate || new Date()}
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
  warningText: {
    color: "#F59E0B",
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },
  physicalEventSection: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginTop: 12,
    gap: 16,
  },
  publicStatusText: {
    fontWeight: "600",
    marginTop: 4,
  },
  publicStatus: {
    color: "#16A34A",
  },
  privateStatus: {
    color: "#DC2626",
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
    marginBottom: 12,
    letterSpacing: -0.3,
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