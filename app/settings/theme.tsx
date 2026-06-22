import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../stores/settingsStore';

const BG = '#121212';
const SURFACE = 'rgba(54, 57, 63, 0.65)';
const TEXT_PRIMARY = '#DCDDDE';
const TEXT_SECONDARY = '#96989D';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

const ACCENT_PRESETS = [
  '#5865F2', // Blurple
  '#57F287', // Emerald
  '#ED4245', // Crimson
  '#FEE75C', // Gold
  '#EB459E', // Pink
  '#FF7B3A', // Orange
  '#1ABC9C', // Teal
  '#3498DB', // Sky Blue
  '#E91E63', // Magenta
  '#9B59B6', // Amethyst
  '#E67E22', // Carrot
  '#2ECC71', // Green
];

export default function ThemeSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    blurIntensity,
    setBlurIntensity,
    glassOpacity,
    setGlassOpacity,
  } = useSettingsStore();

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  const handleIntensityChange = (increment: boolean) => {
    const newVal = increment ? Math.min(100, blurIntensity + 10) : Math.max(0, blurIntensity - 10);
    setBlurIntensity(newVal);
  };

  const handleOpacityChange = (increment: boolean) => {
    const newVal = increment ? Math.min(1.0, glassOpacity + 0.05) : Math.max(0.1, glassOpacity - 0.05);
    setGlassOpacity(parseFloat(newVal.toFixed(2)));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: dynamicSurface }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apariencia y Temas</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Tema */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Tema Base</Text>
          <Text style={styles.sectionDesc}>Elige el estilo de fondo del reproductor</Text>

          <View style={styles.themeGrid}>
            <TouchableOpacity
              style={[
                styles.themeCard,
                { backgroundColor: dynamicSurface },
                theme === 'chakras' && { borderColor: accentColor, borderWidth: 2 },
              ]}
              onPress={() => setTheme('chakras')}
              activeOpacity={0.8}
            >
              <View style={[styles.themePreview, { backgroundColor: '#1E2124' }]}>
                <View style={[styles.themeMockBar, { backgroundColor: accentColor }]} />
                <View style={[styles.themeMockCard, { backgroundColor: 'rgba(54, 57, 63, 0.6)' }]} />
              </View>
              <Text style={styles.themeLabel}>Chakras Oscuro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeCard,
                { backgroundColor: dynamicSurface },
                theme === 'oled' && { borderColor: accentColor, borderWidth: 2 },
              ]}
              onPress={() => setTheme('oled')}
              activeOpacity={0.8}
            >
              <View style={[styles.themePreview, { backgroundColor: '#000000' }]}>
                <View style={[styles.themeMockBar, { backgroundColor: accentColor }]} />
                <View style={[styles.themeMockCard, { backgroundColor: 'rgba(28, 28, 30, 0.8)' }]} />
              </View>
              <Text style={styles.themeLabel}>OLED Negro</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Color de Acento */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Color de Acento</Text>
          <Text style={styles.sectionDesc}>Cambia el color de los botones, barras e íconos activos</Text>

          <View style={[styles.colorGrid, { backgroundColor: dynamicSurface }]}>
            {ACCENT_PRESETS.map((color) => {
              const isSelected = accentColor.toLowerCase() === color.toLowerCase();
              return (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: color },
                    isSelected && styles.colorCircleSelected,
                  ]}
                  onPress={() => setAccentColor(color)}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={color === '#FEE75C' ? '#000' : '#fff'}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Efectos de Vidrio */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Efectos de Vidrio (Glassmorphism)</Text>
          <Text style={styles.sectionDesc}>Ajusta los efectos visuales traslúcidos</Text>

          <View style={[styles.card, { backgroundColor: dynamicSurface }]}>
            {/* Opacidad */}
            <View style={styles.sliderRow}>
              <View style={styles.sliderTextCol}>
                <Text style={styles.sliderLabel}>Transparencia del Vidrio</Text>
                <Text style={styles.sliderValue}>{(glassOpacity * 100).toFixed(0)}%</Text>
              </View>
              <View style={styles.controlButtons}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleOpacityChange(false)}>
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleOpacityChange(true)}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Intensidad Blur */}
            <View style={styles.sliderRow}>
              <View style={styles.sliderTextCol}>
                <Text style={styles.sliderLabel}>Desenfoque del Fondo (Blur)</Text>
                <Text style={styles.sliderValue}>{blurIntensity}%</Text>
              </View>
              <View style={styles.controlButtons}>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleIntensityChange(false)}>
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlBtn} onPress={() => handleIntensityChange(true)}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
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
    paddingBottom: 80,
  },
  section: {
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 16,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 14,
  },
  themeCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 12,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: 'center',
  },
  themePreview: {
    width: '100%',
    height: 90,
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  themeMockBar: {
    width: '40%',
    height: 6,
    borderRadius: 3,
  },
  themeMockCard: {
    width: '100%',
    height: 44,
    borderRadius: 6,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  colorCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sliderTextCol: {
    flex: 1,
  },
  sliderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  sliderValue: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  divider: {
    height: 0.5,
    backgroundColor: BORDER,
    marginVertical: 14,
  },
});
