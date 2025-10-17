import { View, Text, StyleSheet } from 'react-native';

export default function EventSwiperScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>SWIPER</Text>
      <Text style={styles.subtitle}>
        (montagne de caca)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});