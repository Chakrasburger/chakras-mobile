import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { Track } from '../stores/playerStore';
import { saveTrack, getAllTracks } from './library';
import { fetchSyncedLyrics } from './lyrics';
import { useSettingsStore } from '../stores/settingsStore';

const isWeb = Platform.OS === 'web';
const MediaLibrary = isWeb ? null : require('expo-media-library');

export async function requestMediaPermissions() {
  if (isWeb) return false;
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

let isNetworkAvailable = true;
let pcLibraryCache: any[] | null = null;

async function fetchPcLibrary(pcIp: string): Promise<any[] | null> {
  if (pcLibraryCache) return pcLibraryCache;
  try {
    const url = `http://${pcIp}:5888/Descarga%20canciones/biblioteca_lista.json`;
    const response = await axios.get(url, { timeout: 1500 });
    if (Array.isArray(response.data)) {
      pcLibraryCache = response.data;
      return pcLibraryCache;
    }
  } catch (e: any) {
    console.warn('No se pudo cargar la biblioteca desde la PC:', e.message);
  }
  return null;
}

async function resolveSongMetadata(filename: string, localUri: string): Promise<{ title: string; artist: string; album: string; duration: number; coverUri: string | null }> {
  let title = filename.replace(/\.[^/.]+$/, "");
  let artist = 'Desconocido';
  let album = 'Importado';
  let duration = 0;
  let coverUri: string | null = null;
  let hasLocalMeta = false;

  // 1. Intentar extraer metadatos locales ID3 (offline)
  try {
    const { parseLocalMetadata } = require('../utils/metadataParser');
    const localMeta = await parseLocalMetadata(localUri);
    if (localMeta) {
      if (localMeta.title) {
        title = localMeta.title;
        hasLocalMeta = true;
      }
      if (localMeta.artist) artist = localMeta.artist;
      if (localMeta.album) album = localMeta.album;
      if (localMeta.duration) duration = localMeta.duration;
      
      if (localMeta.coverBase64) {
        try {
          const coversDir = `${FileSystem.documentDirectory}Covers/`;
          const dirInfo = await FileSystem.getInfoAsync(coversDir);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(coversDir, { intermediates: true });
          }
          const ext = localMeta.coverMime?.includes('png') ? 'png' : 'jpg';
          const coverPath = `${coversDir}${encodeURIComponent(title)}_${Date.now()}.${ext}`;
          await FileSystem.writeAsStringAsync(coverPath, localMeta.coverBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Comprimir y redimensionar la portada extraída de ID3
          try {
            const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
            const manipulated = await manipulateAsync(
              coverPath,
              [{ resize: { width: 300, height: 300 } }],
              { compress: 0.7, format: SaveFormat.JPEG }
            );
            await FileSystem.moveAsync({
              from: manipulated.uri,
              to: coverPath
            });
          } catch (manipErr) {
            console.warn('Error comprimiendo portada local:', manipErr);
          }
          
          coverUri = coverPath;
        } catch (coverErr) {
          console.warn('Error guardando portada local extraída:', coverErr);
        }
      }
    }
  } catch (err) {
    console.warn('Error parseando metadatos ID3 locales:', err);
  }

  // Si no se pudo obtener título estructurado de los tags ID3, intentar adivinar por nombre de archivo
  if (!hasLocalMeta && title.includes(' - ')) {
    const parts = title.split(' - ');
    artist = parts[0] ? parts[0].trim() : parts[0];
    title = parts.slice(1).join(' - ').trim();
  }

  // 2. Emparejar con PC para metadatos enriquecidos (duración, carátula de YouTube, etc.)
  let matched = false;
  const pcIp = useSettingsStore.getState().pcIp;
  if (pcIp && (duration === 0 || !coverUri)) {
    const pcLibrary = await fetchPcLibrary(pcIp);
    if (pcLibrary) {
      const match = pcLibrary.find(item => {
        const pcFileName = item.filePath ? item.filePath.split('/').pop() : '';
        return pcFileName.toLowerCase() === filename.toLowerCase();
      });

      if (match) {
        if (!hasLocalMeta) {
          title = match.title || title;
          artist = match.artist || artist;
          album = match.album || album;
        }
        duration = match.duration || duration;
        if (match.ytThumbnail && !coverUri) {
          coverUri = match.ytThumbnail;
        }
        matched = true;
      }
    }
  }

  // 3. Si no hubo coincidencia en PC y aún falta información, buscar en iTunes API
  if (!matched && (duration === 0 || !coverUri) && isNetworkAvailable) {
    try {
      const { enrichFromiTunes } = require('./metadata');
      const itunesData = await enrichFromiTunes(title, artist);
      if (itunesData) {
        if (album === 'Importado' && itunesData.album) album = itunesData.album;
        if (!coverUri && itunesData.coverUrl) coverUri = itunesData.coverUrl;
        if (duration === 0 && itunesData.duration) duration = Math.round(itunesData.duration);
      }
    } catch (err) {
      console.warn('Error enriqueciendo desde iTunes, desactivando red para este lote:', err);
      isNetworkAvailable = false;
    }
  }

  return { title, artist, album, duration, coverUri };
}

export async function downloadAndCacheCover(trackId: string, remoteUrl: string): Promise<string | null> {
  if (!remoteUrl || !remoteUrl.startsWith('http')) return null;
  try {
    const coversDir = `${FileSystem.documentDirectory}Covers/`;
    const dirInfo = await FileSystem.getInfoAsync(coversDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(coversDir, { intermediates: true });
    }
    
    const localPath = `${coversDir}${trackId}.jpg`;
    
    await FileSystem.downloadAsync(remoteUrl, localPath);

    // Comprimir y redimensionar a 300x300
    try {
      const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
      const manipulated = await manipulateAsync(
        localPath,
        [{ resize: { width: 300, height: 300 } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      await FileSystem.moveAsync({
        from: manipulated.uri,
        to: localPath
      });
    } catch (manipErr) {
      console.warn('Error manipulando imagen descargada:', manipErr);
    }
    
    return localPath;
  } catch (error) {
    console.warn(`Error al descargar portada de ${remoteUrl}:`, error);
    return null;
  }
}

export async function pickAndImportAudioFiles(): Promise<Track[]> {
  if (isWeb) return [];
  isNetworkAvailable = true;
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.opus', '.aac', '.wma', '.mp4', '.m4r', '.webm'];
    const filteredAssets = result.assets.filter(asset => {
      const name = asset.name.toLowerCase();
      return AUDIO_EXTENSIONS.some(ext => name.endsWith(ext));
    });

    if (filteredAssets.length === 0) {
      Alert.alert('Archivos no soportados', 'Por favor selecciona archivos de audio (.mp3, .flac, .wav, .ogg, .m4a, .opus, .aac, .wma).');
      return [];
    }

    const songsDir = `${FileSystem.documentDirectory}Songs/`;
    const dirInfo = await FileSystem.getInfoAsync(songsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(songsDir, { intermediates: true });
    }

    const importedTracks: Track[] = [];

    for (const asset of filteredAssets) {
      try {
        const targetPath = `${songsDir}${encodeURIComponent(asset.name)}`;
        
        await FileSystem.copyAsync({
          from: asset.uri,
          to: targetPath,
        });

        const trackId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        // Resolver metadatos inteligentes (Nombre, Artista, Duración, Portada)
        const metadata = await resolveSongMetadata(asset.name, targetPath);
        let coverUri = metadata.coverUri;
        if (coverUri && coverUri.startsWith('http')) {
          const cachedPath = await downloadAndCacheCover(trackId, coverUri);
          if (cachedPath) coverUri = cachedPath;
        }

        const track: Track = {
          id: trackId,
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          duration: metadata.duration,
          uri: targetPath,
          coverUri: coverUri,
          playCount: 0,
          addedAt: Date.now(),
        };

        saveTrack(track);
        importedTracks.push(track);
      } catch (err) {
        console.warn(`Error al importar canción individual (${asset.name}):`, err);
      }
    }

    return importedTracks;
  } catch (error) {
    console.error('Error al seleccionar archivos de audio:', error);
    throw error;
  }
}

export async function scanLocalMusic(onProgress?: (scanned: number, total: number) => void): Promise<Track[]> {
  if (isWeb) {
    return [];
  }
  isNetworkAvailable = true;
  const hasPermission = await requestMediaPermissions();
  if (!hasPermission) {
    throw new Error('Permisos de almacenamiento denegados.');
  }

  let media = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.audio,
    first: 1000,
  });
  
  let allAssets = [...media.assets];
  
  while (media.hasNextPage) {
    media = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      after: media.endCursor,
      first: 1000,
    });
    allAssets = [...allAssets, ...media.assets];
  }

  const tracks: Track[] = [];
  
  for (let i = 0; i < allAssets.length; i++) {
    const asset = allAssets[i];
    
    // Filtrar audios cortos (notificaciones, etc.)
    if (asset.duration < 30) continue;

    const metadata = await resolveSongMetadata(asset.filename, asset.uri);
    let coverUri = metadata.coverUri;
    if (coverUri && coverUri.startsWith('http')) {
      const cachedPath = await downloadAndCacheCover(asset.id, coverUri);
      if (cachedPath) coverUri = cachedPath;
    }

    const track: Track = {
      id: asset.id,
      title: metadata.title,
      artist: metadata.artist,
      album: metadata.album,
      duration: metadata.duration || asset.duration,
      uri: asset.uri,
      coverUri: coverUri,
      playCount: 0,
      addedAt: asset.creationTime,
    };

    tracks.push(track);
    saveTrack(track); // Guardamos en SQLite local
    
    if (onProgress) {
      onProgress(i + 1, allAssets.length);
    }
  }

  return tracks;
}

