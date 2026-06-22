import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../stores/settingsStore';
import { useDownloadStore, DownloadItem } from '../../stores/downloadStore';

const BG = '#121212';
const SURFACE = 'rgba(54, 57, 63, 0.65)';
const TEXT_PRIMARY = '#DCDDDE';
const TEXT_SECONDARY = '#96989D';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

export default function DownloadsSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { theme, accentColor, glassOpacity, downloadQuality, setDownloadQuality, pcIp, setPcIp } = useSettingsStore();
  const { downloads, clearCompleted, removeDownload } = useDownloadStore();

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  const handleQualityChange = (quality: '128' | '192' | '320') => {
    setDownloadQuality(quality);
  };

  const getStatusIcon = (status: DownloadItem['status']) => {
    switch (status) {
      case 'queued': return 'time-outline';
      case 'downloading': return 'cloud-download-outline';
      case 'converting': return 'sync-outline';
      case 'done': return 'checkmark-circle-outline';
      case 'error': return 'alert-circle-outline';
    }
  };

  const getStatusColor = (status: DownloadItem['status']) => {
    switch (status) {
      case 'queued': return TEXT_MUTED;
      case 'downloading': return accentColor;
      case 'converting': return '#FEE75C';
      case 'done': return '#57F287';
      case 'error': return '#ED4245';
    }
  };

  const getStatusText = (item: DownloadItem) => {
    switch (item.status) {
      case 'queued': return 'En cola';
      case 'downloading': return `Descargando (${item.progress}%)`;
      case 'converting': return 'Convirtiendo a MP3...';
      case 'done': return 'Completado';
      case 'error': return item.error || 'Error en descarga';
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: dynamicSurface }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Descargas</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* PC Proxy Server IP */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Servidor Proxy (PC)</Text>
          <Text style={styles.sectionDesc}>Configura la dirección IP del servidor en tu PC</Text>
          
          <View style={[styles.card, { backgroundColor: dynamicSurface }]}>
            <View style={styles.inputRow}>
              <Ionicons name="desktop-outline" size={20} color={accentColor} />
              <TextInput
                style={styles.input}
                placeholder="Ej. 192.168.100.12"
                placeholderTextColor={TEXT_MUTED}
                value={pcIp}
                onChangeText={setPcIp}
                keyboardType="numeric"
              />
            </View>
            <Text style={styles.helperText}>Asegúrate de que server.py esté ejecutándose en el puerto 5888 de esta IP en tu red local.</Text>
          </View>
        </Animated.View>

        {/* Calidad de Descarga */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Calidad de Descarga (Audio)</Text>
          <Text style={styles.sectionDesc}>Elige la tasa de bits (bitrate) para las descargas de YouTube</Text>
          
          <View style={styles.qualitySelector}>
            {(['128', '192', '320'] as const).map((q) => {
              const isSelected = downloadQuality === q;
              return (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.qualityBtn,
                    { backgroundColor: dynamicSurface },
                    isSelected && { backgroundColor: accentColor },
                  ]}
                  onPress={() => handleQualityChange(q)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.qualityText, isSelected && styles.qualityTextActive]}>
                    {q} Kbps
                  </Text>
                  <Text style={[styles.qualitySubText, isSelected && styles.qualitySubTextActive]}>
                    {q === '128' && 'Ahorro (ligero)'}
                    {q === '192' && 'Estándar (bueno)'}
                    {q === '320' && 'Alta Calidad (HQ)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* Cola de Descargas */}
        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
          <View style={styles.downloadsHeader}>
            <View>
              <Text style={styles.sectionTitle}>Cola de Descargas</Text>
              <Text style={styles.sectionDesc}>Estado de las descargas activas y pasadas</Text>
            </View>
            {downloads.some(d => d.status === 'done' || d.status === 'error') && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearCompleted} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={16} color={accentColor} />
                <Text style={[styles.clearBtnText, { color: accentColor }]}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.downloadsList}>
            {downloads.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: dynamicSurface }]}>
                <Ionicons name="cloud-download-outline" size={44} color={TEXT_MUTED} />
                <Text style={styles.emptyText}>No hay descargas en cola. Usa la pestaña Buscar &gt; YouTube para añadir canciones.</Text>
              </View>
            ) : (
              downloads.map((item, index) => {
                const statusColor = getStatusColor(item.status);
                const statusIcon = getStatusIcon(item.status);

                return (
                  <View key={item.id} style={[styles.downloadRow, { backgroundColor: dynamicSurface }]}>
                    <View style={styles.downloadInfo}>
                      <View style={styles.textContainer}>
                        <Text style={styles.downloadTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.downloadArtist} numberOfLines={1}>{item.artist}</Text>
                        <View style={styles.statusRow}>
                          {item.status === 'converting' ? (
                            <ActivityIndicator size="small" color={statusColor} style={styles.statusIndicator} />
                          ) : (
                            <Ionicons name={statusIcon} size={14} color={statusColor} style={styles.statusIndicator} />
                          )}
                          <Text style={[styles.statusText, { color: statusColor }]}>{getStatusText(item)}</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.removeBtn} onPress={() => removeDownload(item.id)}>
                        <Ionicons name="close" size={20} color={TEXT_MUTED} />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Progress Bar */}
                    {item.status === 'downloading' && (
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${item.progress}%`, backgroundColor: accentColor }]} />
                      </View>
                    )}
                  </View>
                );
              })
            )}
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
  helperText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 8,
  },
  qualitySelector: {
    flexDirection: 'row',
    gap: 10,
  },
  qualityBtn: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  qualityText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  qualityTextActive: {
    color: '#fff',
  },
  qualitySubText: {
    fontSize: 9,
    color: TEXT_MUTED,
    marginTop: 4,
  },
  qualitySubTextActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  downloadsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  downloadsList: {
    gap: 12,
  },
  emptyCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 32,
    borderWidth: 0.5,
    borderColor: BORDER,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  downloadRow: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: BORDER,
    position: 'relative',
    overflow: 'hidden',
  },
  downloadInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 12,
  },
  downloadTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  downloadArtist: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  statusIndicator: {
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
