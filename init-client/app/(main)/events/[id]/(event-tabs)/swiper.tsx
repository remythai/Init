// app/(main)/events/[id]/(event-tabs)/swiper.tsx
import { View, StyleSheet } from "react-native";
import { EventSwiper } from "@/components/Swiper";

export default function SwiperScreen() {
  return (
    <View style={styles.container}>
      <EventSwiper
        onMatch={(profileId) => {
          console.log("Match avec le profil:", profileId);
          // TODO: appel API / mutation
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
