import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, EQ_PRESETS } from '../../stores/playerStore';

const { height } = Dimensions.get('window');

const BANDS_LABELS = ['31Hz', '62Hz', '125Hz', '250Hz', '500Hz', '1kHz', '2kHz', '4kHz', '8kHz', '16kHz'];

interface EqualizerViewProps {
  onClose: () => void;
}

export default function EqualizerView({ onClose }: EqualizerViewProps) {
  const { eqPreset, eqBands, eqEnabled, setEqPreset, setEqBand } = usePlayerStore();
  const [isEnabled, setIsEnabled] = useState(eqEnabled);

  const toggleEQ = () => {
    setIsEnabled(!isEnabled);
    usePlayerStore.setState({ eqEnabled: !isEnabled });
  };

  return (
    <BlurView intensity={90} tint="dark" style={styles.overlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Ecualizador Paramétrico</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#DCDDDE" />
          </TouchableOpacity>
        </View>

        {/* Switch Row */}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Activar Ecualizador</Text>
          <Switch 
            value={isEnabled} 
            onValueChange={toggleEQ}
            trackColor={{ false: '#72767D', true: '#5865F2' }}
            thumbColor={isEnabled ? '#FFFFFF' : '#DCDDDE'}
          />
        </View>

        {/* Presets List */}
        <Text style={styles.sectionTitle}>Presets</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.presetsScroll}
        >
          {Object.keys(EQ_PRESETS).map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.presetBtn,
                eqPreset === preset && styles.presetBtnActive,
                !isEnabled && styles.disabled
              ]}
              disabled={!isEnabled}
              onPress={() => setEqPreset(preset)}
            >
              <Text style={[styles.presetText, eqPreset === preset && styles.presetTextActive]}>
                {preset}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Faders */}
        <Text style={styles.sectionTitle}>Bandas de Frecuencia</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.fadersScroll}
        >
          <View style={[styles.fadersContainer, !isEnabled && styles.disabled]}>
            {eqBands.map((bandValue, index) => (
              <VerticalSlider
                key={index}
                value={bandValue}
                onChange={(val) => setEqBand(index, val)}
                label={BANDS_LABELS[index]}
                disabled={!isEnabled}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </BlurView>
  );
}

interface VerticalSliderProps {
  value: number;
  onChange: (val: number) => void;
  label: string;
  disabled: boolean;
}

function VerticalSlider({ value, onChange, label, disabled }: VerticalSliderProps) {
  const [trackHeight, setTrackHeight] = useState(0);

  const handleTouch = (evt: any) => {
    if (disabled || trackHeight <= 0) return;
    const touchY = evt.nativeEvent.locationY;
    let pct = 1 - (touchY / trackHeight);
    if (pct < 0) pct = 0;
    if (pct > 1) pct = 1;
    const dbValue = Math.round(-12 + pct * 24);
    onChange(dbValue);
  };

  const pct = (value + 12) / 24;

  return (
    <View style={styles.vSliderContainer}>
      <Text style={styles.vSliderValue}>{value > 0 ? `+${value}` : value}</Text>
      <View 
        style={styles.vSliderTrack}
        onLayout={(e) => setTrackHeight(e.nativeEvent.layout.height)}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
      >
        <View style={[styles.vSliderFill, { height: `${pct * 100}%` }]} />
        <View style={[styles.vSliderThumb, { bottom: `${pct * 100}%`, marginBottom: -6 }]} />
      </View>
      <Text style={styles.vSliderLabel}>{label}</Text>
    </View>
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
    paddingBottom: 40,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(79, 84, 92, 0.4)',
    height: height * 0.65,
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: 'rgba(79, 84, 92, 0.3)',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DCDDDE',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#72767D',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  presetsScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 0.5,
    borderColor: 'rgba(79, 84, 92, 0.3)',
  },
  presetBtnActive: {
    backgroundColor: '#5865F2',
    borderColor: '#5865F2',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#72767D',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  fadersScroll: {
    paddingBottom: 20,
  },
  fadersContainer: {
    flexDirection: 'row',
    gap: 16,
    height: 190,
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  disabled: {
    opacity: 0.4,
  },
  vSliderContainer: {
    alignItems: 'center',
    width: 44,
  },
  vSliderValue: {
    fontSize: 10,
    color: '#72767D',
    marginBottom: 6,
    fontWeight: '600',
  },
  vSliderTrack: {
    width: 6,
    height: 130,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  vSliderFill: {
    width: '100%',
    backgroundColor: '#5865F2',
    borderRadius: 3,
  },
  vSliderThumb: {
    position: 'absolute',
    left: -5,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#5865F2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  vSliderLabel: {
    fontSize: 11,
    color: '#DCDDDE',
    marginTop: 8,
    fontWeight: '600',
  },
});
