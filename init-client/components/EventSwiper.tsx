// components/EventSwiper.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
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
import { useTheme, shared } from '@/context/ThemeContext';
import { type Theme } from '@/constants/theme';

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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<EventProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [matchId, setMatchId] = useState<number | null>(null);

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

    let isMatch = false;
    try {
      if (direction === "right") {
        const result = await matchService.likeProfile(eventId, currentProfile.user_id);
        if (result.matched) {
          isMatch = true;
          setMatchedProfile(currentProfile);
          setMatchId(result.match?.match_id || null);
          setShowMatchModal(true);
        }
      } else {
        await matchService.passProfile(eventId, currentProfile.user_id);
      }
    } catch (error) {
      console.error(`${direction} failed:`, error);
    }

    if (!isMatch) {
      nextProfile();
    }
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
          <MaterialIcons name="favorite-border" size={40} color={theme.colors.foreground} />
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
      prev > 0 ? prev - 1 : uiProfile.images.length - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev =>
      prev < uiProfile.images.length - 1 ? prev + 1 : 0
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
          <MaterialIcons name="close" size={32} color="#ef4444" />
        </Pressable>

        <Pressable
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => forceSwipe("right")}
        >
          <MaterialIcons name="favorite" size={32} color="#10b981" />
        </Pressable>
      </View>

      {/* Match Modal */}
      <Modal
        visible={showMatchModal}
        animationType="fade"
        transparent={true}
        statusBarTranslucent
        onRequestClose={() => {
          setShowMatchModal(false);
          setMatchedProfile(null);
          setMatchId(null);
          nextProfile();
        }}
      >
        <View style={styles.matchOverlay}>
          <View style={styles.matchContent}>
            {matchedProfile && (
              <>
                <View style={styles.matchAvatarContainer}>
                  {matchedProfile.photos?.[0] ? (
                    <Image
                      source={{ uri: matchedProfile.photos[0].file_path }}
                      style={styles.matchAvatar}
                    />
                  ) : (
                    <View style={[styles.matchAvatar, styles.matchAvatarPlaceholder]}>
                      <MaterialIcons name="person" size={48} color="#fff" />
                    </View>
                  )}
                </View>

                <Text style={styles.matchTitle}>It's a Match !</Text>
                <Text style={styles.matchSubtitle}>
                  Vous et {matchedProfile.firstname} vous êtes likés mutuellement
                </Text>

                <Pressable
                  style={styles.matchMessageBtn}
                  onPress={() => {
                    setShowMatchModal(false);
                    setMatchedProfile(null);
                    onMatch?.();
                    router.push(`/(main)/events/${eventId}/(event-tabs)/messagery`);
                  }}
                >
                  <MaterialIcons name="message" size={20} color="#fff" />
                  <Text style={styles.matchMessageBtnText}>Envoyer un message</Text>
                </Pressable>

                <Pressable
                  style={styles.matchContinueBtn}
                  onPress={() => {
                    setShowMatchModal(false);
                    setMatchedProfile(null);
                    setMatchId(null);
                    nextProfile();
                  }}
                >
                  <Text style={styles.matchContinueBtnText}>Continuer à swiper</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showProfileModal}
        animationType="fade"
        transparent={true}
        statusBarTranslucent
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
                <MaterialIcons name="close" size={28} color={theme.colors.foreground} />
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

              {selectedProfile?.images && selectedProfile.images.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Photos</Text>
                  <View style={styles.photoGrid}>
                    {selectedProfile.images.map((img, i) => (
                      <Image
                        key={i}
                        source={{ uri: img }}
                        style={styles.photoGridItem}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                </View>
              )}

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
              colors={[`${theme.colors.card}00`, theme.colors.card]}
              style={styles.modalGradient}
            />

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalActionButton, styles.modalDislikeButton]}
                onPress={() => handleModalSwipe("left")}
              >
                <MaterialIcons name="close" size={32} color="#ef4444" />
              </Pressable>

              <Pressable
                style={[styles.modalActionButton, styles.modalLikeButton]}
                onPress={() => handleModalSwipe("right")}
              >
                <MaterialIcons name="favorite" size={32} color="#10b981" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.card,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: theme.colors.shadow,
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
    gap: 32,
    paddingVertical: 12,
    paddingBottom: 24,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  dislikeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  likeButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.card,
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
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.foreground,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginBottom: 8,
  },
  modalSectionText: {
    fontSize: 15,
    color: theme.colors.mutedForeground,
    lineHeight: 22,
  },
  infoItem: {
    backgroundColor: theme.colors.secondary,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.mutedForeground,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoGridItem: {
    width: (width * 0.8 - 40 - 8) / 2,
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: theme.colors.secondary,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.foreground,
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
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalActionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDislikeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  modalLikeButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.foreground,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.mutedForeground,
    textAlign: "center",
  },
  // Match modal
  matchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 340,
    width: '100%',
  },
  matchAvatarContainer: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  matchAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: '#fff',
  },
  matchAvatarPlaceholder: {
    backgroundColor: theme.colors.mutedForeground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Poppins-Bold',
    marginBottom: 4,
  },
  matchSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 32,
  },
  matchMessageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: shared.blue,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  matchMessageBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },
  matchContinueBtn: {
    paddingVertical: 10,
  },
  matchContinueBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
