import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePlayerStore, EQ_PRESETS } from '../../stores/playerStore';
import { useSettingsStore } from '../../stores/settingsStore';

const BG = '#121212';
const SURFACE = 'rgba(54, 57, 63, 0.65)';
const TEXT_PRIMARY = '#DCDDDE';
const TEXT_SECONDARY = '#96989D';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

const EQ_FREQS = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

export default function AudioSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, accentColor, glassOpacity } = useSettingsStore();
  
  const {
    eqEnabled,
    eqPreset,
    eqBands,
    setEqPreset,
    setEqBand,
    crossfadeDuration,
    setCrossfade,
  } = usePlayerStore();

  const {
    crossfadeEnabled,
    toggleCrossfade,
    normalizationEnabled,
    toggleNormalization,
  } = useSettingsStore();

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  const handleToggleEq = () => {
    usePlayerStore.setState({ eqEnabled: !eqEnabled });
  };

  const handleAdjustBand = (index: number, increment: boolean) => {
    const currentVal = eqBands[index];
    const newVal = increment ? Math.min(12, currentVal + 1) : Math.max(-12, currentVal - 1);
    setEqBand(index, newVal);
  };

  const handleAdjustCrossfade = (increment: boolean) => {
    const newVal = increment ? Math.min(15, crossfadeDuration + 1) : Math.max(0, crossfadeDuration - 1);
    setCrossfade(newVal);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: dynamicSurface }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audio y Ecualizador</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Ecualizador Toggle */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <View style={[styles.switchCard, { backgroundColor: dynamicSurface }]}>
            <View>
              <Text style={styles.cardTitle}>Ecualizador de Audio</Text>
              <Text style={styles.cardDesc}>Modifica las frecuencias del reproductor</Text>
            </View>
            <Switch
              value={eqEnabled}
              onValueChange={handleToggleEq}
              trackColor={{ false: dynamicSurface, true: accentColor }}
              thumbColor="#fff"
            />
          </View>
        </Animated.View>

        {/* Panel de Ecualización */}
        {eqEnabled && (
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
            <Text style={styles.sectionTitle}>Ajuste de Bandas</Text>
            <Text style={styles.sectionDesc}>Personaliza el nivel de cada frecuencia (dB)</Text>

            {/* Mixer Board */}
            <View style={[styles.eqBoard, { backgroundColor: dynamicSurface }]}>
              <View style={styles.eqSlidersContainer}>
                {eqBands.map((bandVal, idx) => (
                  <View key={idx} style={styles.eqColumn}>
                    <TouchableOpacity style={styles.eqAdjustBtn} onPress={() => handleAdjustBand(idx, true)}>
                      <Ionicons name="chevron-up" size={14} color="#fff" />
                    </TouchableOpacity>
                    
                    <View style={styles.sliderTrack}>
                      {/* Fill representing the db level */}
                      <View 
                        style={[
                          styles.sliderFill, 
                          { 
                            backgroundColor: accentColor,
                            height: `${((bandVal + 12) / 24) * 100}%` 
                          }
                        ]} 
                      />
                      {/* Slider Thumb */}
                      <View 
                        style={[
                          styles.sliderThumb, 
                          { 
                            borderColor: accentColor,
                            bottom: `${((bandVal + 12) / 24) * 100 - 4}%` 
                          }
                        ]} 
                      />
                    </View>
                    
                    <TouchableOpacity style={styles.eqAdjustBtn} onPress={() => handleAdjustBand(idx, false)}>
                      <Ionicons name="chevron-down" size={14} color="#fff" />
                    </TouchableOpacity>
                    
                    <Text style={styles.eqValue}>{bandVal > 0 ? `+${bandVal}` : bandVal}dB</Text>
                    <Text style={styles.freqLabel}>{EQ_FREQS[idx]}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Presets List */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Preajustes (Presets)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsContainer}>
              {Object.keys(EQ_PRESETS).map((presetName) => {
                const isSelected = eqPreset === presetName;
                return (
                  <TouchableOpacity
                    key={presetName}
                    style={[
                      styles.presetChip,
                      { backgroundColor: dynamicSurface },
                      isSelected && { backgroundColor: accentColor },
                    ]}
                    onPress={() => setEqPreset(presetName)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                      {presetName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {/* Efectos de Transición */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Efectos y Transiciones</Text>
          <Text style={styles.sectionDesc}>Configura las transiciones automáticas de audio</Text>

          <View style={[styles.card, { backgroundColor: dynamicSurface }]}>
            {/* Crossfade Toggle */}
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchTitle}>Crossfade Automático</Text>
                <Text style={styles.switchDesc}>Mezcla las canciones al terminar</Text>
              </View>
              <Switch
                value={crossfadeEnabled}
                onValueChange={toggleCrossfade}
                trackColor={{ false: 'rgba(0,0,0,0.2)', true: accentColor }}
                thumbColor="#fff"
              />
            </View>

            {crossfadeEnabled && (
              <>
                <View style={styles.divider} />
                {/* Crossfade Sliders */}
                <View style={styles.sliderRow}>
                  <View style={styles.sliderTextCol}>
                    <Text style={styles.sliderLabel}>Duración del Crossfade</Text>
                    <Text style={styles.sliderValue}>{crossfadeDuration} segundos</Text>
                  </View>
                  <View style={styles.controlButtons}>
                    <TouchableOpacity style={styles.controlBtn} onPress={() => handleAdjustCrossfade(false)}>
                      <Ionicons name="remove" size={20} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlBtn} onPress={() => handleAdjustCrossfade(true)}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            <View style={styles.divider} />

            {/* Normalización */}
            <View style={styles.switchRow}>
              <View style={styles.switchTextCol}>
                <Text style={styles.switchTitle}>Normalización de Volumen</Text>
                <Text style={styles.switchDesc}>Mantiene el mismo nivel en todas las canciones</Text>
              </View>
              <Switch
                value={normalizationEnabled}
                onValueChange={toggleNormalization}
                trackColor={{ false: 'rgba(0,0,0,0.2)', true: accentColor }}
                thumbColor="#fff"
              />
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
    marginBottom: 24,
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
  switchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  cardDesc: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  eqBoard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  eqSlidersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 240,
  },
  eqColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eqAdjustBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderTrack: {
    width: 6,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  sliderFill: {
    width: '100%',
    borderRadius: 3,
  },
  sliderThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    borderWidth: 3,
    position: 'absolute',
    left: -4,
  },
  eqValue: {
    fontSize: 10,
    fontWeight: '700',
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
  freqLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  presetsContainer: {
    paddingVertical: 8,
    gap: 10,
  },
  presetChip: {
    backgroundColor: SURFACE,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_SECONDARY,
  },
  presetChipTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  switchDesc: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 16,
  },
  divider: {
    height: 0.5,
    backgroundColor: BORDER,
    marginVertical: 14,
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
});
