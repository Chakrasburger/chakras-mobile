import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryStore } from '../../stores/libraryStore';
import { usePlayerStore, Track } from '../../stores/playerStore';
import { scanLocalMusic, pickAndImportAudioFiles } from '../../services/localScanner';
import { getAllTracks } from '../../services/library';
import TrackPlayer from 'react-native-track-player';
import { ActivityIndicator, Alert } from 'react-native';

import { useAnalyticsStore } from '../../stores/analyticsStore';

const ACCENT = '#5865F2';
const BG = '#121212';
const SURFACE = 'rgba(54, 57, 63, 0.65)';
const TEXT_PRIMARY = '#DCDDDE';
const TEXT_SECONDARY = '#96989D';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 16) / 2;

import { useSettingsStore } from '../../stores/settingsStore';

const TABS = ['Canciones', 'Álbumes', 'Artistas', 'Carpetas'];

function CoverPlaceholder({ size, title, borderRadius = 12 }: { size: number; title: string; borderRadius?: number }) {
  const colors = ['#5865F2', '#EB459E', '#57F287', '#FEE75C', '#ED4245', '#FF7B3A'];
  const colorIndex = title ? title.charCodeAt(0) % colors.length : 0;
  return (
    <LinearGradient
      colors={[colors[colorIndex], `${colors[colorIndex]}88`]}
      style={[{ width: size, height: size, borderRadius }, styles.coverPlaceholder]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name="musical-note" size={size * 0.4} color="rgba(255,255,255,0.7)" />
    </LinearGradient>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function RecentCard({ item, index, onPlay }: { item: Track; index: number; onPlay: (track: Track) => void }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <TouchableOpacity
        style={styles.recentCard}
        activeOpacity={0.7}
        onPress={() => onPlay(item)}
      >
        {item.coverUri ? (
          <Image 
            source={{ uri: item.coverUri }} 
            style={{ width: 120, height: 120, borderRadius: 12 }} 
          />
        ) : (
          <CoverPlaceholder size={120} title={item.title} borderRadius={12} />
        )}
        <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.recentArtist} numberOfLines={1}>{item.artist}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SongRow({ item, index, onPlay }: { item: Track; index: number; onPlay: (track: Track) => void }) {
  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 50).springify()}>
      <TouchableOpacity style={styles.songRow} activeOpacity={0.6} onPress={() => onPlay(item)}>
        {item.coverUri ? (
          <Image 
            source={{ uri: item.coverUri }} 
            style={{ width: 48, height: 48, borderRadius: 8 }} 
          />
        ) : (
          <CoverPlaceholder size={48} title={item.title} borderRadius={8} />
        )}
        <View style={styles.songInfo}>
          <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.songMeta} numberOfLines={1}>
            {item.artist} · {item.album}
          </Text>
        </View>
        <Text style={styles.songDuration}>{formatDuration(item.duration)}</Text>
        <TouchableOpacity style={styles.moreButton} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={18} color={TEXT_MUTED} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const router = useRouter();

  const { songs, artists, albums, setSongs } = useLibraryStore();
  const { play, setQueue } = usePlayerStore();
  const { playHistory } = useAnalyticsStore();
  const { theme, accentColor, glassOpacity } = useSettingsStore();
  const [isScanning, setIsScanning] = useState(false);

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  // Cargar canciones guardadas en la base de datos al iniciar
  React.useEffect(() => {
    try {
      const savedTracks = getAllTracks();
      if (savedTracks && savedTracks.length > 0) {
        setSongs(savedTracks);
      }
    } catch (error) {
      console.error('Error cargando biblioteca SQLite inicial:', error);
    }
  }, []);

  // Compute recently played list based on history and library songs
  const recentTracks = useMemo(() => {
    const list: Track[] = [];
    const seen = new Set<string>();
    
    for (let i = playHistory.length - 1; i >= 0; i--) {
      const histItem = playHistory[i];
      if (!seen.has(histItem.trackId)) {
        seen.add(histItem.trackId);
        const trk = songs.find(s => s.id === histItem.trackId);
        if (trk) {
          list.push(trk);
        }
      }
      if (list.length >= 8) break;
    }
    return list;
  }, [playHistory, songs]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const scannedTracks = await scanLocalMusic();
      setSongs(scannedTracks);
    } catch (e) {
      console.warn('Error al escanear música:', e);
      Alert.alert('Error de Escaneo', 'No se pudo completar el escaneo de música local.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportFiles = async () => {
    setIsScanning(true);
    try {
      const importedTracks = await pickAndImportAudioFiles();
      if (importedTracks.length > 0) {
        const allTracks = getAllTracks();
        setSongs(allTracks);
        Alert.alert('Importación Exitosa', `Se han importado ${importedTracks.length} canciones correctamente.`);
      }
    } catch (e) {
      console.warn('Error al importar música:', e);
      Alert.alert('Error de Importación', 'Hubo un error al seleccionar o copiar los archivos.');
    } finally {
      setIsScanning(false);
    }
  };

  const handlePlayTrack = async (track: Track) => {
    try {
      await TrackPlayer.reset();
      
      const playerTracks = songs.map(s => ({
        id: s.id,
        url: s.uri,
        title: s.title,
        artist: s.artist,
        artwork: s.coverUri || undefined,
        duration: s.duration,
      }));

      await TrackPlayer.add(playerTracks);
      
      const index = songs.findIndex(s => s.id === track.id);
      if (index > -1) {
        await TrackPlayer.skip(index);
        await TrackPlayer.play();
        setQueue(songs, index);
      }
    } catch (e) {
      console.error('Error al reproducir:', e);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
        <View>
          <Text style={styles.appTitle}>ChakrasPlayer</Text>
          <Text style={styles.subtitle}>Tu música, tu universo</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: dynamicSurface }]}
            onPress={() => router.push('/search' as any)}
          >
            <Ionicons name="search" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, { backgroundColor: dynamicSurface }]}
            onPress={() => router.push('/settings' as any)}
          >
            <Ionicons name="settings-outline" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Stats Banner */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <LinearGradient
            colors={[`${accentColor}30`, `${accentColor}10`, 'transparent']}
            style={[styles.statsBanner, { borderColor: `${accentColor}40` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{songs.length}</Text>
              <Text style={styles.statLabel}>Canciones</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{artists.length}</Text>
              <Text style={styles.statLabel}>Artistas</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{albums.length}</Text>
              <Text style={styles.statLabel}>Álbumes</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Recently Played Section */}
        {recentTracks.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>▶ Reproducido recientemente</Text>
              <TouchableOpacity>
                <Text style={[styles.seeAll, { color: accentColor }]}>Ver todo</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={recentTracks}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => <RecentCard item={item} index={index} onPlay={handlePlayTrack} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
            />
          </Animated.View>
        )}

        {/* Library Tabs Selector */}
        <Animated.View entering={FadeInDown.delay(300).springify()}>
          <View style={styles.tabRow}>
            {TABS.map((tab, i) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabChip, 
                  { backgroundColor: dynamicSurface },
                  activeTab === i && { backgroundColor: accentColor, borderColor: accentColor }
                ]}
                onPress={() => setActiveTab(i)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabChipText, activeTab === i && styles.tabChipTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* Dynamic Tab Content */}
        <View style={styles.songSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {activeTab === 0 && `♫ Todas las canciones (${songs.length})`}
              {activeTab === 1 && `💿 Álbumes (${albums.length})`}
              {activeTab === 2 && `👤 Artistas (${artists.length})`}
              {activeTab === 3 && '📁 Carpetas'}
            </Text>
            {activeTab === 0 && (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity 
                  style={[styles.circularBtn, { backgroundColor: dynamicSurface }]} 
                  activeOpacity={0.7} 
                  onPress={handleImportFiles}
                  disabled={isScanning}
                >
                  <Ionicons name="document-attach-outline" size={18} color={TEXT_PRIMARY} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.circularBtn, { backgroundColor: dynamicSurface }]} 
                  activeOpacity={0.7} 
                  onPress={handleScan} 
                  disabled={isScanning}
                >
                  {isScanning ? (
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : (
                    <Ionicons name="sync-outline" size={18} color={TEXT_PRIMARY} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          {activeTab === 0 && (
            songs.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: TEXT_MUTED, textAlign: 'center' }}>No hay canciones locales. Toca sincronizar para escanear tu dispositivo.</Text>
              </View>
            ) : (
              songs.map((song, index) => (
                <SongRow key={song.id} item={song} index={index} onPlay={handlePlayTrack} />
              ))
            )
          )}

          {activeTab === 1 && (
            albums.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: TEXT_MUTED, textAlign: 'center' }}>No se han encontrado álbumes.</Text>
              </View>
            ) : (
              albums.map((album, index) => (
                <View key={album.id} style={styles.songRow}>
                  <CoverPlaceholder size={48} title={album.name} borderRadius={8} />
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle} numberOfLines={1}>{album.name}</Text>
                    <Text style={styles.songMeta} numberOfLines={1}>{album.artist} · {album.trackCount} canciones</Text>
                  </View>
                </View>
              ))
            )
          )}

          {activeTab === 2 && (
            artists.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: TEXT_MUTED, textAlign: 'center' }}>No se han encontrado artistas.</Text>
              </View>
            ) : (
              artists.map((artist, index) => (
                <View key={artist.id} style={styles.songRow}>
                  <CoverPlaceholder size={48} title={artist.name} borderRadius={8} />
                  <View style={styles.songInfo}>
                    <Text style={styles.songTitle} numberOfLines={1}>{artist.name}</Text>
                    <Text style={styles.songMeta} numberOfLines={1}>{artist.albumCount} álbumes · {artist.trackCount} canciones</Text>
                  </View>
                </View>
              ))
            )
          )}

          {activeTab === 3 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: TEXT_MUTED, textAlign: 'center' }}>Carpetas de almacenamiento vacías.</Text>
            </View>
          )}
        </View>

        {/* Bottom padding for mini player + tab bar */}
        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  statsBanner: {
    flexDirection: 'row',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 0.5,
    borderColor: `${ACCENT}40`,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  statLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: BORDER,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: '600',
  },
  recentList: {
    paddingHorizontal: 20,
    gap: 14,
  },
  recentCard: {
    width: 120,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 8,
  },
  recentArtist: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: SURFACE,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  tabChipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  songSection: {
    marginTop: 8,
  },
  shuffleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  shuffleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  circularBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  songMeta: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 3,
  },
  songDuration: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontVariant: ['tabular-nums'],
  },
  moreButton: {
    padding: 4,
  },
});
