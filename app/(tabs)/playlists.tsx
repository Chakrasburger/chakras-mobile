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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibraryStore, Playlist } from '../../stores/libraryStore';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useSettingsStore } from '../../stores/settingsStore';

const TEXT_PRIMARY = '#DCDDDE';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = (SCREEN_WIDTH - 48 - 12) / 2;

function SmartPlaylistCard({ item, index }: { item: { id: string; title: string; icon: any; color: string; count: number }; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <TouchableOpacity style={styles.smartCard} activeOpacity={0.7}>
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
  );
}

function PlaylistGridCard({ item, index }: { item: Playlist; index: number }) {
  // Generate determinist colors based on playlist name
  const colors = [
    ['#ED4245', '#FF7B3A'],
    ['#5865F2', '#EB459E'],
    ['#57F287', '#3BA55C'],
    ['#9B59B6', '#5865F2'],
    ['#FEE75C', '#FF7B3A'],
  ];
  const colorIdx = item.name.charCodeAt(0) % colors.length;
  const [c1, c2] = colors[colorIdx];

  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 80).springify()}>
      <TouchableOpacity style={styles.gridCard} activeOpacity={0.7}>
        <LinearGradient
          colors={[c1, c2]}
          style={styles.gridCover}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="musical-notes" size={36} color="rgba(255,255,255,0.5)" />
        </LinearGradient>
        <Text style={styles.gridName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.gridCount}>{item.tracks.length} canciones</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PlaylistsScreen() {
  const insets = useSafeAreaInsets();
  const { songs, playlists, addPlaylist } = useLibraryStore();
  const { playHistory } = useAnalyticsStore();
  const { theme, accentColor, glassOpacity } = useSettingsStore();

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  const smartPlaylists = [
    { id: 'recent', title: 'Recién Agregadas', icon: 'time-outline' as const, color: '#57F287', count: songs.length },
    { id: 'top', title: 'Más Reproducidas', icon: 'flame' as const, color: '#ED4245', count: Math.min(songs.length, playHistory.length) },
    { id: 'ai', title: 'Generadas por AI', icon: 'sparkles' as const, color: accentColor, count: 0 },
    { id: 'favorites', title: 'Favoritas', icon: 'heart' as const, color: '#EB459E', count: songs.filter(s => s.playCount > 5).length },
  ];

  const handleCreatePlaylist = () => {
    if (Platform.OS === 'web') {
      const name = prompt('Nombre de la nueva playlist:');
      if (name?.trim()) {
        addPlaylist(name.trim());
      }
    } else {
      Alert.prompt(
        'Nueva Playlist',
        'Introduce el nombre de la playlist:',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Crear', 
            onPress: (name?: string) => {
              if (name?.trim()) addPlaylist(name.trim());
            }
          }
        ],
        'plain-text'
      );
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Playlists</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: accentColor }]} activeOpacity={0.7} onPress={handleCreatePlaylist}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Nueva</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Smart Playlists */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={18} color={accentColor} />
            <Text style={styles.sectionTitle}>Smart Playlists</Text>
          </View>
          {smartPlaylists.map((item, index) => (
            <SmartPlaylistCard key={item.id} item={item} index={index} />
          ))}
        </View>

        {/* My Playlists Grid */}
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
              playlists.map((item, index) => (
                <PlaylistGridCard key={item.id} item={item} index={index} />
              ))
            )}
          </View>
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>
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
});
