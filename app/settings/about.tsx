import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Image } from 'react-native';
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

export default function AboutSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, accentColor, glassOpacity } = useSettingsStore();

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: dynamicSurface }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Acerca de</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Animated App Logo Banner */}
        <View style={styles.logoSection}>
          <Animated.View 
            entering={FadeInDown.delay(100).duration(800).springify()}
            style={[styles.logoBorder, { borderColor: accentColor }]}
          >
            <View style={[styles.logoContainer, { backgroundColor: `${accentColor}15` }]}>
              <Ionicons name="musical-notes" size={48} color={accentColor} />
            </View>
          </Animated.View>
          
          <Animated.Text entering={FadeInDown.delay(200).springify()} style={styles.appName}>
            ChakrasPlayer
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(250).springify()} style={styles.appVersion}>
            Versión 3.0.0-Mobile (Build 2026.06.21)
          </Animated.Text>
        </View>

        {/* Detalles e Info */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <View style={[styles.card, { backgroundColor: dynamicSurface }]}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Desarrollador</Text>
              <Text style={styles.infoValue}>Chakras Team</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Licencia</Text>
              <Text style={styles.infoValue}>Apache-2.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plataforma</Text>
              <Text style={styles.infoValue}>Expo (React Native)</Text>
            </View>
          </View>
        </Animated.View>

        {/* Acerca de la App */}
        <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Nuestra Visión</Text>
          <View style={[styles.card, { backgroundColor: dynamicSurface }]}>
            <Text style={styles.bodyText}>
              ChakrasPlayer es un reproductor de música de última generación diseñado para ofrecer una experiencia auditiva envolvente, unificando tu música local y descargas de YouTube con una hermosa interfaz glassmorphism y asistencia inteligente de AI.
            </Text>
          </View>
        </Animated.View>

        {/* Enlaces de Interés */}
        <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Enlaces de Interés</Text>
          <View style={[styles.card, { backgroundColor: dynamicSurface }]}>
            <TouchableOpacity 
              style={styles.linkRow} 
              onPress={() => handleOpenLink('https://github.com/doublesymmetry/react-native-track-player')}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-github" size={20} color={accentColor} />
              <Text style={styles.linkLabel}>Código de Reproducción (TrackPlayer)</Text>
              <Ionicons name="open-outline" size={16} color={TEXT_MUTED} />
            </TouchableOpacity>
            
            <View style={styles.divider} />

            <TouchableOpacity 
              style={styles.linkRow} 
              onPress={() => handleOpenLink('https://expo.dev')}
              activeOpacity={0.7}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={accentColor} />
              <Text style={styles.linkLabel}>Ecosistema de Expo</Text>
              <Ionicons name="open-outline" size={16} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <Text style={styles.copyright}>© 2026 Chakras Team. Todos los derechos reservados.</Text>
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
  logoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logoBorder: {
    padding: 6,
    borderRadius: 32,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  logoContainer: {
    width: 90,
    height: 90,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  appVersion: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  divider: {
    height: 0.5,
    backgroundColor: BORDER,
    marginVertical: 12,
  },
  bodyText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    lineHeight: 20,
    textAlign: 'justify',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  linkLabel: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  copyright: {
    fontSize: 11,
    color: TEXT_MUTED,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
});
