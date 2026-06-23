import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  theme: 'chakras' | 'oled' | 'light' | 'nord';
  accentColor: string;
  blurIntensity: number;
  glassOpacity: number;
  downloadQuality: '128' | '192' | '320';
  aiProvider: 'gemini' | 'openrouter';
  aiApiKey: string;
  aiModel: string;
  pcIp: string;
  musicFolders: string[];
  crossfadeEnabled: boolean;
  normalizationEnabled: boolean;
  hapticFeedback: boolean;

  setTheme: (theme: 'chakras' | 'oled' | 'light' | 'nord') => void;
  setAccentColor: (color: string) => void;
  setBlurIntensity: (intensity: number) => void;
  setGlassOpacity: (opacity: number) => void;
  setDownloadQuality: (quality: '128' | '192' | '320') => void;
  setAiProvider: (provider: 'gemini' | 'openrouter') => void;
  setAiApiKey: (key: string) => void;
  setAiModel: (model: string) => void;
  setPcIp: (ip: string) => void;
  addMusicFolder: (folder: string) => void;
  removeMusicFolder: (folder: string) => void;
  toggleCrossfade: () => void;
  toggleNormalization: () => void;
  toggleHapticFeedback: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'chakras',
      accentColor: '#5865F2',
      blurIntensity: 80,
      glassOpacity: 0.65,
      downloadQuality: '192',
      aiProvider: 'gemini',
      aiApiKey: '',
      aiModel: 'gemini-1.5-flash',
      pcIp: '192.168.1.100',
      musicFolders: [],
      crossfadeEnabled: true,
      normalizationEnabled: false,
      hapticFeedback: true,

      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setBlurIntensity: (blurIntensity) => set({ blurIntensity }),
      setGlassOpacity: (glassOpacity) => set({ glassOpacity }),
      setDownloadQuality: (downloadQuality) => set({ downloadQuality }),
      setAiProvider: (aiProvider) => set({ aiProvider }),
      setAiApiKey: (aiApiKey) => set({ aiApiKey }),
      setAiModel: (aiModel) => set({ aiModel }),
      setPcIp: (pcIp) => set({ pcIp }),
      addMusicFolder: (folder) => set((state) => ({
          musicFolders: state.musicFolders.includes(folder) ? state.musicFolders : [...state.musicFolders, folder]
      })),
      removeMusicFolder: (folder) => set((state) => ({
          musicFolders: state.musicFolders.filter(f => f !== folder)
      })),
      toggleCrossfade: () => set((state) => ({ crossfadeEnabled: !state.crossfadeEnabled })),
      toggleNormalization: () => set((state) => ({ normalizationEnabled: !state.normalizationEnabled })),
      toggleHapticFeedback: () => set((state) => ({ hapticFeedback: !state.hapticFeedback })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
