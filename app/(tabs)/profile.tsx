import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { useAnalyticsStore } from '../../stores/analyticsStore';

const TEXT_PRIMARY = '#DCDDDE';
const TEXT_SECONDARY = '#96989D';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const SETTINGS_ITEMS = [
  { icon: 'color-palette-outline' as const, label: 'Apariencia y Temas', route: '/settings/theme' },
  { icon: 'musical-note-outline' as const, label: 'Audio y Ecualizador', route: '/settings/audio' },
  { icon: 'cloud-download-outline' as const, label: 'Descargas', route: '/settings/downloads' },
  { icon: 'sparkles-outline' as const, label: 'Configuración AI', route: '/settings/ai' },
  { icon: 'folder-outline' as const, label: 'Almacenamiento', route: '/settings/storage' },
  { icon: 'information-circle-outline' as const, label: 'Acerca de', route: '/settings/about' },
];

function StatCard({ item, index, dynamicSurface }: { item: { label: string; value: string | number; icon: any; color: string }; index: number; dynamicSurface: string }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(100 + index * 80).springify()}
      style={[styles.statCard, { backgroundColor: dynamicSurface }]}
    >
      <View style={[styles.statIcon, { backgroundColor: `${item.color}20` }]}>
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <Text style={styles.statValue}>{item.value}</Text>
      <Text style={styles.statLabel}>{item.label}</Text>
    </Animated.View>
  );
}

