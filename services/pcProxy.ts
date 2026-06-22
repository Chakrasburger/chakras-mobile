import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { useSettingsStore } from '../stores/settingsStore';

// El puerto por defecto del servidor Python de ChakrasPlayer
const DEFAULT_PORT = 5888;

class PCProxyService {
  private getBaseUrl(): string {
    // Obtenemos la IP guardada en configuraciones o usamos localhost como fallback
    const pcIp = useSettingsStore.getState().pcIp || '192.168.1.100';
    return `http://${pcIp}:${DEFAULT_PORT}/api`;
  }

  /**
   * Busca en YouTube a través del PC (usa yt-dlp)
   */
  async searchYouTube(query: string) {
    try {
      const response = await axios.post(`${this.getBaseUrl()}/download`, {
        action: 'search',
        query
      });
      return response.data.results || [];
    } catch (error) {
      console.error('Error buscando en PC Proxy:', error);
      throw new Error('No se pudo conectar al PC para buscar.');
    }
  }

  /**
   * Pide al PC que descargue el audio y luego lo transfiere al móvil
   */
  async downloadAudio(videoId: string, title: string, onProgress: (progress: number) => void) {
    try {
      // 1. Pedir al PC que descargue de YouTube
      const downloadRes = await axios.post(`${this.getBaseUrl()}/download`, {
        action: 'download',
        url: `https://youtube.com/watch?v=${videoId}`
      });

      if (!downloadRes.data.success) {
        throw new Error('El PC no pudo descargar el archivo.');
      }

      // El PC devuelve la ruta o el nombre del archivo descargado
      const filename = downloadRes.data.filename || `${title}.mp3`;
      
      // 2. Transferir del PC al Móvil
      const fileUrl = `${this.getBaseUrl()}/file?path=${encodeURIComponent(downloadRes.data.path)}`;
      const localUri = `${FileSystem.documentDirectory}Music/${filename}`;
      
      // Asegurar que la carpeta exista
      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}Music/`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}Music/`, { intermediates: true });
      }

      // Descargar el archivo al móvil
      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        localUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          onProgress(progress * 100);
        }
      );

      const result = await downloadResumable.downloadAsync();
      return result?.uri;
      
    } catch (error) {
      console.error('Error en el flujo de descarga proxy:', error);
      throw error;
    }
  }
}

export const pcProxy = new PCProxyService();
