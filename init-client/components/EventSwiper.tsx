// components/EventSwiper.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ImageBackground,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from 'expo-router';
import { matchService, Profile } from '@/services/match.service';

const { width, height } = Dimensions.get("window");
const SWIPE_THRESHOLD = width * 0.25;

export interface EventProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  interests: string[];
  images: string[];
  customFields?: Record<string, string>;
}

interface EventSwiperProps {
  eventId: number;
  onMatch?: () => void;
}

function profileToEventProfile(profile: Profile): EventProfile {
  const age = new Date().getFullYear() - new Date(profile.birthday).getFullYear();
  return {
    id: profile.user_id.toString(),
    name: `${profile.firstname} ${profile.lastname}`,
    age,
    bio: profile.profil_info?.bio || "Aucune bio fournie",
    interests: profile.profil_info?.interests || [],
    images: profile.photos.map(p => p.file_path),
    customFields: profile.profil_info || {},
  };
}

export function EventSwiper({ eventId, onMatch }: EventSwiperProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<EventProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const position = useRef(new Animated.ValueXY()).current;
  const currentProfile = profiles[currentIndex];

  // 🔄 LOAD API PROFILES
  useEffect(() => {
    loadProfiles();
  }, [eventId]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const newProfiles = await matchService.getProfiles(eventId, 20);
      setProfiles(newProfiles);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Erreur chargement profils:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentProfile) {
      position.setValue({ x: 0, y: 0 });
      position.setOffset({ x: 0, y: 0 });
      position.flattenOffset();
      setCurrentImageIndex(0);
    }
  }, [currentIndex]);

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
    }).start();
  };

  const forceSwipe = async (direction: "left" | "right") => {
    const x = direction === "right" ? width + 100 : -width - 100;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = async (direction: "left" | "right") => {
    if (!currentProfile) return;

    try {
      if (direction === "right") {
        const result = await matchService.likeProfile(eventId, currentProfile.user_id);
        if (result.matched) {
          onMatch?.();
          refreshMatches(eventId);
          router.push(`/(main)/events/${eventId}/(event-tabs)/profile`);
        }
      } else {
        await matchService.passProfile(eventId, currentProfile.user_id);
      }
    } catch (error) {
      console.error(`${direction} failed:`, error);
    }

    nextProfile();
  };

  const nextProfile = () => {
    if (currentIndex + 1 < profiles.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      loadProfiles();
    }
  };

  const handleModalSwipe = (direction: "left" | "right") => {
    setShowProfileModal(false);
    setTimeout(() => forceSwipe(direction), 300);
  };

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
        return isHorizontal && Math.abs(gesture.dx) > 5;
      },
      onPanResponderGrant: () => {
        position.setOffset({
          x: position.x._value,
          y: position.y._value,
        });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        position.flattenOffset();
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe("right");
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe("left");
        } else {
          resetPosition();
        }
      },
    }),
    [currentIndex]
  );

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Chargement des profils...</Text>
      </View>
    );
  }

  if (!currentProfile) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrapper}>
          <MaterialIcons name="favorite-border" size={40} color="#303030" />
        </View>
        <Text style={styles.emptyTitle}>Plus de profils disponibles</Text>
        <Text style={styles.emptyText}>Revenez plus tard !</Text>
      </View>
    );
  }

  const uiProfile = profileToEventProfile(currentProfile);

  const rotate = position.x.interpolate({
    inputRange: [-width * 1.5, 0, width * 1.5],
    outputRange: ["-20deg", "0deg", "20deg"],
  });

  const cardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate },
    ],
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex(prev => 
      prev > 0 ? prev - 1 : currentProfile.images.length - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => 
      prev < currentProfile.images.length - 1 ? prev + 1 : 0
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.cardContainer}>
        <Animated.View
          style={[styles.cardWrapper, cardStyle]}
          {...panResponder.panHandlers}
        >
          <View style={styles.card}>
            <View style={styles.imageSection}>
              <ImageBackground
                key={`${uiProfile.id}-${currentImageIndex}`}
                source={{ uri: uiProfile.images[currentImageIndex] }}
                style={styles.imageBackground}
                resizeMode="cover"
              >
                <View style={styles.imageOverlay} />

                <View style={styles.imageTouchContainer} pointerEvents="box-none">
                  {uiProfile.images.length > 1 && (
                    <>
                      <Pressable 
                        style={styles.imageTouchLeft}
                        onPress={handlePreviousImage}
                      />
                      <Pressable 
                        style={styles.imageTouchRight}
                        onPress={handleNextImage}
                      />
                    </>
                  )}
                </View>

                {uiProfile.images.length > 1 && (
                  <View style={styles.paginationContainer} pointerEvents="none">
                    {uiProfile.images.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.paginationDot,
                          index === currentImageIndex && styles.paginationDotActive
                        ]}
                      />
                    ))}
                  </View>
                )}

                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.imageBottomGradient}
                  pointerEvents="box-none"
                >
                  <View style={styles.nameRow} pointerEvents="box-none">
                    <Text style={styles.nameOnImage}>
                      {uiProfile.name}, {uiProfile.age}
                    </Text>
                    <Pressable 
                      style={styles.infoButton}
                      onPress={() => {
                        setSelectedProfile(uiProfile);
                        setShowProfileModal(true);
                      }}
                      pointerEvents="auto"
                    >
                      <MaterialIcons name="account-circle" size={24} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </LinearGradient>
              </ImageBackground>
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.buttonsRow}>
        <Pressable
          style={[styles.actionButton, styles.dislikeButton]}
          onPress={() => forceSwipe("left")}
        >
          <MaterialIcons name="close" size={28} color="#EF4444" />
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => forceSwipe("right")}
        >
          <MaterialIcons name="favorite" size={28} color="#10B981" />
        </Pressable>
      </View>

      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={StyleSheet.absoluteFill} 
            onPress={() => setShowProfileModal(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProfile?.name}, {selectedProfile?.age}
              </Text>
              <Pressable onPress={() => setShowProfileModal(false)}>
                <MaterialIcons name="close" size={28} color="#303030" />
              </Pressable>
            </View>

            <ScrollView 
              style={{ maxHeight: height * 0.8 - 160 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>À propos</Text>
                <Text style={styles.modalSectionText}>{selectedProfile?.bio}</Text>
              </View>

              {selectedProfile?.customFields &&
                Object.keys(selectedProfile.customFields).length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Informations</Text>
                    {Object.entries(selectedProfile.customFields).map(
                      ([key, value]) => (
                        <View key={key} style={styles.infoItem}>
                          <Text style={styles.infoLabel}>{key}</Text>
                          <Text style={styles.infoValue}>{value}</Text>
                        </View>
                      )
                    )}
                  </View>
                )}

              {selectedProfile?.interests && selectedProfile.interests.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Centres d'intérêt</Text>
                  <View style={styles.chipsContainer}>
                    {selectedProfile.interests.map((interest) => (
                      <View key={interest} style={styles.chip}>
                        <Text style={styles.chipText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={{ height: 60 }} />
            </ScrollView>

            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
              style={styles.modalGradient}
            />

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalActionButton, styles.modalDislikeButton]}
                onPress={() => handleModalSwipe("left")}
              >
                <MaterialIcons name="close" size={32} color="#EF4444" />
              </Pressable>

              <Pressable
                style={[styles.modalActionButton, styles.modalLikeButton]}
                onPress={() => handleModalSwipe("right")}
              >
                <MaterialIcons name="favorite" size={32} color="#10B981" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingTop: 12,
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  cardWrapper: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  imageSection: {
    flex: 1,
  },
  imageBackground: {
    flex: 1,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  imageTouchContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  imageTouchLeft: {
    flex: 1,
  },
  imageTouchRight: {
    flex: 1,
  },
  paginationContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
  },
  paginationDot: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 2,
  },
  paginationDotActive: {
    backgroundColor: '#FFFFFF',
  },
  imageBottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameOnImage: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  dislikeButton: {
    borderWidth: 2,
    borderColor: "#FCA5A5",
  },
  likeButton: {
    borderWidth: 2,
    borderColor: "#6EE7B7",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#303030",
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 8,
  },
  modalSectionText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },
  infoItem: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: "#4B5563",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "#E0E7FF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  chipText: {
    fontSize: 14,
    color: "#303030",
    fontWeight: "500",
  },
  modalGradient: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    height: 40,
    pointerEvents: 'none',
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalActionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalDislikeButton: {
    borderWidth: 2.5,
    borderColor: "#EF4444",
  },
  modalLikeButton: {
    borderWidth: 2.5,
    borderColor: "#10B981",
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#303030",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
function refreshMatches(eventId: number) {
  throw new Error("Function not implemented.");
}

