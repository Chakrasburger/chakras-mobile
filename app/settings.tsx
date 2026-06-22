import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../stores/settingsStore';

const BG = '#121212';
const SURFACE = 'rgba(54, 57, 63, 0.65)';
const TEXT_PRIMARY = '#DCDDDE';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

const SETTINGS_CATEGORIES = [
  {
    id: 'theme',
    icon: 'color-palette-outline' as const,
    label: 'Apariencia y Temas',
    desc: 'Tema base (Oscuro, OLED), colores de acento y efectos translúcidos.',
    route: '/settings/theme' as const,
  },
  {
    id: 'audio',
    icon: 'musical-note-outline' as const,
    label: 'Audio y Ecualizador',
    desc: 'Ecualizador de 10 bandas, presets, crossfade y normalización.',
    route: '/settings/audio' as const,
  },
  {
    id: 'downloads',
    icon: 'cloud-download-outline' as const,
    label: 'Descargas',
    desc: 'Calidad de audio e IP del servidor proxy para descargas de YouTube.',
    route: '/settings/downloads' as const,
  },
  {
    id: 'ai',
    icon: 'sparkles-outline' as const,
    label: 'Configuración AI',
    desc: 'Motor inteligente (Gemini, OpenRouter), API keys y selección de modelos.',
    route: '/settings/ai' as const,
  },
  {
    id: 'storage',
    icon: 'folder-outline' as const,
    label: 'Almacenamiento',
    desc: 'Escanear música, tamaño de base de datos y limpieza de caché.',
    route: '/settings/storage' as const,
  },
  {
    id: 'about',
    icon: 'information-circle-outline' as const,
    label: 'Acerca de',
    desc: 'Detalles de la versión, licencias y créditos del equipo.',
    route: '/settings/about' as const,
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, accentColor, glassOpacity } = useSettingsStore();

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: dynamicSurface }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.menuContainer}>
          {SETTINGS_CATEGORIES.map((item, index) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(index * 60).springify()}>
              <TouchableOpacity
                style={[styles.settingCard, { backgroundColor: dynamicSurface }]}
                activeOpacity={0.7}
                onPress={() => router.push(item.route)}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${accentColor}15` }]}>
                  <Ionicons name={item.icon} size={22} color={accentColor} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <Text style={styles.settingDesc}>{item.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TEXT_MUTED} />
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  menuContainer: {
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 12,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
    gap: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  settingDesc: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 4,
    lineHeight: 15,
  },
});
