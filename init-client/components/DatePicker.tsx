import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Modal } from "react-native";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  editable?: boolean;
}

export function DatePicker({ value, onChange, editable = true }: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDay, setTempDay] = useState('');
  const [tempMonth, setTempMonth] = useState('');
  const [tempYear, setTempYear] = useState('');
  
  const parseDate = (dateStr: string) => {
    if (!dateStr) return { day: '', month: '', year: '' };
    const [year, month, day] = dateStr.split('-');
    return { day: day || '', month: month || '', year: year || '' };
  };
  
  const { day, month, year } = parseDate(value);
  
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const months = [
    { value: '01', label: 'Janvier' },
    { value: '02', label: 'Février' },
    { value: '03', label: 'Mars' },
    { value: '04', label: 'Avril' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' },
    { value: '08', label: 'Août' },
    { value: '09', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - 18 - i));
  
  const openPicker = () => {
    setTempDay(day || '01');
    setTempMonth(month || '01');
    setTempYear(year || String(currentYear - 18));
    setShowPicker(true);
  };
  
  const confirmDate = () => {
    if (tempDay && tempMonth && tempYear) {
      onChange(`${tempYear}-${tempMonth}-${tempDay}`);
    }
    setShowPicker(false);
  };
  
  const getDisplayText = () => {
    if (!day || !month || !year) return 'Sélectionner une date';
    const monthLabel = months.find(m => m.value === month)?.label || month;
    return `${day} ${monthLabel} ${year}`;
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Date de naissance * (18 ans minimum)</Text>
      
      <Pressable
        style={styles.displayButton}
        onPress={() => editable && openPicker()}
        disabled={!editable}
      >
        <Text style={[styles.displayText, (!day || !month || !year) && styles.placeholder]}>
          {getDisplayText()}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </Pressable>
      
      <Modal
        visible={showPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowPicker(false)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Sélectionner votre date de naissance</Text>
            
            <View style={styles.pickerRow}>
              {/* Jour */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Jour</Text>
                <ScrollView 
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                >
                  {days.map((d) => (
                    <Pressable
                      key={d}
                      style={[styles.option, d === tempDay && styles.optionSelected]}
                      onPress={() => setTempDay(d)}
                    >
                      <Text style={[styles.optionText, d === tempDay && styles.optionTextSelected]}>
                        {d}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              
              {/* Mois */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Mois</Text>
                <ScrollView 
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                >
                  {months.map((m) => (
                    <Pressable
                      key={m.value}
                      style={[styles.option, m.value === tempMonth && styles.optionSelected]}
                      onPress={() => setTempMonth(m.value)}
                    >
                      <Text style={[styles.optionText, m.value === tempMonth && styles.optionTextSelected]}>
                        {m.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              
              {/* Année */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerLabel}>Année</Text>
                <ScrollView 
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                >
                  {years.map((y) => (
                    <Pressable
                      key={y}
                      style={[styles.option, y === tempYear && styles.optionSelected]}
                      onPress={() => setTempYear(y)}
                    >
                      <Text style={[styles.optionText, y === tempYear && styles.optionTextSelected]}>
                        {y}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </Pressable>
              
              <Pressable
                style={[styles.button, styles.confirmButton]}
                onPress={confirmDate}
              >
                <Text style={styles.confirmButtonText}>Valider</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      
      <Text style={styles.hint}>
        Vous devez avoir au moins 18 ans pour vous inscrire
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: { fontSize: 14, fontWeight: '500', color: '#303030', marginBottom: 8 },
  displayButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  displayText: { fontSize: 16, color: '#303030' },
  placeholder: { color: '#999' },
  arrow: { fontSize: 12, color: '#666' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#303030',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerRow: { 
    flexDirection: 'row', 
    gap: 12, 
    marginBottom: 16,
    height: 200,
  },
  pickerColumn: { flex: 1 },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  scrollView: { 
    backgroundColor: '#F8F8F8', 
    borderRadius: 8,
  },
  option: {
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  optionSelected: { backgroundColor: '#1271FF' },
  optionText: { fontSize: 14, color: '#303030' },
  optionTextSelected: { color: 'white', fontWeight: '600' },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  cancelButtonText: {
    color: '#303030',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#1271FF',
  },
  confirmButtonText: { 
    color: 'white', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  hint: { fontSize: 12, color: '#666', marginTop: 4, marginLeft: 4 },
});