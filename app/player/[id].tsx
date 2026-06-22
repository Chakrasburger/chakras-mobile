import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedProps, 
  withTiming, 
  withRepeat, 
  withSpring, 
  cancelAnimation 
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TrackPlayer, { useProgress, State, usePlaybackState } from 'react-native-track-player';
import Svg, { Path } from 'react-native-svg';
import axios from 'axios';
import { usePlayerStore } from '../../stores/playerStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useLibraryStore } from '../../stores/libraryStore';
import EqualizerView from '../../components/player/EqualizerView';
import LyricsView from '../../components/player/LyricsView';
import QueueView from '../../components/player/QueueView';

const TEXT_PRIMARY = '#DCDDDE';
const TEXT_MUTED = '#72767D';

const { width } = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SoundVisualizer({ isPlaying, accentColor }: { isPlaying: boolean; accentColor: string }) {
  const waveVal = useSharedValue(0);

  React.useEffect(() => {
    if (isPlaying) {
      waveVal.value = withRepeat(withTiming(1, { duration: 2000 }), -1, false);
    } else {
      cancelAnimation(waveVal);
      waveVal.value = withTiming(0, { duration: 600 });
    }
  }, [isPlaying]);

  const animatedProps = useAnimatedProps(() => {
    const progress = waveVal.value;
    const widthVal = width - 48;
    const heightVal = 30;
    const midY = heightVal / 2;
    
    let path = `M 0 ${midY}`;
    for (let i = 0; i <= 24; i++) {
      const x = (i / 24) * widthVal;
      const sin1 = Math.sin(i * 0.5 + progress * Math.PI * 2);
      const sin2 = Math.cos(i * 0.3 - progress * Math.PI * 2);
      const amp = isPlaying ? (8 * (sin1 + sin2) / 2) : 1 * sin1;
      const y = midY + amp;
      path += ` L ${x} ${y}`;
    }
    path += ` L ${widthVal} ${heightVal} L 0 ${heightVal} Z`;
    
    return { d: path };
  });

  return (
    <View style={styles.visualizerContainer}>
      <Svg height="30" width={width - 48}>
        <AnimatedPath
          fill={accentColor + '18'}
          stroke={accentColor}
          strokeWidth={1.5}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

export default function FullPlayerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { 
    currentTrack, 
    queue, 
    next, 
    previous, 
    shuffleEnabled, 
    repeatMode, 
    toggleShuffle, 
    cycleRepeatMode 
  } = usePlayerStore();
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress();
  const { theme, accentColor } = useSettingsStore();
  const { updateSong } = useLibraryStore();

  const [sliderWidth, setSliderWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const [showEQ, setShowEQ] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // States for custom modals
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [showEditMeta, setShowEditMeta] = useState(false);
  
  // Custom form bindings
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [isSearchingCover, setIsSearchingCover] = useState(false);

  // Reanimated values for Aura Fluida Dinámica
  const aura1X = useSharedValue(0);
  const aura1Y = useSharedValue(0);
  const aura2X = useSharedValue(0);
  const aura2Y = useSharedValue(0);
  const heartScale = useSharedValue(1);

  React.useEffect(() => {
    aura1X.value = withRepeat(withTiming(width * 0.3, { duration: 10000 }), -1, true);
    aura1Y.value = withRepeat(withTiming(width * 0.2, { duration: 12000 }), -1, true);
    aura2X.value = withRepeat(withTiming(-width * 0.3, { duration: 14000 }), -1, true);
    aura2Y.value = withRepeat(withTiming(-width * 0.2, { duration: 9000 }), -1, true);
  }, []);

  const animatedAura1 = useAnimatedStyle(() => ({
    transform: [{ translateX: aura1X.value }, { translateY: aura1Y.value }]
  }));

  const animatedAura2 = useAnimatedStyle(() => ({
    transform: [{ translateX: aura2X.value }, { translateY: aura2Y.value }]
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }]
  }));

  const toggleFavorite = () => {
    if (!currentTrack) return;
    const nextFav = !currentTrack.isFavorite;

    heartScale.value = 0.4;
    heartScale.value = withSpring(1, { damping: 8, stiffness: 120 });

    usePlayerStore.setState(state => {
      const newQueue = state.queue.map(t => t.id === currentTrack.id ? { ...t, isFavorite: nextFav } : t);
      if (state.currentTrack && state.currentTrack.id === currentTrack.id) {
        return { 
          currentTrack: { ...state.currentTrack, isFavorite: nextFav },
          queue: newQueue
        };
      }
      return { queue: newQueue };
    });

    updateSong(currentTrack.id, { isFavorite: nextFav });

    try {
      const { saveTrack } = require('../../services/library');
      saveTrack({ ...currentTrack, isFavorite: nextFav });
    } catch (err) {
      console.warn('Error al guardar favorito en la base de datos:', err);
    }

    try {
      const Haptics = require('expo-haptics');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
  };

  const handleSearchCover = async (customQuery?: string) => {
    if (!currentTrack) return;
    setIsSearchingCover(true);
    const searchTerms = customQuery || `${currentTrack.artist} ${currentTrack.title}`;
    
    try {
      const term = searchTerms.trim().replace(/\s+/g, '+');
      const response = await axios.get('https://itunes.apple.com/search', {
        params: {
          term,
          media: 'music',
          limit: 3,
        },
        timeout: 3000
      });

      if (response.data && response.data.results && response.data.results.length > 0) {
        const bestMatch = response.data.results[0];
        let coverUrl = bestMatch.artworkUrl100;
        if (coverUrl) {
          coverUrl = coverUrl.replace('100x100bb', '600x600bb');
        }

        if (coverUrl) {
          const { downloadAndCacheCover } = require('../../services/localScanner');
          const localPath = await downloadAndCacheCover(currentTrack.id, coverUrl);
          if (localPath) {
            // Update Zustand playerStore
            usePlayerStore.setState(state => {
              if (state.currentTrack && state.currentTrack.id === currentTrack.id) {
                return { currentTrack: { ...state.currentTrack, coverUri: localPath } };
              }
              return {};
            });
            
            // Update libraryStore
            updateSong(currentTrack.id, { coverUri: localPath });
            
            // Save to SQLite
            const { saveTrack } = require('../../services/library');
            saveTrack({ ...currentTrack, coverUri: localPath });

            // Update TrackPlayer metadata
            const activeIndex = await TrackPlayer.getActiveTrackIndex();
            if (typeof activeIndex === 'number') {
              await TrackPlayer.updateMetadataForTrack(activeIndex, {
                artwork: localPath
              });
            }

            Alert.alert('Éxito', 'Se descargó y vinculó la portada correctamente.');
            setShowManualSearch(false);
            setShowOptions(false);
            setIsSearchingCover(false);
            return;
          }
        }
      }
      Alert.alert('Sin Resultados', 'No se encontró ninguna portada en iTunes con esos términos.');
    } catch (err) {
      console.warn('Error al buscar portada:', err);
      Alert.alert('Error', 'Hubo un error de red al consultar con iTunes.');
    } finally {
      setIsSearchingCover(false);
    }
  };

  const handleEditMetadata = async () => {
    if (!currentTrack || !editTitle.trim() || !editArtist.trim()) return;

    usePlayerStore.setState(state => {
      if (state.currentTrack && state.currentTrack.id === currentTrack.id) {
        return { 
          currentTrack: { 
            ...state.currentTrack, 
            title: editTitle.trim(), 
            artist: editArtist.trim() 
          } 
        };
      }
      return {};
    });

    updateSong(currentTrack.id, { 
      title: editTitle.trim(), 
      artist: editArtist.trim() 
    });

    try {
      const { saveTrack } = require('../../services/library');
      saveTrack({ 
        ...currentTrack, 
        title: editTitle.trim(), 
        artist: editArtist.trim() 
      });

      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (typeof activeIndex === 'number') {
        await TrackPlayer.updateMetadataForTrack(activeIndex, {
          title: editTitle.trim(),
          artist: editArtist.trim()
        });
      }
      
      Alert.alert('Guardado', 'Los metadatos se actualizaron correctamente.');
      setShowEditMeta(false);
      setShowOptions(false);
    } catch (err) {
      console.warn('Error guardando metadatos:', err);
    }
  };

  React.useEffect(() => {
    if (duration > 0 && currentTrack && (!currentTrack.duration || currentTrack.duration === 0)) {
      const roundedDuration = Math.round(duration);
      if (roundedDuration > 0) {
        usePlayerStore.setState(state => {
          if (state.currentTrack && state.currentTrack.id === currentTrack.id) {
            return { currentTrack: { ...state.currentTrack, duration: roundedDuration } };
          }
          return {};
        });
        
        updateSong(currentTrack.id, { duration: roundedDuration });
        
        try {
          const { saveTrack } = require('../../services/library');
          saveTrack({ ...currentTrack, duration: roundedDuration });
        } catch (err) {
          console.warn('Error al guardar duración en base de datos:', err);
        }
      }
    }
  }, [duration, currentTrack?.id]);

  const isPlaying = playbackState.state === State.Playing;

  const handlePlayPause = async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const handleNext = async () => {
    await TrackPlayer.skipToNext();
    next();
  };

  const handlePrevious = async () => {
    await TrackPlayer.skipToPrevious();
    previous();
  };

  const handleTouchStart = (evt: any) => {
    setIsDragging(true);
    updateDragPosition(evt);
  };

  const handleTouchMove = (evt: any) => {
    updateDragPosition(evt);
  };

  const handleTouchEnd = async (evt: any) => {
    if (duration <= 0 || sliderWidth <= 0) return;
    const touchX = evt.nativeEvent.locationX;
    let pct = touchX / sliderWidth;
    if (pct < 0) pct = 0;
    if (pct > 1) pct = 1;
    const newPosition = pct * duration;
    await TrackPlayer.seekTo(newPosition);
    setIsDragging(false);
  };

  const handleTouchCancel = () => {
    setIsDragging(false);
  };

  const updateDragPosition = (evt: any) => {
    if (duration <= 0 || sliderWidth <= 0) return;
    const touchX = evt.nativeEvent.locationX;
    let pct = touchX / sliderWidth;
    if (pct < 0) pct = 0;
    if (pct > 1) pct = 1;
    setDragPosition(pct * duration);
    try {
      const Haptics = require('expo-haptics');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  if (!currentTrack) {
    return <View style={[styles.container, { backgroundColor: theme === 'oled' ? '#000000' : '#121212' }]} />;
  }

  const dynamicBg = theme === 'oled' ? '#000000' : '#121212';
  const displayPosition = isDragging ? dragPosition : position;
  const safeDisplayPosition = isNaN(displayPosition) ? 0 : displayPosition;
  const safeDuration = isNaN(duration) || duration <= 0 ? 1 : duration;
  const progressPct = (safeDisplayPosition / safeDuration) * 100;

  return (
    <View style={[styles.container, { backgroundColor: dynamicBg }]}>
      {/* Dynamic Fluid Aura (Ambient Glow backdrop) */}
      <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: dynamicBg }]}>
        <Animated.View style={[
          styles.auraBlob, 
          { backgroundColor: accentColor, left: '15%', top: '15%' }, 
          animatedAura1
        ]} />
        <Animated.View style={[
          styles.auraBlob, 
          { backgroundColor: accentColor + '77', right: '10%', bottom: '25%' }, 
          animatedAura2
        ]} />
        {/* <BlurView intensity={120} tint="dark" style={StyleSheet.absoluteFill} /> */}
      </View>

      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="chevron-down" size={32} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerText}>Reproduciendo desde Canciones</Text>
          <TouchableOpacity hitSlop={10} onPress={() => {
            setEditTitle(currentTrack.title);
            setEditArtist(currentTrack.artist);
            setManualSearchQuery(`${currentTrack.artist} ${currentTrack.title}`);
            setShowOptions(true);
          }} style={styles.iconBtn}>
            <Ionicons name="ellipsis-vertical" size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Cover Art */}
        <Animated.View style={styles.coverContainer}>
          <View style={styles.coverShadowContainer}>
            {currentTrack.coverUri ? (
              <Image 
                source={{ uri: currentTrack.coverUri }} 
                style={{ width: width - 64, height: width - 64, borderRadius: 16 }} 
              />
            ) : (
              <LinearGradient
                colors={[accentColor, `${accentColor}88`]}
                style={styles.coverPlaceholder}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="musical-note" size={120} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            )}
          </View>
        </Animated.View>

        <View style={styles.bottomControls}>
          {/* Track Info */}
          <Animated.View style={styles.infoRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>{currentTrack.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{currentTrack.artist}</Text>
            </View>
            <TouchableOpacity hitSlop={10} onPress={toggleFavorite}>
              <Animated.View style={heartStyle}>
                <Ionicons 
                  name={currentTrack.isFavorite ? "heart" : "heart-outline"} 
                  size={28} 
                  color={currentTrack.isFavorite ? '#EB459E' : TEXT_PRIMARY} 
                />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          {/* Sound Visualizer */}
          <SoundVisualizer isPlaying={isPlaying} accentColor={accentColor} />

          {/* Scrubber */}
          <Animated.View style={styles.scrubberContainer}>
            <View 
              style={styles.sliderTouchContainer}
              onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <View style={styles.sliderTrack} pointerEvents="none">
                <LinearGradient
                  colors={[accentColor, `${accentColor}aa`]}
                  style={[styles.sliderFill, { width: `${progressPct}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <View style={[styles.sliderThumb, { left: `${progressPct}%`, shadowColor: accentColor }]} />
              </View>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(displayPosition)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </Animated.View>

          {/* Playback Controls */}
          <Animated.View style={styles.controlsRow}>
            <TouchableOpacity hitSlop={10} onPress={toggleShuffle}>
              <Ionicons 
                name="shuffle" 
                size={26} 
                color={shuffleEnabled ? accentColor : TEXT_MUTED} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity hitSlop={10} onPress={handlePrevious}>
              <Ionicons name="play-skip-back" size={36} color={TEXT_PRIMARY} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.playPauseBtn, { shadowColor: accentColor }]} 
              onPress={handlePlayPause}
            >
              <LinearGradient
                colors={[accentColor, `${accentColor}aa`]}
                style={styles.playPauseGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={36} color="#fff" style={{ marginLeft: isPlaying ? 0 : 4 }} />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity hitSlop={10} onPress={handleNext}>
              <Ionicons name="play-skip-forward" size={36} color={TEXT_PRIMARY} />
            </TouchableOpacity>
            
            <TouchableOpacity hitSlop={10} onPress={cycleRepeatMode}>
              <Ionicons 
                name={repeatMode === 'one' ? "repeat" : "repeat"} 
                size={26} 
                color={repeatMode !== 'off' ? accentColor : TEXT_MUTED} 
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Bottom Actions */}
          <Animated.View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => setShowEQ(true)} style={styles.actionBtn}>
              <Ionicons name="options-outline" size={20} color={TEXT_PRIMARY} />
              <Text style={styles.actionText}>EQ</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLyrics(true)} style={styles.actionBtn}>
              <Ionicons name="text-outline" size={20} color={TEXT_PRIMARY} />
              <Text style={styles.actionText}>Letras</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowQueue(true)} style={styles.actionBtn}>
              <Ionicons name="list-outline" size={22} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Overlays */}
      {showEQ && <EqualizerView onClose={() => setShowEQ(false)} />}
      {showLyrics && <LyricsView track={currentTrack} position={position} onClose={() => setShowLyrics(false)} />}
      {showQueue && <QueueView onClose={() => setShowQueue(false)} />}

      {/* Glassmorphism Options Sheet */}
      {showOptions && (
        <BlurView intensity={90} tint="dark" style={styles.optionsOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowOptions(false)} />
          <View style={styles.optionsContainer}>
            <View style={styles.optionsHeader}>
              <Text style={styles.optionsTitle}>Opciones de la Canción</Text>
              <TouchableOpacity onPress={() => setShowOptions(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#DCDDDE" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                handleSearchCover();
              }}
            >
              <Ionicons name="image-outline" size={22} color={TEXT_PRIMARY} />
              <Text style={styles.optionText}>Buscar portada en iTunes (Automático)</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowManualSearch(true);
              }}
            >
              <Ionicons name="search-outline" size={22} color={TEXT_PRIMARY} />
              <Text style={styles.optionText}>Buscar portada en iTunes manualmente...</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowEditMeta(true);
              }}
            >
              <Ionicons name="create-outline" size={22} color={TEXT_PRIMARY} />
              <Text style={styles.optionText}>Editar Título y Artista</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}

      {/* Custom Manual Cover Search Form */}
      {showManualSearch && (
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Buscar Portada en iTunes</Text>
            <Text style={styles.modalSubtitle}>Escribe el nombre de búsqueda exacto:</Text>
            <TextInput
              style={styles.modalInput}
              value={manualSearchQuery}
              onChangeText={setManualSearchQuery}
              placeholder="Ej. Tokyo Ghoul Unravel TK"
              placeholderTextColor="#72767D"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowManualSearch(false)}>
                <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtnSave, { backgroundColor: accentColor }]} 
                disabled={isSearchingCover}
                onPress={() => handleSearchCover(manualSearchQuery)}
              >
                <Text style={styles.modalBtnTextSave}>{isSearchingCover ? 'Buscando...' : 'Buscar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      )}

      {/* Custom Metadata Editor Form */}
      {showEditMeta && (
        <BlurView intensity={100} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar Metadatos</Text>
            
            <Text style={styles.inputLabel}>Título de la canción:</Text>
            <TextInput
              style={styles.modalInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Título"
              placeholderTextColor="#72767D"
            />

            <Text style={styles.inputLabel}>Artista:</Text>
            <TextInput
              style={styles.modalInput}
              value={editArtist}
              onChangeText={setEditArtist}
              placeholder="Artista"
              placeholderTextColor="#72767D"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowEditMeta(false)}>
                <Text style={styles.modalBtnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtnSave, { backgroundColor: accentColor }]} 
                onPress={handleEditMetadata}
              >
                <Text style={styles.modalBtnTextSave}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    zIndex: 1,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coverContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  coverShadowContainer: {
    width: width - 64,
    height: width - 64,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  coverPlaceholder: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomControls: {
    paddingBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  artist: {
    fontSize: 16,
    color: TEXT_MUTED,
  },
  visualizerContainer: {
    height: 30,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  auraBlob: {
    position: 'absolute',
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: (width * 1.2) / 2,
    opacity: 0.25,
  },
  scrubberContainer: {
    marginBottom: 32,
  },
  sliderTouchContainer: {
    height: 32,
    justifyContent: 'center',
    width: '100%',
  },
  sliderTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
    width: '100%',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginLeft: -6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  playPauseBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  playPauseGradient: {
    flex: 1,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  // Ellipsis menu options styles
  optionsOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    zIndex: 99,
  },
  optionsContainer: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(79, 84, 92, 0.4)',
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  optionsTitle: {
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
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(79, 84, 92, 0.2)',
  },
  optionText: {
    fontSize: 16,
    color: '#DCDDDE',
    marginLeft: 14,
    fontWeight: '500',
  },
  // Modal forms styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'rgba(28, 28, 30, 0.95)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#72767D',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DCDDDE',
    marginTop: 12,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtnCancel: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalBtnTextCancel: {
    color: '#DCDDDE',
    fontSize: 14,
    fontWeight: '600',
  },
  modalBtnSave: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnTextSave: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
