"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, Plus, Edit2, Trash2, X } from "lucide-react";
import { authService } from "../../../services/auth.service";
import { eventService, EventResponse, CustomField, getFieldId } from "../../../services/event.service";

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

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    // Physical event dates (optional)
    has_physical_event: false,
    start_at: "",
    end_at: "",
    location: "",
    // App availability dates (required)
    app_start_at: "",
    app_end_at: "",
    max_participants: "",
    is_public: true,
    has_whitelist: false,
    has_link_access: true,
    has_password_access: false,
    access_password: "",
    cooldown: "",
    theme: "Professionnel",
  });

  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showCustomFieldForm, setShowCustomFieldForm] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [currentField, setCurrentField] = useState<CustomField>({
    label: "",
    type: "text",
    required: false,
    options: [],
  });
  const [newOption, setNewOption] = useState("");

  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const themeOptions = ["Professionnel", "Musique", "Sport", "Cafe", "Etudiant", "Fete"];

  const fieldTypes: { value: CustomField['type']; label: string }[] = [
    { value: "text", label: "Texte court" },
    { value: "textarea", label: "Texte long" },
    { value: "number", label: "Nombre" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Telephone" },
    { value: "date", label: "Date" },
    { value: "checkbox", label: "Case a cocher" },
    { value: "select", label: "Menu deroulant" },
    { value: "radio", label: "Choix unique" },
    { value: "multiselect", label: "Choix multiples" },
  ];

  const needsOptions = ["select", "radio", "multiselect"].includes(currentField.type);

  useEffect(() => {
    const initPage = async () => {
      const validatedType = await authService.validateAndGetUserType();

      if (!validatedType) {
        router.push("/auth");
        return;
      }

      if (validatedType !== "orga") {
        router.push("/events");
        return;
      }

      loadEvent();
    };

    initPage();
  }, [eventId]);

  useEffect(() => {
    if (formData.location.length > 2) {
      const timer = setTimeout(() => {
        searchAddress(formData.location);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  }, [formData.location]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      const response = await authService.authenticatedFetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error("Evenement non trouve");
      const data = await response.json();
      const eventData: EventResponse = data.data;

      const formatDateTimeLocal = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 16);
      };

      setFormData({
        name: eventData.name || "",
        description: eventData.description || "",
        // Physical event - optional
        has_physical_event: !!(eventData.start_at || eventData.location),
        start_at: eventData.start_at ? formatDateTimeLocal(eventData.start_at) : "",
        end_at: eventData.end_at ? formatDateTimeLocal(eventData.end_at) : "",
        location: eventData.location || "",
        // App availability - required
        app_start_at: eventData.app_start_at ? formatDateTimeLocal(eventData.app_start_at) : "",
        app_end_at: eventData.app_end_at ? formatDateTimeLocal(eventData.app_end_at) : "",
        max_participants: eventData.max_participants?.toString() || "",
        is_public: eventData.is_public ?? true,
        has_whitelist: eventData.has_whitelist ?? false,
        has_link_access: eventData.has_link_access ?? true,
        has_password_access: eventData.has_password_access ?? false,
        access_password: "",
        cooldown: "",
        theme: "Professionnel",
      });

      if (eventData.custom_fields) {
        setCustomFields(eventData.custom_fields);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du chargement";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const searchAddress = async (query: string) => {
    setLoadingSuggestions(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=5&countrycodes=fr&addressdetails=1`;

      const response = await fetch(url, {
        headers: { "User-Agent": "EventApp/1.0" },
      });
      const data = await response.json();

      setAddressSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error("Erreur recherche adresse:", error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    let shortAddress = "";

    if (suggestion.address) {
      const addr = suggestion.address;
      const street =
        addr.house_number && addr.road
          ? `${addr.house_number} ${addr.road}`
          : addr.road || "";
      const postcode = addr.postcode || "";
      const city = addr.city || addr.town || addr.village || addr.municipality || "";

      if (street && postcode && city) {
        shortAddress = `${street}, ${postcode} ${city}`;
      } else if (street && city) {
        shortAddress = `${street}, ${city}`;
      } else if (postcode && city) {
        shortAddress = `${postcode} ${city}`;
      } else {
        const parts = suggestion.display_name.split(", ");
        shortAddress = parts.slice(0, 3).join(", ");
      }
    } else {
      const parts = suggestion.display_name.split(", ");
      shortAddress = parts.slice(0, 3).join(", ");
    }

    setFormData({ ...formData, location: shortAddress });
    setShowSuggestions(false);
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;

    setCurrentField({
      ...currentField,
      options: [...(currentField.options || []), newOption.trim()],
    });
    setNewOption("");
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = currentField.options?.filter((_, i) => i !== index) || [];
    setCurrentField({ ...currentField, options: updatedOptions });
  };

  const handleSaveCustomField = () => {
    if (!currentField.label.trim()) return;

    if (needsOptions && (!currentField.options || currentField.options.length === 0)) return;

    if (editingFieldIndex !== null) {
      const updatedFields = [...customFields];
      updatedFields[editingFieldIndex] = currentField;
      setCustomFields(updatedFields);
    } else {
      // Vérifier si un champ avec le même label existe déjà
      const newFieldId = getFieldId(currentField.label);
      if (customFields.some((f) => getFieldId(f.label) === newFieldId)) {
        return; // Label déjà utilisé
      }
      setCustomFields([...customFields, currentField]);
    }

    setCurrentField({
      label: "",
      type: "text",
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
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError("");

    if (!formData.name.trim()) {
      setError("Le nom de l'evenement est requis");
      return;
    }
    if (!formData.description.trim()) {
      setError("La description est requise");
      return;
    }

    // App availability dates are required
    if (!formData.app_start_at) {
      setError("La date de debut de disponibilite de l'app est requise");
      return;
    }
    if (!formData.app_end_at) {
      setError("La date de fin de disponibilite de l'app est requise");
      return;
    }

    const appStartDate = new Date(formData.app_start_at);
    const appEndDate = new Date(formData.app_end_at);

    if (appEndDate <= appStartDate) {
      setError("La date de fin de l'app doit etre apres la date de debut");
      return;
    }

    // Physical event dates (optional)
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (formData.has_physical_event) {
      if (!formData.location.trim()) {
        setError("Le lieu est requis pour un evenement physique");
        return;
      }
      if (!formData.start_at) {
        setError("La date de debut de l'evenement physique est requise");
        return;
      }
      if (!formData.end_at) {
        setError("La date de fin de l'evenement physique est requise");
        return;
      }

      startDate = new Date(formData.start_at);
      endDate = new Date(formData.end_at);

      if (endDate <= startDate) {
        setError("La date de fin de l'evenement physique doit etre apres la date de debut");
        return;
      }
    }

    const maxParticipants = parseInt(formData.max_participants);
    if (!formData.max_participants || isNaN(maxParticipants) || maxParticipants < 1) {
      setError("Le nombre de participants doit etre superieur a 0");
      return;
    }

    if (formData.has_password_access && !formData.access_password.trim()) {
      setError("Un mot de passe est requis quand l'acces par mot de passe est active");
      return;
    }

    setSaving(true);

    try {
      const eventData: Parameters<typeof eventService.updateEvent>[1] = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        location: formData.has_physical_event ? formData.location.trim() : undefined,
        max_participants: maxParticipants,
        is_public: formData.is_public,
        has_whitelist: formData.has_whitelist,
        has_link_access: formData.has_link_access,
        has_password_access: formData.has_password_access,
        custom_fields: customFields.length > 0 ? customFields : undefined,
        // App availability dates (required)
        app_start_at: appStartDate.toISOString(),
        app_end_at: appEndDate.toISOString(),
      };

      // Physical event dates (optional)
      if (formData.has_physical_event && startDate && endDate) {
        eventData.start_at = startDate.toISOString();
        eventData.end_at = endDate.toISOString();
      }

      if (formData.has_password_access && formData.access_password) {
        eventData.access_password = formData.access_password;
      }

      if (formData.cooldown) {
        eventData.cooldown = `${formData.cooldown} hours`;
      }

      await eventService.updateEvent(eventId, eventData);
      router.push(`/events/${eventId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors de la mise a jour";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1271FF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#303030] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/initLogoGray.png"
              alt="Init Logo"
              width={200}
              height={80}
              className="h-16 w-auto"
            />
          </Link>
          <Link
            href={`/events/${eventId}`}
            className="text-white/70 hover:text-white text-sm transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-28 pb-8 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-poppins text-2xl font-bold text-[#303030] mb-6">
            Modifier l'evenement
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-[#303030] mb-2">
                Nom de l'evenement *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Soiree Networking"
                disabled={saving}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
              />
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-semibold text-[#303030] mb-2">
                Theme
              </label>
              <div className="flex flex-wrap gap-2">
                {themeOptions.map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    onClick={() => setFormData({ ...formData, theme })}
                    disabled={saving}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      formData.theme === theme
                        ? "bg-[#303030] text-white"
                        : "bg-gray-100 text-[#303030] hover:bg-gray-200"
                    } disabled:opacity-50`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-[#303030] mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Decrivez votre evenement..."
                rows={4}
                disabled={saving}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] resize-none disabled:bg-gray-100"
              />
            </div>

            {/* App Availability Dates (Required) */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-[#303030]">
                Disponibilite de l'app *
              </h3>
              <p className="text-sm text-gray-600">
                Periode pendant laquelle les utilisateurs peuvent acceder au swiper, matcher et discuter.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#303030] mb-2">
                    Debut de disponibilite *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.app_start_at}
                    onChange={(e) => setFormData({ ...formData, app_start_at: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#303030] mb-2">
                    Fin de disponibilite *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.app_end_at}
                    onChange={(e) => setFormData({ ...formData, app_end_at: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Physical Event Toggle */}
            <div className="space-y-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, has_physical_event: !formData.has_physical_event })}
                disabled={saving}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-medium text-[#303030]">Evenement physique</p>
                  <p className="text-sm text-gray-600">
                    {formData.has_physical_event ? "L'evenement a un lieu et une date" : "Pas de lieu ni de date physique"}
                  </p>
                </div>
                <div
                  className={`w-12 h-7 rounded-full p-1 transition-colors ${
                    formData.has_physical_event ? "bg-[#1271FF]" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform ${
                      formData.has_physical_event ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>

              {/* Physical Event Dates and Location */}
              {formData.has_physical_event && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">
                    Quand et ou se deroule l'evenement physique.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#303030] mb-2">
                        Debut de l'evenement *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.start_at}
                        onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                        disabled={saving}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#303030] mb-2">
                        Fin de l'evenement *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.end_at}
                        onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                        disabled={saving}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100 bg-white"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-[#303030] mb-2">
                      Lieu *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        onFocus={() => {
                          if (addressSuggestions.length > 0) setShowSuggestions(true);
                        }}
                        placeholder="Commencez a taper une adresse..."
                        disabled={saving}
                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100 bg-white"
                      />
                      {loadingSuggestions && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="w-5 h-5 border-2 border-[#1271FF] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>

                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {addressSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.place_id}
                            type="button"
                            onClick={() => selectAddress(suggestion)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 border-b border-gray-100 last:border-0"
                          >
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-[#303030] line-clamp-2">
                              {suggestion.display_name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Max Participants */}
            <div>
              <label className="block text-sm font-semibold text-[#303030] mb-2">
                Nombre maximum de participants *
              </label>
              <input
                type="number"
                value={formData.max_participants}
                onChange={(e) => setFormData({ ...formData, max_participants: e.target.value })}
                placeholder="Ex: 50"
                min="1"
                disabled={saving}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
              />
            </div>

            {/* Access Settings */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-[#303030]">Parametres d'acces</h3>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_public: !formData.is_public })}
                disabled={saving}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-medium text-[#303030]">Evenement public</p>
                  <p className="text-sm text-gray-600">Visible par tous les utilisateurs</p>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${formData.is_public ? "bg-[#1271FF]" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${formData.is_public ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, has_whitelist: !formData.has_whitelist })}
                disabled={saving}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-medium text-[#303030]">Liste blanche</p>
                  <p className="text-sm text-gray-600">Restreindre l'acces a certaines personnes</p>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${formData.has_whitelist ? "bg-[#1271FF]" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${formData.has_whitelist ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, has_link_access: !formData.has_link_access })}
                disabled={saving}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-medium text-[#303030]">Acces par lien</p>
                  <p className="text-sm text-gray-600">Autoriser l'inscription via un lien</p>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${formData.has_link_access ? "bg-[#1271FF]" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${formData.has_link_access ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, has_password_access: !formData.has_password_access })}
                disabled={saving}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl disabled:opacity-50"
              >
                <div className="text-left">
                  <p className="font-medium text-[#303030]">Acces par mot de passe</p>
                  <p className="text-sm text-gray-600">Proteger l'evenement par mot de passe</p>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${formData.has_password_access ? "bg-[#1271FF]" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${formData.has_password_access ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </button>

              {formData.has_password_access && (
                <div>
                  <label className="block text-sm font-semibold text-[#303030] mb-2">
                    Nouveau mot de passe d'acces
                  </label>
                  <input
                    type="password"
                    value={formData.access_password}
                    onChange={(e) => setFormData({ ...formData, access_password: e.target.value })}
                    placeholder="Laissez vide pour conserver l'ancien"
                    disabled={saving}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                  />
                </div>
              )}
            </div>

            {/* Custom Fields */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#303030]">Champs personnalises</h3>
                <button
                  type="button"
                  onClick={() => setShowCustomFieldForm(true)}
                  disabled={saving}
                  className="flex items-center gap-1 text-[#1271FF] hover:text-[#0d5dd8] text-sm font-medium disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter
                </button>
              </div>

              {customFields.length > 0 && (
                <div className="space-y-2">
                  {customFields.map((field, index) => (
                    <div
                      key={getFieldId(field.label)}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-[#303030]">{field.label}</p>
                        <p className="text-xs text-gray-600">
                          {fieldTypes.find((t) => t.value === field.type)?.label} {field.required && "- Requis"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditCustomField(index)}
                          className="p-1 text-gray-600 hover:text-[#1271FF]"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomField(index)}
                          className="p-1 text-gray-600 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advanced Settings */}
            <div className="space-y-3 pt-4 border-t">
              <h3 className="font-semibold text-[#303030]">Parametres avances</h3>

              <div>
                <label className="block text-sm font-semibold text-[#303030] mb-2">
                  Cooldown (en heures)
                </label>
                <input
                  type="number"
                  value={formData.cooldown}
                  onChange={(e) => setFormData({ ...formData, cooldown: e.target.value })}
                  placeholder="Ex: 24"
                  min="0"
                  disabled={saving}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Delai avant de pouvoir s'inscrire a nouveau
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Link
                href={`/events/${eventId}`}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-[#303030] font-medium hover:bg-gray-50 transition-colors text-center"
              >
                Annuler
              </Link>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-3 rounded-xl bg-[#303030] text-white font-medium hover:bg-[#404040] transition-colors disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Custom Field Modal */}
      {showCustomFieldForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowCustomFieldForm(false);
              setEditingFieldIndex(null);
              setCurrentField({ label: "", type: "text", required: false, options: [] });
            }}
          />
          <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-poppins text-xl font-semibold text-[#303030]">
                {editingFieldIndex !== null ? "Modifier" : "Ajouter"} un champ
              </h2>
              <button
                onClick={() => {
                  setShowCustomFieldForm(false);
                  setEditingFieldIndex(null);
                  setCurrentField({ label: "", type: "text", required: false, options: [] });
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-[#303030]" />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
              <div>
                <label className="block text-sm font-semibold text-[#303030] mb-2">Question *</label>
                <input
                  type="text"
                  value={currentField.label}
                  onChange={(e) => setCurrentField({ ...currentField, label: e.target.value })}
                  placeholder="Ex: Quel est votre profil LinkedIn ?"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF]"
                />
                <p className="text-xs text-gray-500 mt-1">Cette question sera affichee aux participants</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#303030] mb-2">Type de champ *</label>
                <div className="flex flex-wrap gap-2">
                  {fieldTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setCurrentField({ ...currentField, type: type.value })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        currentField.type === type.value
                          ? "bg-[#1271FF] text-white"
                          : "bg-gray-100 text-[#303030] hover:bg-gray-200"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCurrentField({ ...currentField, required: !currentField.required })}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div className="text-left">
                  <p className="font-medium text-[#303030]">Champ requis</p>
                  <p className="text-sm text-gray-600">Obligatoire lors de l'inscription</p>
                </div>
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${currentField.required ? "bg-[#1271FF]" : "bg-gray-300"}`}>
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${currentField.required ? "translate-x-5" : "translate-x-0"}`} />
                </div>
              </button>

              {needsOptions && (
                <div className="space-y-3 pt-4 border-t">
                  <label className="block text-sm font-semibold text-[#303030]">Choix possibles *</label>

                  {currentField.options && currentField.options.length > 0 && (
                    <div className="space-y-2">
                      {currentField.options.map((option, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium text-[#303030]">{option}</p>
                          <button type="button" onClick={() => handleRemoveOption(index)} className="p-1 text-red-500 hover:text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOption}
                      onChange={(e) => setNewOption(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                      placeholder="Ajouter un choix..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[#303030] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1271FF] text-sm"
                    />
                    <button type="button" onClick={handleAddOption} className="px-3 py-2 bg-[#1271FF] text-white rounded-lg hover:bg-[#0d5dd8]">
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => {
                  setShowCustomFieldForm(false);
                  setEditingFieldIndex(null);
                  setCurrentField({ label: "", type: "text", required: false, options: [] });
                }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-[#303030] font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveCustomField}
                className="flex-1 py-3 rounded-xl bg-[#303030] text-white font-medium hover:bg-[#404040] transition-colors"
              >
                {editingFieldIndex !== null ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
