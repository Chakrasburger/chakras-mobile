import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { SlideInDown } from 'react-native-reanimated';
import TrackPlayer, { useProgress, State, usePlaybackState } from 'react-native-track-player';
import { usePlayerStore } from '../../stores/playerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLibraryStore } from '../../stores/libraryStore';

const TEXT_PRIMARY = '#DCDDDE';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

export default function MiniPlayer() {
  const router = useRouter();
  const { currentTrack } = usePlayerStore();
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress();
  const { theme, accentColor, glassOpacity } = useSettingsStore();
  const { updateSong } = useLibraryStore();

  React.useEffect(() => {
    if (duration > 0 && currentTrack && (!currentTrack.duration || currentTrack.duration === 0)) {
      const roundedDuration = Math.round(duration);
      if (roundedDuration > 0) {
        // 1. Actualizar el playerStore
        usePlayerStore.setState(state => {
          if (state.currentTrack && state.currentTrack.id === currentTrack.id) {
            return { currentTrack: { ...state.currentTrack, duration: roundedDuration } };
          }
          return {};
        });
        
        // 2. Actualizar el libraryStore
        updateSong(currentTrack.id, { duration: roundedDuration });
        
        // 3. Persistir en SQLite
        try {
          const { saveTrack } = require('../../services/library');
          saveTrack({ ...currentTrack, duration: roundedDuration });
        } catch (err) {
          console.warn('Error al guardar duración en base de datos:', err);
        }
      }
    }
  }, [duration, currentTrack?.id]);

  const isPlaying = playbackState.state === State.Playing;
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  const handlePlayPause = async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  if (!currentTrack) return null;

  const dynamicBg = theme === 'oled' 
    ? 'rgba(0, 0, 0, 0.96)' 
    : 'rgba(28, 30, 34, 0.94)';

  const dynamicBorder = theme === 'oled' ? 'rgba(255,255,255,0.06)' : BORDER;

  return (
    <Animated.View entering={SlideInDown.springify()} style={[styles.container, { backgroundColor: dynamicBg, borderColor: dynamicBorder }]}>
      <TouchableOpacity 
        style={styles.touchable} 
        activeOpacity={0.9}
        onPress={() => router.push(`/player/${currentTrack.id}` as any)}
      >
        <BlurView intensity={90} tint="dark" style={styles.glass}>
          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[accentColor, '#EB459E']}
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>

          <View style={styles.content}>
            {/* Cover Image or Placeholder */}
            {currentTrack.coverUri ? (
              <Image source={{ uri: currentTrack.coverUri }} style={styles.cover} />
            ) : (
              <LinearGradient
                colors={['#ED4245', '#FF7B3A']}
                style={styles.cover}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="musical-note" size={18} color="#fff" />
              </LinearGradient>
            )}

            {/* Info */}
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity style={styles.btn} hitSlop={10}>
                <Ionicons name="heart-outline" size={24} color={TEXT_PRIMARY} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.playBtn} hitSlop={10} onPress={handlePlayPause}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 65, // Above tab bar
    left: 8,
    right: 8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  touchable: {
    width: '100%',
  },
  glass: {
    padding: 8,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  progressFill: {
    height: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  artist: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingRight: 8,
  },
  btn: {
    padding: 4,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
