import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  FlatList,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryStore, Playlist } from '../../stores/libraryStore';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { usePlayerStore, Track } from '../../stores/playerStore';
import TrackPlayer from 'react-native-track-player';
import { Image } from 'expo-image';

const TEXT_PRIMARY = '#DCDDDE';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

function CoverPlaceholder({ size, title, borderRadius = 8 }: { size: number; title: string; borderRadius?: number }) {
  const colors = ['#5865F2', '#EB459E', '#57F287', '#FEE75C', '#ED4245', '#FF7B3A'];
  const colorIndex = title ? title.charCodeAt(0) % colors.length : 0;
  return (
    <LinearGradient
      colors={[colors[colorIndex], `${colors[colorIndex]}88`] as const}
      style={{ width: size, height: size, borderRadius, justifyContent: 'center', alignItems: 'center' }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name="musical-note" size={size * 0.4} color="rgba(255,255,255,0.7)" />
    </LinearGradient>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = (SCREEN_WIDTH - 48 - 12) / 2;

export default function PlaylistsScreen() {
  const insets = useSafeAreaInsets();
  const { 
    songs, 
    playlists, 
    addPlaylist, 
    removePlaylist, 
    addTrackToPlaylist, 
    removeTrackFromPlaylist,
    setPlaylists
  } = useLibraryStore();
  const { playHistory } = useAnalyticsStore();
  const { theme, accentColor, glassOpacity } = useSettingsStore();
  const { setQueue } = usePlayerStore();

  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [showAddSongs, setShowAddSongs] = useState(false);

  // Cargar playlists guardadas en SQLite al iniciar
  React.useEffect(() => {
    try {
      const { getAllPlaylists } = require('../../services/library');
      const savedPlaylists = getAllPlaylists();
      if (savedPlaylists) {
        setPlaylists(savedPlaylists);
      }
    } catch (error) {
      console.error('Error cargando playlists SQLite inicial:', error);
    }
  }, []);

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  const getActivePlaylist = (): Playlist | null => {
    if (!activePlaylistId) return null;
    const custom = playlists.find(p => p.id === activePlaylistId);
    if (custom) return custom;
    
    // Smart playlist checks
    if (activePlaylistId === 'recent') {
      return {
        id: 'recent',
        name: 'Recién Agregadas',
        tracks: [...songs].sort((a, b) => b.addedAt - a.addedAt),
        createdAt: 0
      };
    }
    if (activePlaylistId === 'top') {
      const sortedByPlayCount = [...songs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
      return {
        id: 'top',
        name: 'Más Reproducidas',
        tracks: sortedByPlayCount,
        createdAt: 0
      };
    }
    if (activePlaylistId === 'favorites') {
      return {
        id: 'favorites',
        name: 'Favoritas',
        tracks: songs.filter(s => s.isFavorite),
        createdAt: 0
      };
    }
    return null;
  };

  const activePlaylist = getActivePlaylist();
  const isSmart = activePlaylistId ? ['recent', 'top', 'favorites'].includes(activePlaylistId) : false;

  const getPlaylistDesign = (p: Playlist | null): { colors: readonly [string, string]; icon: any } => {
    if (!p) return { colors: [accentColor, `${accentColor}55`] as const, icon: 'musical-notes' as const };
    
    if (p.id === 'recent') {
      return { colors: ['#57F287', '#3BA55C'] as const, icon: 'time-outline' as const };
    }
    if (p.id === 'top') {
      return { colors: ['#ED4245', '#FF7B3A'] as const, icon: 'flame' as const };
    }
    if (p.id === 'favorites') {
      return { colors: ['#EB459E', '#5865F2'] as const, icon: 'heart' as const };
    }
    
    // Custom colors
    const colorsList: readonly [string, string][] = [
      ['#ED4245', '#FF7B3A'] as const,
      ['#5865F2', '#EB459E'] as const,
      ['#57F287', '#3BA55C'] as const,
      ['#9B59B6', '#5865F2'] as const,
    ];
    const colorIdx = p.name.charCodeAt(0) % colorsList.length;
    return { colors: colorsList[colorIdx], icon: 'musical-notes' as const };
  };

  const playlistDesign = getPlaylistDesign(activePlaylist);

  const getBannerCountText = () => {
    if (!activePlaylist) return '';
    if (activePlaylistId === 'recent') {
      return `${activePlaylist.tracks.length} canciones · Actualizado automáticamente`;
    }
    if (activePlaylistId === 'top') {
      return `${activePlaylist.tracks.length} canciones · Tus canciones más escuchadas`;
    }
    if (activePlaylistId === 'favorites') {
      return `${activePlaylist.tracks.length} canciones · Guardadas en tus favoritos`;
    }
    return `${activePlaylist.tracks.length} canciones · Creada recientemente`;
  };

  // Smart playlist counts & logic
  const smartPlaylists = [
    { id: 'recent', title: 'Recién Agregadas', icon: 'time-outline' as const, color: '#57F287', count: songs.length },
    { id: 'top', title: 'Más Reproducidas', icon: 'flame' as const, color: '#ED4245', count: Math.min(songs.length, playHistory.length) },
    { id: 'favorites', title: 'Favoritas', icon: 'heart' as const, color: '#EB459E', count: songs.filter(s => s.isFavorite).length },
  ];

  const handleCreatePlaylist = () => {
    const createAction = (name?: string) => {
      if (name?.trim()) {
        addPlaylist(name.trim());
      }
    };

    if (Platform.OS === 'web') {
      const name = prompt('Nombre de la nueva playlist:');
      if (name) createAction(name);
    } else {
      Alert.prompt(
        'Nueva Playlist',
        'Introduce el nombre de la playlist:',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Crear', onPress: createAction }
        ],
        'plain-text'
      );
    }
  };

  const handlePlayPlaylist = async (playlistTracks: Track[]) => {
    if (playlistTracks.length === 0) {
      Alert.alert('Playlist Vacía', 'Agrega algunas canciones primero.');
      return;
    }

    try {
      await TrackPlayer.reset();
      const playerTracks = playlistTracks.map(s => ({
        id: s.id,
        url: s.uri,
        title: s.title,
        artist: s.artist,
        artwork: s.coverUri || undefined,
        duration: s.duration,
      }));

      await TrackPlayer.add(playerTracks);
      await TrackPlayer.play();
      setQueue(playlistTracks, 0);
    } catch (e) {
      console.error('Error al reproducir playlist:', e);
    }
  };

  const handlePlayTrack = async (playlistTracks: Track[], trackIndex: number) => {
    try {
      await TrackPlayer.reset();
      const playerTracks = playlistTracks.map(s => ({
        id: s.id,
        url: s.uri,
        title: s.title,
        artist: s.artist,
        artwork: s.coverUri || undefined,
        duration: s.duration,
      }));

      await TrackPlayer.add(playerTracks);
      await TrackPlayer.skip(trackIndex);
      await TrackPlayer.play();
      setQueue(playlistTracks, trackIndex);
    } catch (e) {
      console.error('Error al reproducir canción de playlist:', e);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {!activePlaylist ? (
        <>
          {/* Main Playlists Overview */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <Text style={styles.headerTitle}>Playlists</Text>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: accentColor }]} activeOpacity={0.7} onPress={handleCreatePlaylist}>
              <Ionicons name="add" size={22} color="#fff" />
              <Text style={styles.addBtnText}>Nueva</Text>
            </TouchableOpacity>
          </Animated.View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Smart Playlists */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb-outline" size={18} color={accentColor} />
                <Text style={styles.sectionTitle}>Smart Playlists</Text>
              </View>
              {smartPlaylists.map((item, index) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(index * 60).springify()}>
                  <TouchableOpacity 
                    style={styles.smartCard} 
                    activeOpacity={0.7}
                    onPress={() => setActivePlaylistId(item.id)}
                  >
                    <View style={[styles.smartIcon, { backgroundColor: `${item.color}20` }]}>
                      <Ionicons name={item.icon} size={22} color={item.color} />
                    </View>
                    <View style={styles.smartInfo}>
                      <Text style={styles.smartTitle}>{item.title}</Text>
                      <Text style={styles.smartCount}>{item.count} canciones</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>

            {/* Custom Playlists */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="folder-outline" size={18} color={accentColor} />
                <Text style={styles.sectionTitle}>Mis Playlists</Text>
              </View>
              <View style={styles.grid}>
                {playlists.length === 0 ? (
                  <View style={{ padding: 40, width: '100%', alignItems: 'center' }}>
                    <Text style={{ color: TEXT_MUTED, textAlign: 'center' }}>No tienes playlists creadas. Toca 'Nueva' para empezar.</Text>
                  </View>
                ) : (
                  playlists.map((item, index) => {
                    const colors = [
                      ['#ED4245', '#FF7B3A'],
                      ['#5865F2', '#EB459E'],
                      ['#57F287', '#3BA55C'],
                      ['#9B59B6', '#5865F2'],
                    ];
                    const colorIdx = item.name.charCodeAt(0) % colors.length;
                    const [c1, c2] = colors[colorIdx];

                    return (
                      <Animated.View key={item.id} entering={FadeInDown.delay(200 + index * 80).springify()}>
                        <TouchableOpacity 
                          style={styles.gridCard} 
                          activeOpacity={0.7}
                          onPress={() => setActivePlaylistId(item.id)}
                        >
                          <LinearGradient colors={[c1, c2]} style={styles.gridCover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <Ionicons name="musical-notes" size={36} color="rgba(255,255,255,0.6)" />
                          </LinearGradient>
                          <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.gridCount}>{item.tracks.length} canciones</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })
                )}
              </View>
            </View>
            <View style={{ height: 140 }} />
          </ScrollView>
        </>
      ) : (
        /* Playlist Detail Overlay */
        <Animated.View entering={FadeIn.duration(300)} style={StyleSheet.absoluteFill}>
          <View style={styles.detailHeader}>
            <TouchableOpacity style={styles.detailBackBtn} onPress={() => setActivePlaylistId(null)}>
              <Ionicons name="arrow-back" size={26} color={TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.detailHeaderTitle} numberOfLines={1}>{activePlaylist.name}</Text>
            {isSmart ? (
              <View style={{ width: 32 }} />
            ) : (
              <TouchableOpacity 
                style={styles.detailDeleteBtn} 
                onPress={() => {
                  Alert.alert(
                    'Eliminar Playlist',
                    `¿Estás seguro de que quieres eliminar la playlist "${activePlaylist.name}"?`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { 
                        text: 'Eliminar', 
                        style: 'destructive', 
                        onPress: () => {
                          removePlaylist(activePlaylist.id);
                          setActivePlaylistId(null);
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={24} color="#ED4245" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
            {/* Playlist Banner */}
            <View style={styles.detailBanner}>
              <LinearGradient colors={playlistDesign.colors} style={styles.detailBannerCover} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name={playlistDesign.icon} size={60} color="#fff" />
              </LinearGradient>
              <Text style={styles.detailBannerTitle}>{activePlaylist.name}</Text>
              <Text style={styles.detailBannerCount}>{getBannerCountText()}</Text>
              
              <View style={styles.detailActions}>
                <TouchableOpacity 
                  style={[styles.playPlaylistBtn, { backgroundColor: accentColor }]} 
                  onPress={() => handlePlayPlaylist(activePlaylist.tracks)}
                >
                  <Ionicons name="play" size={22} color="#fff" />
                  <Text style={styles.playPlaylistBtnText}>Reproducir</Text>
                </TouchableOpacity>

                {!isSmart && (
                  <TouchableOpacity 
                    style={[styles.addSongsBtn, { borderColor: accentColor }]} 
                    onPress={() => setShowAddSongs(true)}
                  >
                    <Ionicons name="add" size={20} color={accentColor} />
                    <Text style={[styles.addSongsBtnText, { color: accentColor }]}>Agregar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Track List */}
            <View style={styles.tracksSection}>
              {activePlaylist.tracks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="musical-notes-outline" size={48} color={TEXT_MUTED} />
                  <Text style={styles.emptyText}>Esta playlist no tiene canciones.</Text>
                  {!isSmart && (
                    <TouchableOpacity style={[styles.emptyActionBtn, { backgroundColor: accentColor }]} onPress={() => setShowAddSongs(true)}>
                      <Text style={styles.emptyActionBtnText}>Añadir Canciones</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                activePlaylist.tracks.map((song, index) => (
                  <View key={song.id} style={styles.songRow}>
                    <TouchableOpacity 
                      style={styles.songRowTouch} 
                      onPress={() => handlePlayTrack(activePlaylist.tracks, index)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        {song.coverUri ? (
                          <Image 
                            source={{ uri: song.coverUri }} 
                            style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12 }} 
                          />
                        ) : (
                          <View style={{ marginRight: 12 }}>
                            <CoverPlaceholder size={44} title={song.title} borderRadius={8} />
                          </View>
                        )}
                        <View style={styles.songInfo}>
                          <Text style={styles.songTitle} numberOfLines={1}>{song.title}</Text>
                          <Text style={styles.songMeta} numberOfLines={1}>{song.artist} · {song.album}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    {activePlaylist.id === 'favorites' ? (
                      <TouchableOpacity 
                        style={styles.removeSongBtn} 
                        onPress={() => {
                          useLibraryStore.getState().updateSong(song.id, { isFavorite: false });
                          try {
                            const { saveTrack } = require('../../services/library');
                            saveTrack({ ...song, isFavorite: false });
                          } catch (err) {
                            console.warn('Error unfavoriting track:', err);
                          }
                        }}
                      >
                        <Ionicons name="heart" size={22} color={accentColor} />
                      </TouchableOpacity>
                    ) : !isSmart ? (
                      <TouchableOpacity 
                        style={styles.removeSongBtn} 
                        onPress={() => removeTrackFromPlaylist(activePlaylist.id, song.id)}
                      >
                        <Ionicons name="close-circle-outline" size={22} color={TEXT_MUTED} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
            </View>
            <View style={{ height: 140 }} />
          </ScrollView>

          {/* Add Songs Selection Modal */}
          <Modal visible={showAddSongs} animationType="slide" transparent>
            <View style={styles.modalBg}>
              <View style={[styles.modalContent, { backgroundColor: dynamicBg }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Añadir Canciones</Text>
                  <TouchableOpacity onPress={() => setShowAddSongs(false)}>
                    <Ionicons name="close" size={26} color={TEXT_PRIMARY} />
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={songs.filter(s => !activePlaylist.tracks.some(t => t.id === s.id))}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.modalList}
                  renderItem={({ item }) => (
                    <View style={styles.modalSongRow}>
                      <View style={styles.modalSongInfo}>
                        <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.songMeta} numberOfLines={1}>{item.artist}</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.modalAddBtn, { backgroundColor: accentColor }]}
                        onPress={() => addTrackToPlaylist(activePlaylist.id, item)}
                      >
                        <Ionicons name="add" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Text style={{ color: TEXT_MUTED }}>Todas tus canciones ya están agregadas.</Text>
                    </View>
                  }
                />
              </View>
            </View>
          </Modal>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
  },
  smartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 14,
  },
  smartIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartInfo: {
    flex: 1,
  },
  smartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  smartCount: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  gridCard: {
    width: GRID_SIZE,
  },
  gridCover: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 8,
  },
  gridCount: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  // Detail Overlay Styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  detailBackBtn: {
    padding: 4,
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  detailDeleteBtn: {
    padding: 4,
  },
  detailScrollContent: {
    paddingBottom: 40,
  },
  detailBanner: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  detailBannerCover: {
    width: 140,
    height: 140,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  detailBannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  detailBannerCount: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 20,
  },
  detailActions: {
    flexDirection: 'row',
    gap: 12,
  },
  playPlaylistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  playPlaylistBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  addSongsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  addSongsBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  tracksSection: {
    marginTop: 16,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  songRowTouch: {
    flex: 1,
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
    marginTop: 4,
  },
  removeSongBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 20,
    fontSize: 14,
  },
  emptyActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyActionBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  // Modal layout
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  modalList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  modalSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalSongInfo: {
    flex: 1,
    paddingRight: 16,
  },
  modalAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
