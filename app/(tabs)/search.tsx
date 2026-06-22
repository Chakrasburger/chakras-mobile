import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pcProxy } from '../../services/pcProxy';
import { useLibraryStore } from '../../stores/libraryStore';
import { Track } from '../../stores/playerStore';
import { useSettingsStore } from '../../stores/settingsStore';

const TEXT_PRIMARY = '#DCDDDE';
const TEXT_SECONDARY = '#96989D';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

function VideoThumbnailPlaceholder({ title, accentColor }: { title: string; accentColor: string }) {
  const colors = [accentColor, '#EB459E', '#57F287', '#ED4245', '#FF7B3A'];
  const idx = title.charCodeAt(0) % colors.length;
  return (
    <LinearGradient
      colors={[colors[idx], `${colors[idx]}66`]}
      style={styles.thumbnailPlaceholder}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.6)" />
    </LinearGradient>
  );
}

function YouTubeResultCard({ item, index, onDownload, accentColor, dynamicSurface }: { item: any; index: number; onDownload: (item: any) => void; accentColor: string; dynamicSurface: string }) {
  const [downloading, setDownloading] = useState(false);

  const handlePress = async () => {
    setDownloading(true);
    await onDownload(item);
    setDownloading(false);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <TouchableOpacity style={[styles.resultCard, { backgroundColor: dynamicSurface }]} activeOpacity={0.7}>
        <VideoThumbnailPlaceholder title={item.title} accentColor={accentColor} />
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.resultMeta}>
            {item.author} · {formatDuration(item.lengthSeconds)} · {formatViews(item.viewCount)} views
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.downloadBtn, 
            { backgroundColor: `${accentColor}15` }, 
            downloading && { backgroundColor: `${accentColor}25` }
          ]}
          activeOpacity={0.7}
          onPress={handlePress}
          disabled={downloading}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={accentColor} />
          ) : (
            <Ionicons name="download-outline" size={22} color={accentColor} />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'library' | 'youtube'>('library');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const { songs, addSong } = useLibraryStore();
  const { theme, accentColor, glassOpacity } = useSettingsStore();

  const [localResults, setLocalResults] = useState<Track[]>([]);
  const [ytResults, setYtResults] = useState<any[]>([]);

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    
    if (activeTab === 'library') {
      const q = query.toLowerCase();
      setLocalResults(songs.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.artist.toLowerCase().includes(q)
      ));
      setIsSearching(false);
    } else {
      try {
        const results = await pcProxy.searchYouTube(query);
        setYtResults(results);
      } catch (e) {
        console.warn('Error fetching from PC proxy:', e);
        setYtResults([]);
        alert('No se pudo conectar al PC. Asegúrate de que server.py esté corriendo en la misma red local.');
      } finally {
        setIsSearching(false);
      }
    }
  }, [query, activeTab, songs]);

  const handleDownload = async (item: any) => {
    try {
      const localUri = await pcProxy.downloadAudio(item.videoId, item.title, (progress) => {
        console.log(`Downloading ${item.title}: ${progress}%`);
      });

      if (localUri) {
        let coverUri = item.thumbnail || null;
        if (coverUri && coverUri.startsWith('http')) {
          try {
            const { downloadAndCacheCover } = require('../../services/localScanner');
            const trackId = `yt_${item.videoId}`;
            const cachedCover = await downloadAndCacheCover(trackId, coverUri);
            if (cachedCover) coverUri = cachedCover;
          } catch (coverErr) {
            console.warn('Error descargando miniatura de YT:', coverErr);
          }
        }

        const track: Track = {
          id: `yt_${item.videoId}`,
          title: item.title,
          artist: item.author || 'YouTube',
          album: 'YouTube Downloads',
          duration: item.lengthSeconds || 0,
          uri: localUri,
          coverUri: coverUri,
          playCount: 0,
          addedAt: Date.now(),
        };

        const { saveTrack } = require('../../services/library');
        saveTrack(track);
        addSong(track);

        alert(`¡${item.title} descargada con éxito a tu biblioteca!`);
      }
    } catch (e) {
      console.error(e);
      alert('Error al descargar la canción. Asegúrate de que el PC esté conectado.');
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Buscar</Text>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: dynamicSurface }]}>
          <Ionicons name="search" size={20} color={TEXT_MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar canciones, artistas..."
            placeholderTextColor={TEXT_MUTED}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            selectionColor={accentColor}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setHasSearched(false); }}>
              <Ionicons name="close-circle" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Tabs: Library / YouTube */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab, 
            { backgroundColor: dynamicSurface },
            activeTab === 'library' && { backgroundColor: accentColor, borderColor: accentColor }
          ]}
          onPress={() => setActiveTab('library')}
          activeOpacity={0.7}
        >
          <Ionicons name="library" size={18} color={activeTab === 'library' ? '#fff' : TEXT_MUTED} />
          <Text style={[styles.tabText, activeTab === 'library' && styles.tabTextActive]}>
            Biblioteca
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab, 
            { backgroundColor: dynamicSurface },
            activeTab === 'youtube' && { backgroundColor: accentColor, borderColor: accentColor }
          ]}
          onPress={() => setActiveTab('youtube')}
          activeOpacity={0.7}
        >
          <Ionicons name="logo-youtube" size={18} color={activeTab === 'youtube' ? '#fff' : TEXT_MUTED} />
          <Text style={[styles.tabText, activeTab === 'youtube' && styles.tabTextActive]}>
            YouTube
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Results */}
      {isSearching ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.searchingText}>Buscando...</Text>
        </View>
      ) : !hasSearched ? (
        <Animated.View entering={FadeIn.duration(600)} style={styles.centered}>
          <LinearGradient
            colors={[`${accentColor}30`, `${accentColor}10`]}
            style={styles.emptyIcon}
          >
            <Ionicons name="search" size={48} color={accentColor} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>
            {activeTab === 'youtube' ? 'Busca en YouTube' : 'Busca en tu biblioteca'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'youtube'
              ? 'Encuentra y descarga canciones de YouTube'
              : 'Busca por título, artista o álbum'}
          </Text>
        </Animated.View>
      ) : activeTab === 'youtube' ? (
        <FlatList
          data={ytResults}
          keyExtractor={(item) => item.videoId || item.id}
          renderItem={({ item, index }) => (
            <YouTubeResultCard 
              item={item} 
              index={index} 
              onDownload={handleDownload} 
              accentColor={accentColor}
              dynamicSurface={dynamicSurface}
            />
          )}
          contentContainerStyle={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={localResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View style={[styles.resultCard, { backgroundColor: dynamicSurface, padding: 16 }]}>
              <View style={styles.resultInfo}>
                <Text style={{ color: TEXT_PRIMARY, fontSize: 15, fontWeight: '600' }}>{item.title}</Text>
                <Text style={{ color: TEXT_MUTED, fontSize: 12, marginTop: 4 }}>{item.artist}</Text>
              </View>
              <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>{formatDuration(item.duration)}</Text>
            </View>
          )}
          contentContainerStyle={styles.resultsList}
        />
      )}

      <View style={{ height: 140 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 0.5,
    borderColor: BORDER,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TEXT_PRIMARY,
    height: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  searchingText: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginTop: 12,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  resultsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
    gap: 12,
  },
  thumbnailPlaceholder: {
    width: 80,
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    lineHeight: 18,
  },
  resultMeta: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  downloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
