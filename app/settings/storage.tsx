import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLibraryStore } from '../../stores/libraryStore';
import { scanLocalMusic, pickAndImportAudioFiles, fetchMissingCovers } from '../../services/localScanner';
import { getAllTracks, clearAllTables } from '../../services/library';
import * as FileSystem from 'expo-file-system/legacy';

const BG = '#121212';
const SURFACE = 'rgba(54, 57, 63, 0.65)';
const TEXT_PRIMARY = '#DCDDDE';
const TEXT_SECONDARY = '#96989D';
const TEXT_MUTED = '#72767D';
const BORDER = 'rgba(79, 84, 92, 0.4)';

export default function StorageSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme, accentColor, glassOpacity } = useSettingsStore();
  const { songs, setSongs, playlists } = useLibraryStore();
  const [isScanning, setIsScanning] = useState(false);
  const [isOptimizingCovers, setIsOptimizingCovers] = useState(false);
  const [isFetchingCovers, setIsFetchingCovers] = useState(false);
  const [fetchProgress, setFetchProgress] = useState('');
  const [dbSize, setDbSize] = useState('Calculando...');
  const [coversSize, setCoversSize] = useState('Calculando...');
  const [songsSize, setSongsSize] = useState('Calculando...');
  const [lyricsSize, setLyricsSize] = useState('Calculando...');
  const [appCacheSize, setAppCacheSize] = useState('Calculando...');
  const [transferFolderExists, setTransferFolderExists] = useState(false);

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const dynamicSurface = theme === 'oled' 
    ? `rgba(20, 20, 20, ${glassOpacity})` 
    : `rgba(54, 57, 63, ${glassOpacity})`;

  useEffect(() => {
    calculateStorage();
    checkTransferFolder();
  }, [songs]);

  const checkTransferFolder = async () => {
    try {
      const path = '/sdcard/Download/ChakrasMobile/';
      const dirInfo = await FileSystem.getInfoAsync(path);
      setTransferFolderExists(dirInfo.exists);
    } catch {
      setTransferFolderExists(false);
    }
  };

  const getDirSize = async (dirPath: string): Promise<number> => {
    try {
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) return 0;
      
      const files = await FileSystem.readDirectoryAsync(dirPath);
      let totalSize = 0;
      for (const file of files) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(`${dirPath}${file}`);
          if (fileInfo.exists) {
            if (fileInfo.isDirectory) {
              totalSize += await getDirSize(`${dirPath}${file}/`);
            } else {
              totalSize += fileInfo.size;
            }
          }
        } catch {}
      }
      return totalSize;
    } catch (e) {
      console.warn('Error calculando tamaño de directorio:', dirPath, e);
      return 0;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const calculateStorage = async () => {
    try {
      // 1. Database Size
      const dbPath = `${FileSystem.documentDirectory}SQLite/chakras_library.db`;
      const dbInfo = await FileSystem.getInfoAsync(dbPath);
      if (dbInfo.exists) {
        setDbSize(formatBytes(dbInfo.size));
      } else {
        setDbSize('0 B');
      }

      // 2. Folders
      const coversDir = `${FileSystem.documentDirectory}Covers/`;
      const songsDir = `${FileSystem.documentDirectory}Songs/`;
      const lyricsDir = `${FileSystem.documentDirectory}Lyrics/`;
      const cacheDir = FileSystem.cacheDirectory;

      const cSize = await getDirSize(coversDir);
      const sSize = await getDirSize(songsDir);
      const lSize = await getDirSize(lyricsDir);
      const cacheSizeVal = cacheDir ? await getDirSize(cacheDir) : 0;

      setCoversSize(formatBytes(cSize));
      setSongsSize(formatBytes(sSize));
      setLyricsSize(formatBytes(lSize));
      setAppCacheSize(formatBytes(cacheSizeVal));
    } catch (err) {
      console.warn('Error al calcular almacenamiento real:', err);
    }
  };

  const handleRescan = async () => {
    setIsScanning(true);
    try {
      const tracks = await scanLocalMusic();
      setSongs(tracks);
      Alert.alert('Sincronización Exitosa', `Se han escaneado y cargado ${tracks.length} canciones locales.`);
    } catch (e) {
      Alert.alert('Error de Escaneo', 'No se pudo completar el escaneo de música.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportFiles = async () => {
    setIsScanning(true);
    try {
      const importedTracks = await pickAndImportAudioFiles();
      if (importedTracks.length > 0) {
        const allTracks = getAllTracks();
        setSongs(allTracks);
        Alert.alert('Importación Exitosa', `Se han importado ${importedTracks.length} canciones correctamente.`);
      }
    } catch (e) {
      console.warn('Error al importar música:', e);
      Alert.alert('Error de Importación', 'Hubo un error al seleccionar o copiar los archivos.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleOptimizeCovers = async () => {
    if (songs.length === 0) {
      Alert.alert('Sin canciones', 'No hay canciones en la biblioteca para optimizar.');
      return;
    }

    Alert.alert(
      'Optimizar Portadas',
      'Esto buscará todas las portadas en la biblioteca y las comprimirá/redimensionará a 300x300 píxeles. ¿Deseas continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Optimizar',
          onPress: async () => {
            setIsOptimizingCovers(true);
            try {
              const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
              let optimizedCount = 0;
              let errorCount = 0;

              for (const song of songs) {
                if (song.coverUri && song.coverUri.startsWith('file://')) {
                  try {
                    const fileInfo = await FileSystem.getInfoAsync(song.coverUri);
                    if (fileInfo.exists && (!fileInfo.size || fileInfo.size > 50 * 1024)) {
                      const manipulated = await manipulateAsync(
                        song.coverUri,
                        [{ resize: { width: 300, height: 300 } }],
                        { compress: 0.7, format: SaveFormat.JPEG }
                      );
                      await FileSystem.moveAsync({
                        from: manipulated.uri,
                        to: song.coverUri
                      });
                      optimizedCount++;
                    }
                  } catch (err) {
                    console.warn(`Error al optimizar portada de ${song.title}:`, err);
                    errorCount++;
                  }
                }
              }

              await calculateStorage();
              Alert.alert(
                'Optimización Completada',
                `Se procesaron y optimizaron ${optimizedCount} portadas. ${errorCount > 0 ? `Hubo problemas en ${errorCount} portadas.` : ''}`
              );
            } catch (e) {
              console.error('Error durante la optimización de portadas:', e);
              Alert.alert('Error', 'Hubo un problema al optimizar las portadas.');
            } finally {
              setIsOptimizingCovers(false);
            }
          }
        }
      ]
    );
  };

  const handleFetchMissingCovers = async () => {
    const missingCount = songs.filter(track => !track.coverUri || !track.coverUri.startsWith('file://')).length;
    if (missingCount === 0) {
      Alert.alert('Todas las portadas listas', 'Todas las canciones en tu biblioteca ya tienen portada.');
      return;
    }

    Alert.alert(
      'Buscar Portadas Faltantes',
      `Se encontraron ${missingCount} canciones sin portada local. Buscaremos y descargaremos las portadas faltantes automáticamente usando internet. ¿Deseas continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Buscar Portadas',
          onPress: async () => {
            setIsFetchingCovers(true);
            setFetchProgress(`Iniciando búsqueda de ${missingCount} portadas...`);
            try {
              const found = await fetchMissingCovers((processed, total, found) => {
                setFetchProgress(`Procesado: ${processed}/${total} (Encontradas: ${found})`);
              });
              
              // Recargar las canciones en Zustand para refrescar la UI
              const allTracks = getAllTracks();
              setSongs(allTracks);
              await calculateStorage();
              
              Alert.alert(
                'Búsqueda Completada',
                `Se encontraron y aplicaron ${found} portadas faltantes.`
              );
            } catch (err) {
              console.error('Error buscando portadas faltantes:', err);
              Alert.alert('Error', 'Hubo un problema al buscar las portadas.');
            } finally {
              setIsFetchingCovers(false);
              setFetchProgress('');
            }
          }
        }
      ]
    );
  };

  const handleDeleteTransferFolder = () => {
    Alert.alert(
      'Eliminar Carpeta Temporal',
      '¿Deseas eliminar la carpeta /sdcard/Download/ChakrasMobile? Haz esto SOLO si ya importaste tus canciones. Liberará unos ~3 GB de espacio en tu celular.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Carpeta',
          style: 'destructive',
          onPress: async () => {
            setIsScanning(true);
            try {
              const path = '/sdcard/Download/ChakrasMobile/';
              const dirInfo = await FileSystem.getInfoAsync(path);
              if (dirInfo.exists) {
                await FileSystem.deleteAsync(path, { idempotent: true });
              }
              setTransferFolderExists(false);
              Alert.alert('Carpeta Eliminada', 'Se ha eliminado la carpeta temporal de descargas de tu celular.');
            } catch (err) {
              console.error('Error al borrar carpeta de transferencia:', err);
              Alert.alert('Error', 'No se pudo eliminar la carpeta automáticamente.');
            } finally {
              setIsScanning(false);
            }
          }
        }
      ]
    );
  };

  const handleResetDb = () => {
    Alert.alert(
      'Restablecer Biblioteca',
      '¿Estás seguro de que quieres borrar permanentemente todas las canciones, carátulas y playlists de la aplicación? Se limpiará toda la caché y base de datos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Restablecer Todo', 
          style: 'destructive',
          onPress: async () => {
            setIsScanning(true);
            try {
              // 1. Borrar base de datos SQLite
              clearAllTables();
              
              // 2. Borrar directorios físicos
              const songsDir = `${FileSystem.documentDirectory}Songs/`;
              const musicDir = `${FileSystem.documentDirectory}Music/`;
              const coversDir = `${FileSystem.documentDirectory}Covers/`;
              const lyricsDir = `${FileSystem.documentDirectory}Lyrics/`;
              
              for (const dir of [songsDir, musicDir, coversDir, lyricsDir]) {
                try {
                  const dirInfo = await FileSystem.getInfoAsync(dir);
                  if (dirInfo.exists) {
                    await FileSystem.deleteAsync(dir, { idempotent: true });
                  }
                } catch (dirErr) {
                  console.warn(`Error al borrar directorio: ${dir}`, dirErr);
                }
              }

              // 3. Resetear stores de Zustand
              setSongs([]);
              useLibraryStore.setState({ playlists: [] });
              
              await calculateStorage();
              Alert.alert('Biblioteca Borrada', 'Se ha limpiado el almacenamiento y la base de datos completamente.');
            } catch (err) {
              console.error('Error al restablecer biblioteca:', err);
              Alert.alert('Error', 'Hubo un problema al borrar todos los archivos.');
            } finally {
              setIsScanning(false);
            }
          }
        }
      ]
    );
  };

  const handleClearCache = async () => {
    setIsScanning(true);
    try {
      const cacheDir = FileSystem.cacheDirectory;
      if (cacheDir) {
        const files = await FileSystem.readDirectoryAsync(cacheDir);
        for (const file of files) {
          try {
            await FileSystem.deleteAsync(`${cacheDir}${file}`, { idempotent: true });
          } catch {}
        }
      }
      await calculateStorage();
      Alert.alert('Caché Limpia', 'Se ha vaciado la caché temporal e importaciones duplicadas con éxito.');
    } catch (err) {
      console.error('Error al limpiar caché:', err);
      Alert.alert('Error', 'No se pudo limpiar la caché por completo.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: dynamicBg }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: dynamicSurface }]} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Almacenamiento</Text>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Uso de Almacenamiento */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Uso del Espacio</Text>
          <Text style={styles.sectionDesc}>Espacio real ocupado por los archivos de la app</Text>

          <View style={[styles.card, { backgroundColor: dynamicSurface }]}>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>Base de Datos (SQLite):</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY }}>{dbSize}</Text>
              </View>
              <View style={{ height: 0.5, backgroundColor: BORDER }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>Caché de Portadas (Covers):</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY }}>{coversSize}</Text>
              </View>
              <View style={{ height: 0.5, backgroundColor: BORDER }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>Canciones Internas (Songs):</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY }}>{songsSize}</Text>
              </View>
              <View style={{ height: 0.5, backgroundColor: BORDER }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>Letras Sincronizadas:</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY }}>{lyricsSize}</Text>
              </View>
              <View style={{ height: 0.5, backgroundColor: BORDER }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: TEXT_SECONDARY }}>Caché Temporal (Archivos):</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY }}>{appCacheSize}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={16} color={TEXT_MUTED} />
              <Text style={styles.infoText}>
                La base de datos contiene {songs.length} canciones importadas y {playlists.length} playlists locales.
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Acciones de Mantenimiento */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <Text style={styles.sectionTitle}>Mantenimiento</Text>
          <Text style={styles.sectionDesc}>Acciones para limpiar o sincronizar tu reproductor</Text>

          <View style={[styles.card, { backgroundColor: dynamicSurface }]}>
            {/* Sincronizar */}
            <TouchableOpacity style={styles.actionRow} onPress={handleRescan} disabled={isScanning} activeOpacity={0.7}>
              <View style={styles.actionIconCol}>
                {isScanning ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <Ionicons name="sync-outline" size={22} color={accentColor} />
                )}
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>{isScanning ? 'Sincronizando...' : 'Volver a escanear música'}</Text>
                <Text style={styles.actionDescText}>Escanea carpetas del celular en busca de archivos nuevos</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Importar desde archivos */}
            <TouchableOpacity style={styles.actionRow} onPress={handleImportFiles} disabled={isScanning || isOptimizingCovers} activeOpacity={0.7}>
              <View style={styles.actionIconCol}>
                {isScanning ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <Ionicons name="document-attach-outline" size={22} color={accentColor} />
                )}
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Importar archivos de audio</Text>
                <Text style={styles.actionDescText}>Selecciona canciones desde tu almacenamiento (.mp3, .flac, etc.)</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Optimizar Portadas */}
            <TouchableOpacity style={styles.actionRow} onPress={handleOptimizeCovers} disabled={isOptimizingCovers || isScanning} activeOpacity={0.7}>
              <View style={styles.actionIconCol}>
                {isOptimizingCovers ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <Ionicons name="image-outline" size={22} color="#5865F2" />
                )}
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Optimizar y comprimir portadas</Text>
                <Text style={styles.actionDescText}>Comprime todas las portadas en HD guardadas a 300x300px para liberar espacio</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Buscar Portadas Faltantes */}
            <TouchableOpacity style={styles.actionRow} onPress={handleFetchMissingCovers} disabled={isFetchingCovers || isScanning} activeOpacity={0.7}>
              <View style={styles.actionIconCol}>
                {isFetchingCovers ? (
                  <ActivityIndicator size="small" color={accentColor} />
                ) : (
                  <Ionicons name="cloud-download-outline" size={22} color="#E91E63" />
                )}
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Buscar portadas faltantes</Text>
                <Text style={styles.actionDescText}>
                  {isFetchingCovers ? fetchProgress : 'Busca en internet y descarga carátulas para canciones que no tienen'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Limpiar Caché */}
            <TouchableOpacity style={styles.actionRow} onPress={handleClearCache} disabled={isScanning} activeOpacity={0.7}>
              <View style={styles.actionIconCol}>
                <Ionicons name="trash-bin-outline" size={22} color="#57F287" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitle}>Limpiar caché temporal</Text>
                <Text style={styles.actionDescText}>Libera espacio borrando copias temporales e importaciones residuales</Text>
              </View>
            </TouchableOpacity>

            {transferFolderExists && (
              <>
                <View style={styles.divider} />
                {/* Eliminar Carpeta Temporal */}
                <TouchableOpacity style={styles.actionRow} onPress={handleDeleteTransferFolder} disabled={isScanning} activeOpacity={0.7}>
                  <View style={styles.actionIconCol}>
                    <Ionicons name="folder-open-outline" size={22} color="#ED4245" />
                  </View>
                  <View style={styles.actionTextCol}>
                    <Text style={[styles.actionTitle, { color: '#ED4245' }]}>Eliminar carpeta temporal de canciones</Text>
                    <Text style={styles.actionDescText}>Borra el folder temporal /sdcard/Download/ChakrasMobile para recuperar ~3 GB</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider} />

            {/* Restablecer Base de Datos */}
            <TouchableOpacity style={styles.actionRow} onPress={handleResetDb} activeOpacity={0.7}>
              <View style={styles.actionIconCol}>
                <Ionicons name="nuclear-outline" size={22} color="#ED4245" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={[styles.actionTitle, { color: '#ED4245' }]}>Restablecer Biblioteca</Text>
                <Text style={styles.actionDescText}>Borra todas las canciones indexadas y limpia la base de datos</Text>
              </View>
            </TouchableOpacity>
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
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  storageLabel: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  storageValue: {
    fontSize: 20,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  storageDivider: {
    width: 0.5,
    height: 36,
    backgroundColor: BORDER,
  },
  divider: {
    height: 0.5,
    backgroundColor: BORDER,
    marginVertical: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 11,
    color: TEXT_MUTED,
    flex: 1,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  actionIconCol: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: BORDER,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  actionDescText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 2,
  },
});
