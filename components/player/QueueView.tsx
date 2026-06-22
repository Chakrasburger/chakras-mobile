import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import TrackPlayer from 'react-native-track-player';
import { usePlayerStore } from '../../stores/playerStore';

const { height } = Dimensions.get('window');

interface QueueViewProps {
  onClose: () => void;
}

export default function QueueView({ onClose }: QueueViewProps) {
  const { queue, queueIndex } = usePlayerStore();

  const handleTrackPress = async (index: number) => {
    try {
      await TrackPlayer.skip(index);
      await TrackPlayer.play();
      // Update state manually if track player event hasn't fired yet
      usePlayerStore.setState({ queueIndex: index, currentTrack: queue[index], isPlaying: true });
      onClose();
    } catch (e) {
      console.warn('Error al cambiar de canción en cola:', e);
    }
  };

  return (
    <BlurView intensity={90} tint="dark" style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cola de Reproducción</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#DCDDDE" />
          </TouchableOpacity>
        </View>

        {/* List */}
        <FlatList
          data={queue}
          keyExtractor={(item, index) => `${item.id}_${index}`}
          renderItem={({ item, index }) => {
            const isActive = index === queueIndex;
            return (
              <TouchableOpacity
                onPress={() => handleTrackPress(index)}
                style={[styles.trackRow, isActive && styles.trackRowActive]}
                activeOpacity={0.7}
              >
                {item.coverUri ? (
                  <Image source={{ uri: item.coverUri }} style={styles.cover} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Ionicons name="musical-note" size={18} color="#72767D" />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={[styles.trackTitle, isActive && styles.trackTitleActive]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {item.artist}
                  </Text>
                </View>
                {isActive && (
                  <Ionicons name="volume-high" size={20} color="#5865F2" />
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  container: {
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(79, 84, 92, 0.4)',
    height: height * 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DCDDDE',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 6,
  },
  trackRowActive: {
    backgroundColor: 'rgba(88, 101, 242, 0.1)',
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(79, 84, 92, 0.3)',
  },
  info: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DCDDDE',
    marginBottom: 2,
  },
  trackTitleActive: {
    color: '#5865F2',
  },
  trackArtist: {
    fontSize: 12,
    color: '#72767D',
    fontWeight: '600',
  },
});
