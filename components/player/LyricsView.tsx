import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import TrackPlayer from 'react-native-track-player';
import * as FileSystem from 'expo-file-system/legacy';
import { Track } from '../../stores/playerStore';
import { fetchSyncedLyrics, parseLRC, LRCLine } from '../../services/lyrics';

const { height } = Dimensions.get('window');

interface LyricsViewProps {
  track: Track;
  position: number;
  onClose: () => void;
}

export default function LyricsView({ track, position, onClose }: LyricsViewProps) {
  const [lyrics, setLyrics] = useState<LRCLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const listRef = useRef<FlatList>(null);
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<any | null>(null);

  useEffect(() => {
    loadLyrics();
  }, [track.id]);

  useEffect(() => {
    if (lyrics.length === 0) return;
    
    // Find active lyric index
    let index = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= position) {
        index = i;
      } else {
        break;
      }
    }

    if (index !== activeIndex && index !== -1) {
      setActiveIndex(index);
      
      // Auto scroll if user is not manually scrolling
      if (!isUserScrollingRef.current) {
        listRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }
  }, [position, lyrics, activeIndex]);

  const loadLyrics = async () => {
    setLoading(true);
    setLyrics([]);
    setActiveIndex(-1);

    const lyricsDir = `${FileSystem.documentDirectory}Lyrics/`;
    const lyricsFile = `${lyricsDir}${track.id}.lrc`;

    try {
      // 1. Check local cache
      const fileInfo = await FileSystem.getInfoAsync(lyricsFile);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(lyricsFile);
        const parsed = parseLRC(content);
        if (parsed.length > 0) {
          setLyrics(parsed);
          setLoading(false);
          return;
        }
      }

      // 2. Fetch from LRCLIB
      const fetched = await fetchSyncedLyrics(track.title, track.artist, track.album, track.duration);
      if (fetched && fetched.length > 0) {
        setLyrics(fetched);
        
        // Save to cache
        const dirInfo = await FileSystem.getInfoAsync(lyricsDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(lyricsDir, { intermediates: true });
        }
        const lrcText = fetched.map(l => {
          const m = Math.floor(l.time / 60).toString().padStart(2, '0');
          const s = (l.time % 60).toFixed(2).padStart(5, '0');
          return `[${m}:${s}]${l.text}`;
        }).join('\n');
        await FileSystem.writeAsStringAsync(lyricsFile, lrcText);
      }
    } catch (e) {
      console.warn('Error al cargar letras:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLinePress = async (time: number) => {
    await TrackPlayer.seekTo(time);
    // Haptic feedback
    try {
      const Haptics = require('expo-haptics');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const handleScrollBegin = () => {
    isUserScrollingRef.current = true;
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
  };

  const handleScrollEnd = () => {
    // Resume auto scroll after 3 seconds of inactivity
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      if (activeIndex !== -1) {
        listRef.current?.scrollToIndex({
          index: activeIndex,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }, 3000);
  };

  return (
    <BlurView intensity={90} tint="dark" style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleCol}>
            <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{track.artist}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#DCDDDE" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#5865F2" />
            <Text style={styles.loadingText}>Buscando letras sincronizadas...</Text>
          </View>
        ) : lyrics.length > 0 ? (
          <FlatList
            ref={listRef}
            data={lyrics}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item, index }) => {
              const isActive = index === activeIndex;
              return (
                <TouchableOpacity
                  onPress={() => handleLinePress(item.time)}
                  activeOpacity={0.7}
                  style={styles.lineTouch}
                >
                  <Text style={[
                    styles.lineText,
                    isActive && styles.lineTextActive
                  ]}>
                    {item.text || '• • •'}
                  </Text>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContent}
            onScrollBeginDrag={handleScrollBegin}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollToIndexFailed={() => {}}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.centerContainer}>
            <Ionicons name="text-outline" size={48} color="#72767D" />
            <Text style={styles.noLyricsText}>No se encontraron letras para esta canción.</Text>
          </View>
        )}
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
    height: height * 0.75,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleCol: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DCDDDE',
    marginBottom: 2,
  },
  artist: {
    fontSize: 13,
    color: '#72767D',
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#72767D',
    fontWeight: '600',
    marginTop: 8,
  },
  noLyricsText: {
    fontSize: 14,
    color: '#72767D',
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    paddingVertical: height * 0.25, // Padding space to let the active line stay in center
  },
  lineTouch: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  lineText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#72767D',
    textAlign: 'center',
    lineHeight: 28,
  },
  lineTextActive: {
    color: '#FFFFFF',
    fontSize: 24,
  },
});