function WeeklyChart({ accentColor, dynamicSurface }: { accentColor: string; dynamicSurface: string }) {
  const { getWeeklyActivity } = useAnalyticsStore();
  const weeklyData = getWeeklyActivity();
  const maxVal = Math.max(...weeklyData, 1); // Avoid division by zero
  const hasActivity = weeklyData.some(v => v > 0);

  return (
    <Animated.View entering={FadeInDown.delay(400).springify()} style={[styles.chartCard, { backgroundColor: dynamicSurface }]}>
      <View style={styles.chartHeader}>
        <Ionicons name="bar-chart" size={18} color={accentColor} />
        <Text style={styles.chartTitle}>Actividad Semanal</Text>
      </View>
      
      {!hasActivity ? (
        <View style={{ height: 100, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>Escucha música para registrar tu actividad diaria</Text>
        </View>
      ) : (
        <View style={styles.chartBars}>
          {weeklyData.map((val, i) => {
            const height = (val / maxVal) * 100;
            const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
            return (
              <View key={i} style={styles.barColumn}>
                <View style={styles.barContainer}>
                  <LinearGradient
                    colors={isToday ? [accentColor, '#EB459E'] : [`${accentColor}60`, `${accentColor}30`]}
                    style={[styles.bar, { height: `${height}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />
                </View>
                <Text style={[styles.dayLabel, isToday && { color: accentColor }]}>{DAYS[i]}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Animated.View>
  );
}

function TopArtistRow({ item, index, maxPlays }: { item: { name: string; plays: number; color: string }; index: number; maxPlays: number }) {
  const barWidth = (item.plays / maxPlays) * 100;
  return (
    <Animated.View entering={FadeInDown.delay(500 + index * 60).springify()}>
      <View style={styles.artistRow}>
        <Text style={styles.artistRank}>{index + 1}</Text>
        <View style={styles.artistInfo}>
          <Text style={styles.artistName}>{item.name}</Text>
          <View style={styles.artistBarBg}>
            <LinearGradient
              colors={[item.color, `${item.color}60`]}
              style={[styles.artistBar, { width: `${barWidth}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </View>
        <Text style={styles.artistPlays}>{item.plays}</Text>
      </View>
    </Animated.View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { songs, artists } = useLibraryStore();
  const { totalPlays, totalMinutes, playHistory } = useAnalyticsStore();
  const { theme, accentColor, glassOpacity } = useSettingsStore();

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  const stats = [
    { label: 'Reproducciones', value: totalPlays.toLocaleString(), icon: 'play-circle' as const, color: accentColor },
    { label: 'Horas escuchadas', value: (totalMinutes / 60).toFixed(1), icon: 'time' as const, color: '#57F287' },
    { label: 'Artistas', value: artists.length, icon: 'people' as const, color: '#EB459E' },
    { label: 'Favoritas', value: songs.filter(s => s.playCount > 5).length, icon: 'heart' as const, color: '#ED4245' },
  ];

  // Derive top artists dynamically from history
  const topArtists = React.useMemo(() => {
    const counts: Record<string, number> = {};
    playHistory.forEach(item => {
      const song = songs.find(s => s.id === item.trackId);
      if (song) {
        counts[song.artist] = (counts[song.artist] || 0) + 1;
      }
    });
    
    const colors = ['#ED4245', '#EB459E', '#FEE75C', accentColor, '#57F287'];
    return Object.entries(counts)
      .map(([name, plays], idx) => ({ 
        name, 
        plays, 
        color: colors[idx % colors.length] 
      }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 5);
  }, [playHistory, songs, accentColor]);

  const maxPlays = React.useMemo(() => {
    return Math.max(...topArtists.map((a) => a.plays), 1);
  }, [topArtists]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>Tu Perfil</Text>
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: dynamicSurface }]}
          onPress={() => router.push('/settings' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Banner */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <LinearGradient
            colors={[`${accentColor}40`, `${accentColor}10`, dynamicBg]}
            style={styles.profileBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            <LinearGradient
              colors={[accentColor, '#EB459E']}
              style={styles.profileAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="musical-notes" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.profileName}>ChakrasPlayer</Text>
            <Text style={styles.profileSub}>Tu universo musical</Text>
          </LinearGradient>
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <StatCard key={stat.label} item={stat} index={index} dynamicSurface={dynamicSurface} />
          ))}
        </View>

        {/* Weekly Chart */}
        <WeeklyChart accentColor={accentColor} dynamicSurface={dynamicSurface} />

        {/* Top Artists */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={18} color={accentColor} />
            <Text style={styles.sectionTitle}>Top Artistas</Text>
          </View>
          {topArtists.length === 0 ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <Text style={{ color: TEXT_MUTED, fontSize: 13 }}>No hay datos. Tus artistas más escuchados se mostrarán aquí.</Text>
            </View>
          ) : (
            topArtists.map((artist, index) => (
              <TopArtistRow key={artist.name} item={artist} index={index} maxPlays={maxPlays} />
            ))
          )}
        </View>

        {/* Settings Shortcuts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cog" size={18} color={accentColor} />
            <Text style={styles.sectionTitle}>Configuración</Text>
          </View>
          {SETTINGS_ITEMS.map((item, index) => (
            <Animated.View key={item.label} entering={FadeInDown.delay(700 + index * 50).springify()}>
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.6}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.settingIcon, { backgroundColor: `${accentColor}15` }]}>
                  <Ionicons name={item.icon} size={20} color={accentColor} />
                </View>
                <Text style={styles.settingLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={TEXT_MUTED} />
              </TouchableOpacity>
            </Animated.View>
          ))}
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
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileBanner: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  profileSub: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  statCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  statLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  chartCard: {
    margin: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barContainer: {
    width: 24,
    height: 100,
    justifyContent: 'flex-end',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(79,84,92,0.2)',
  },
  bar: {
    width: '100%',
    borderRadius: 6,
    minHeight: 6,
  },
  dayLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 6,
    fontWeight: '600',
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
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  artistRank: {
    fontSize: 14,
    fontWeight: '800',
    color: TEXT_MUTED,
    width: 20,
    textAlign: 'center',
  },
  artistInfo: {
    flex: 1,
  },
  artistName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  artistBarBg: {
    height: 6,
    backgroundColor: 'rgba(79,84,92,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  artistBar: {
    height: '100%',
    borderRadius: 3,
  },
  artistPlays: {
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    fontVariant: ['tabular-nums'],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
});
