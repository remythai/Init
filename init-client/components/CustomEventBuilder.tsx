// components/CustomFieldsBuilder.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";

export const FIELD_TYPES = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
  EMAIL: 'email',
  PHONE: 'phone',
  DATE: 'date',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SELECT: 'select',
  MULTISELECT: 'multiselect'
};

export interface CustomFieldOption {
  label: string;
  value: string;
}

export interface CustomField {
  id: string;
  type: string;
  label: string;
  options?: CustomFieldOption[];
  required: boolean;
  placeholder: string;
}

interface CustomFieldsBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

export function CustomFieldsBuilder({ fields, onChange }: CustomFieldsBuilderProps) {
  const [expandedFieldIndex, setExpandedFieldIndex] = useState<number | null>(null);

  const addField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      type: FIELD_TYPES.TEXT,
      label: "",
      required: false,
      placeholder: "",
      options: []
    };
    onChange([...fields, newField]);
    setExpandedFieldIndex(fields.length);
  };

  const removeField = (index: number) => {
    Alert.alert(
      "Supprimer le champ",
      "Êtes-vous sûr de vouloir supprimer ce champ ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            onChange(fields.filter((_, i) => i !== index));
            if (expandedFieldIndex === index) {
              setExpandedFieldIndex(null);
            }
          }
        }
      ]
    );
  };

  const updateField = (index: number, updates: Partial<CustomField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };

    if (updates.type && !needsOptions(updates.type)) {
      delete newFields[index].options;
    }
    else if (updates.type && needsOptions(updates.type) && !newFields[index].options) {
      newFields[index].options = [];
    }

    onChange(newFields);
  };

  const addOption = (fieldIndex: number) => {
    const newFields = [...fields];
    if (!newFields[fieldIndex].options) {
      newFields[fieldIndex].options = [];
    }
    newFields[fieldIndex].options!.push({ label: "", value: "" });
    onChange(newFields);
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const newFields = [...fields];
    newFields[fieldIndex].options = newFields[fieldIndex].options!.filter((_, i) => i !== optionIndex);
    onChange(newFields);
  };

  const updateOption = (fieldIndex: number, optionIndex: number, key: 'label' | 'value', value: string) => {
    const newFields = [...fields];
    newFields[fieldIndex].options![optionIndex][key] = value;
    onChange(newFields);
  };

  const needsOptions = (type: string) => {
    return [FIELD_TYPES.RADIO, FIELD_TYPES.SELECT, FIELD_TYPES.MULTISELECT].includes(type);
  };

  const getFieldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      [FIELD_TYPES.TEXT]: 'Texte court',
      [FIELD_TYPES.TEXTAREA]: 'Texte long',
      [FIELD_TYPES.NUMBER]: 'Nombre',
      [FIELD_TYPES.EMAIL]: 'Email',
      [FIELD_TYPES.PHONE]: 'Téléphone',
      [FIELD_TYPES.DATE]: 'Date',
      [FIELD_TYPES.CHECKBOX]: 'Case à cocher',
      [FIELD_TYPES.RADIO]: 'Choix unique (radio)',
      [FIELD_TYPES.SELECT]: 'Menu déroulant',
      [FIELD_TYPES.MULTISELECT]: 'Choix multiples',
    };
    return labels[type] || type;
  };

  const fieldTypes = [
    { value: FIELD_TYPES.TEXT, label: 'Texte court' },
    { value: FIELD_TYPES.TEXTAREA, label: 'Texte long' },
    { value: FIELD_TYPES.NUMBER, label: 'Nombre' },
    { value: FIELD_TYPES.EMAIL, label: 'Email' },
    { value: FIELD_TYPES.PHONE, label: 'Téléphone' },
    { value: FIELD_TYPES.DATE, label: 'Date' },
    { value: FIELD_TYPES.CHECKBOX, label: 'Case à cocher' },
    { value: FIELD_TYPES.RADIO, label: 'Choix unique (radio)' },
    { value: FIELD_TYPES.SELECT, label: 'Menu déroulant' },
    { value: FIELD_TYPES.MULTISELECT, label: 'Choix multiples' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Champs personnalisés</Text>
          <Text style={styles.subtitle}>
            Ajoutez des questions supplémentaires pour l'inscription
          </Text>
        </View>

        <Pressable style={styles.addButton} onPress={addField}>
          <MaterialIcons name="add" size={20} color="#1271FF" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </Pressable>
      </View>

      {/* Empty State */}
      {fields.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons name="inventory-2" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>Aucun champ personnalisé</Text>
          <Text style={styles.emptySubtext}>
            Cliquez sur "Ajouter" pour commencer
          </Text>
        </View>
      )}

      {/* Fields List */}
      <View style={styles.fieldsList}>
        {fields.map((field, fieldIndex) => (
          <View key={field.id} style={styles.fieldCard}>
            {/* Field Header */}
            <Pressable
              style={styles.fieldHeader}
              onPress={() => setExpandedFieldIndex(
                expandedFieldIndex === fieldIndex ? null : fieldIndex
              )}
            >
              <View style={styles.fieldHeaderLeft}>
                <MaterialIcons name="drag-indicator" size={20} color="#9CA3AF" />
                <View style={styles.fieldHeaderInfo}>
                  <Text style={styles.fieldHeaderTitle}>
                    {field.label || `Champ #${fieldIndex + 1}`}
                  </Text>
                  <Text style={styles.fieldHeaderMeta}>
                    {getFieldTypeLabel(field.type)} • {field.required ? 'Requis' : 'Optionnel'}
                  </Text>
                </View>
              </View>
              <View style={styles.fieldHeaderRight}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    removeField(fieldIndex);
                  }}
                  style={styles.iconButton}
                >
                  <MaterialIcons name="delete" size={20} color="#EF4444" />
                </Pressable>
                <MaterialIcons
                  name={expandedFieldIndex === fieldIndex ? "expand-less" : "expand-more"}
                  size={24}
                  color="#6B7280"
                />
              </View>
            </Pressable>

            {/* Field Body (Expanded) */}
            {expandedFieldIndex === fieldIndex && (
              <View style={styles.fieldBody}>
                {/* ID Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>ID du champ</Text>
                  <TextInput
                    style={styles.input}
                    value={field.id}
                    onChangeText={(text) => updateField(fieldIndex, { id: text })}
                    placeholder="Ex: field_question_1"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Type Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Type de champ</Text>
                  <View style={styles.typeGrid}>
                    {fieldTypes.map((type) => (
                      <Pressable
                        key={type.value}
                        style={[
                          styles.typeButton,
                          field.type === type.value && styles.typeButtonActive,
                        ]}
                        onPress={() => updateField(fieldIndex, { type: type.value })}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            field.type === type.value && styles.typeButtonTextActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Label Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Label du champ</Text>
                  <TextInput
                    style={styles.input}
                    value={field.label}
                    onChangeText={(text) => updateField(fieldIndex, { label: text })}
                    placeholder="Ex: Quel est votre niveau ?"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Placeholder Field */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Placeholder</Text>
                  <TextInput
                    style={styles.input}
                    value={field.placeholder}
                    onChangeText={(text) => updateField(fieldIndex, { placeholder: text })}
                    placeholder="Ex: Entrez votre réponse..."
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                {/* Required Switch */}
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Champ obligatoire</Text>
                  <Switch
                    value={field.required}
                    onValueChange={(checked) => updateField(fieldIndex, { required: checked })}
                    trackColor={{ false: "#D1D5DB", true: "#1271FF" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Options for select/radio/multiselect */}
                {needsOptions(field.type) && (
                  <View style={styles.optionsSection}>
                    <View style={styles.optionsHeader}>
                      <Text style={styles.label}>Options</Text>
                      <Pressable
                        style={styles.addOptionButton}
                        onPress={() => addOption(fieldIndex)}
                      >
                        <MaterialIcons name="add" size={16} color="#1271FF" />
                        <Text style={styles.addOptionButtonText}>Ajouter</Text>
                      </Pressable>
                    </View>

                    {(!field.options || field.options.length === 0) && (
                      <View style={styles.emptyOptions}>
                        <Text style={styles.emptyOptionsText}>
                          Aucune option. Ajoutez-en au moins une.
                        </Text>
                      </View>
                    )}

                    <View style={styles.optionsList}>
                      {field.options?.map((option, optionIndex) => (
                        <View key={optionIndex} style={styles.optionItem}>
                          <TextInput
                            style={[styles.input, styles.optionInput]}
                            value={option.label}
                            onChangeText={(text) =>
                              updateOption(fieldIndex, optionIndex, 'label', text)
                            }
                            placeholder="Label"
                            placeholderTextColor="#9CA3AF"
                          />
                          <TextInput
                            style={[styles.input, styles.optionInput]}
                            value={option.value}
                            onChangeText={(text) =>
                              updateOption(fieldIndex, optionIndex, 'value', text)
                            }
                            placeholder="Valeur"
                            placeholderTextColor="#9CA3AF"
                          />
                          <Pressable
                            onPress={() => removeOption(fieldIndex, optionIndex)}
                            style={styles.removeOptionButton}
                          >
                            <MaterialIcons name="close" size={20} color="#EF4444" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  
  headerText: {
    flex: 1,
    flexShrink: 1,
    marginRight: 12,
  },
  
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#303030',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#1271FF',
    backgroundColor: '#F0F7FF',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1271FF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  fieldsList: {
    gap: 12,
  },
  fieldCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  fieldHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  fieldHeaderInfo: {
    flex: 1,
  },
  fieldHeaderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#303030',
    marginBottom: 2,
  },
  fieldHeaderMeta: {
    fontSize: 11,
    color: '#6B7280',
  },
  fieldHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  fieldBody: {
    padding: 16,
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#303030',
    backgroundColor: '#FFFFFF',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    backgroundColor: '#1271FF',
    borderColor: '#1271FF',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#303030',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  optionsSection: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1271FF',
    backgroundColor: '#F0F7FF',
  },
  addOptionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1271FF',
  },
  emptyOptions: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyOptionsText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    overflow: 'hidden',
  },

  optionInput: {
    flex: 1,
    minWidth: 0,
  },
  removeOptionButton: {
    padding: 6,
  },
});
