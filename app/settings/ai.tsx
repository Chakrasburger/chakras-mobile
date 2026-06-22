import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
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

export default function AiSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showKey, setShowKey] = useState(false);
  
  const {
    theme,
    accentColor,
    glassOpacity,
    aiProvider,
    setAiProvider,
    aiApiKey,
    setAiApiKey,
    aiModel,
    setAiModel,
  } = useSettingsStore();

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  const handleProviderChange = (provider: 'gemini' | 'openrouter') => {
    setAiProvider(provider);
    setAiModel(provider === 'gemini' ? 'gemini-1.5-flash' : 'meta-llama/llama-3-8b-instruct:free');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: dynamicSurface }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración AI</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Proveedor */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Proveedor de AI</Text>
          <Text style={styles.sectionDesc}>Elige el motor que potenciará al asistente musical</Text>

          <View style={[styles.providerToggle, { backgroundColor: dynamicSurface }]}>
            <TouchableOpacity
              style={[
                styles.providerBtn,
                aiProvider === 'gemini' && { backgroundColor: accentColor },
              ]}
              onPress={() => handleProviderChange('gemini')}
              activeOpacity={0.7}
            >
              <Text style={[styles.providerText, aiProvider === 'gemini' && styles.providerTextActive]}>Google Gemini</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.providerBtn,
                aiProvider === 'openrouter' && { backgroundColor: accentColor },
              ]}
              onPress={() => handleProviderChange('openrouter')}
              activeOpacity={0.7}
            >
              <Text style={[styles.providerText, aiProvider === 'openrouter' && styles.providerTextActive]}>OpenRouter</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* API Key */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Llave de API (API Key)</Text>
          <Text style={styles.sectionDesc}>Introduce tu clave para habilitar las funciones del Chat AI</Text>

          <View style={[styles.card, { backgroundColor: dynamicSurface }]}>
            <View style={styles.inputRow}>
              <Ionicons name="key-outline" size={20} color={accentColor} />
              <TextInput
                style={styles.input}
                placeholder={`Introduce tu clave de ${aiProvider === 'gemini' ? 'Gemini' : 'OpenRouter'}`}
                placeholderTextColor={TEXT_MUTED}
                value={aiApiKey}
                onChangeText={setAiApiKey}
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.showKeyBtn} onPress={() => setShowKey(!showKey)}>
                <Ionicons name={showKey ? 'eye-off-outline' : 'eye-outline'} size={20} color={TEXT_MUTED} />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              {aiProvider === 'gemini' ? (
                'Consigue una clave gratis en Google AI Studio (aistudio.google.com)'
              ) : (
                'Consigue una clave en OpenRouter (openrouter.ai)'
              )}
            </Text>
          </View>
        </Animated.View>

        {/* Modelo */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Modelo de AI</Text>
          <Text style={styles.sectionDesc}>Introduce el identificador exacto del modelo que deseas utilizar</Text>

          <View style={[styles.card, { backgroundColor: dynamicSurface }]}>
            <View style={styles.inputRow}>
              <Ionicons name="options-outline" size={20} color={accentColor} />
              <TextInput
                style={styles.input}
                placeholder={aiProvider === 'gemini' ? 'Ej. gemini-1.5-flash' : 'Ej. meta-llama/llama-3-8b-instruct:free'}
                placeholderTextColor={TEXT_MUTED}
                value={aiModel}
                onChangeText={setAiModel}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <Text style={styles.helperText}>
              {aiProvider === 'gemini' ? (
                'Modelos comunes: gemini-1.5-flash, gemini-1.5-pro, gemini-2.5-flash'
              ) : (
                'Modelos comunes: meta-llama/llama-3-8b-instruct:free, google/gemma-2-9b-it:free'
              )}
            </Text>
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
  providerToggle: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 6,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  providerBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  providerText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_MUTED,
  },
  providerTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 0.5,
    borderColor: BORDER,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT_PRIMARY,
    height: '100%',
  },
  showKeyBtn: {
    padding: 4,
  },
  helperText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 8,
  },
  modelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(79,84,92,0.2)',
  },
  modelInfo: {
    flex: 1,
    paddingRight: 16,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  modelDesc: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: TEXT_MUTED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