export async function downloadAndCacheLyrics(track: Track): Promise<boolean> {
  const lyricsDir = `${FileSystem.documentDirectory}Lyrics/`;
  const lyricsFile = `${lyricsDir}${track.id}.lrc`;

  try {
    const fileInfo = await FileSystem.getInfoAsync(lyricsFile);
    if (fileInfo.exists) return true; // Ya están en caché

    const dirInfo = await FileSystem.getInfoAsync(lyricsDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(lyricsDir, { intermediates: true });
    }

    const lyrics = await fetchSyncedLyrics(track.title, track.artist, track.album, track.duration);
    if (lyrics && lyrics.length > 0) {
      // Reconstruir el texto LRC
      const lrcText = lyrics.map(l => {
        const m = Math.floor(l.time / 60).toString().padStart(2, '0');
        const s = (l.time % 60).toFixed(2).padStart(5, '0');
        return `[${m}:${s}]${l.text}`;
      }).join('\n');

      await FileSystem.writeAsStringAsync(lyricsFile, lrcText);
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`Error cacheando letras para ${track.title}:`, error);
    return false;
  }
}

export async function fetchMissingCovers(onProgress?: (processed: number, total: number, found: number) => void): Promise<number> {
  const allTracks = getAllTracks();
  const missingCoverTracks = allTracks.filter(track => !track.coverUri || !track.coverUri.startsWith('file://'));
  
  if (missingCoverTracks.length === 0) return 0;
  
  // 1. Intentar cargar la biblioteca del PC si hay IP configurada
  const pcIp = useSettingsStore.getState().pcIp;
  let pcLibrary: any[] | null = null;
  if (pcIp) {
    pcLibrary = await fetchPcLibrary(pcIp);
  }

  let foundCount = 0;
  
  const cleanTerm = (term: string): string => {
    return term
      .replace(/\s*[\(\[][^)]*slowed[^)]*[\)\]]/gi, '')
      .replace(/\s*[\(\[][^)]*reverb[^)]*[\)\]]/gi, '')
      .replace(/\s*[\(\[][^)]*remix[^)]*[\)\]]/gi, '')
      .replace(/\s*[\(\[][^)]*official[^)]*[\)\]]/gi, '')
      .replace(/\s*[\(\[][^)]*mv[^)]*[\)\]]/gi, '')
      .replace(/\s*[\(\[][^)]*video[^)]*[\)\]]/gi, '')
      .replace(/\s*[\(\[][^)]*lyrics[^)]*[\)\]]/gi, '')
      .replace(/\s*[\(\[][^)]*audio[^)]*[\)\]]/gi, '')
      .replace(/\s*[\(\[][^)]*engchn[^)]*[\)\]]/gi, '')
      .trim();
  };

  for (let i = 0; i < missingCoverTracks.length; i++) {
    const track = missingCoverTracks[i];
    try {
      let coverUrl: string | null = null;

      // A. Intentar coincidencia con PC Library por nombre de archivo
      if (pcLibrary) {
        try {
          const localFileName = decodeURIComponent(track.uri.split('/').pop() || '');
          const match = pcLibrary.find(item => {
            const pcFileName = item.filePath ? item.filePath.split('/').pop() : '';
            return pcFileName.toLowerCase() === localFileName.toLowerCase();
          });
          if (match && match.ytThumbnail) {
            coverUrl = match.ytThumbnail;
          }
        } catch (pcMatchErr) {
          console.warn('Error buscando coincidencia en PC para:', track.title, pcMatchErr);
        }
      }

      // B. Fallback a iTunes
      if (!coverUrl) {
        try {
          const cleanTitle = cleanTerm(track.title);
          const cleanArtist = cleanTerm(track.artist);
          const { enrichFromiTunes } = require('./metadata');
          const itunesData = await enrichFromiTunes(cleanTitle, cleanArtist);
          coverUrl = itunesData?.coverUrl || null;
        } catch (itunesErr) {
          console.warn(`iTunes fallback falló para ${track.title}:`, itunesErr);
        }
      }

      // C. Fallback a YouTube Search
      if (!coverUrl) {
        try {
          const cleanTitle = cleanTerm(track.title);
          const cleanArtist = cleanTerm(track.artist);
          const { searchVideos } = require('./youtube');
          const ytResults = await searchVideos(`${cleanArtist} ${cleanTitle}`);
          if (ytResults && ytResults.length > 0) {
            coverUrl = ytResults[0].thumbnail;
          }
        } catch (ytErr) {
          console.warn(`YouTube fallback falló para ${track.title}:`, ytErr);
        }
      }

      if (coverUrl) {
        const cachedPath = await downloadAndCacheCover(track.id, coverUrl);
        if (cachedPath) {
          track.coverUri = cachedPath;
          saveTrack(track);
          foundCount++;
        }
      }
    } catch (err) {
      console.warn(`Error al descargar portada faltante para ${track.title}:`, err);
    }
    
    if (onProgress) {
      onProgress(i + 1, missingCoverTracks.length, foundCount);
    }
  }
  
  return foundCount;
}
