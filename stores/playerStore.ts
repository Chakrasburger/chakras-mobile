import { create } from 'zustand';
import TrackPlayer, { RepeatMode, State } from 'react-native-track-player';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  uri: string;
  coverUri: string | null;
  genre?: string;
  year?: number;
  playCount: number;
  lastPlayed?: number;
  addedAt: number;
  isFavorite?: boolean;
}

export const EQ_PRESETS: Record<string, number[]> = {
  'Manual': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 3, 0, 0, 0, 0, 0, 0],
  'Electronic': [4, 3, 1, 0, -2, 2, 1, 3, 4, 5],
  'Vocal': [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
  'Dance': [6, 4, 2, 0, 0, -1, -1, 0, 2, 4],
  'Acoustic': [2, 2, 1, 0, 0, 0, 1, 2, 2, 1],
};

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  originalQueue: Track[];
  queueIndex: number;
  
  isPlaying: boolean;
  position: number;
  duration: number;
  volume: number;
  
  shuffleEnabled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  crossfadeDuration: number;
  
  eqEnabled: boolean;
  eqPreset: string;
  eqBands: number[];
  
  play: (track?: Track) => Promise<void>;
  pause: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  toggleShuffle: () => Promise<void>;
  cycleRepeatMode: () => Promise<void>;
  setEqBand: (index: number, value: number) => void;
  setEqPreset: (preset: string) => void;
  setCrossfade: (duration: number) => void;
  updatePosition: (position: number) => void;
  updateDuration: (duration: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  originalQueue: [],
  queueIndex: -1,
  
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 1,
  
  shuffleEnabled: false,
  repeatMode: 'off',
  crossfadeDuration: 5,
  
  eqEnabled: false,
  eqPreset: 'Flat',
  eqBands: EQ_PRESETS['Flat'],
  
  play: async (track?: Track) => {
    if (track) {
      const { queue } = get();
      const idx = queue.findIndex(t => t.id === track.id);
      if (idx !== -1) {
        await TrackPlayer.skip(idx);
      }
    }
    await TrackPlayer.play();
    set({ isPlaying: true });
  },
  pause: async () => {
    await TrackPlayer.pause();
    set({ isPlaying: false });
  },
  togglePlayPause: async () => {
    const { isPlaying } = get();
    if (isPlaying) {
      await TrackPlayer.pause();
      set({ isPlaying: false });
    } else {
      await TrackPlayer.play();
      set({ isPlaying: true });
    }
  },
  next: async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch (err) {
      console.warn('next track error:', err);
    }
  },
  previous: async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch (err) {
      console.warn('previous track error:', err);
    }
  },
  seekTo: async (position) => {
    await TrackPlayer.seekTo(position);
    set({ position });
  },
  setVolume: async (volume) => {
    await TrackPlayer.setVolume(volume);
    set({ volume });
  },
  setQueue: (tracks, startIndex = 0) => set({
    queue: tracks,
    originalQueue: tracks,
    queueIndex: startIndex,
    currentTrack: tracks[startIndex] || null,
  }),
  addToQueue: (track) => set((state) => ({ 
    queue: [...state.queue, track],
    originalQueue: [...state.originalQueue, track]
  })),
  removeFromQueue: (index) => set((state) => {
    const newQueue = [...state.queue];
    newQueue.splice(index, 1);
    
    let newIndex = state.queueIndex;
    if (index < state.queueIndex) {
      newIndex--;
    }
    
    const trackToRemove = state.queue[index];
    const newOriginal = state.originalQueue.filter(t => t.id !== trackToRemove.id);
    
    return { 
      queue: newQueue, 
      queueIndex: newIndex,
      originalQueue: newOriginal
    };
  }),
  toggleShuffle: async () => {
    const { shuffleEnabled, queue, originalQueue, currentTrack } = get();
    const newShuffleState = !shuffleEnabled;

    if (!currentTrack) {
      set({ shuffleEnabled: newShuffleState });
      return;
    }

    let newQueue = [...originalQueue];

    if (newShuffleState) {
      const otherTracks = originalQueue.filter(t => t.id !== currentTrack.id);
      const shuffledOthers = shuffleArray(otherTracks);
      newQueue = [currentTrack, ...shuffledOthers];
    }

    const newIndex = newQueue.findIndex(t => t.id === currentTrack.id);
    set({
      shuffleEnabled: newShuffleState,
      queue: newQueue,
      queueIndex: newIndex !== -1 ? newIndex : 0
    });

    try {
      const playerQueue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      
      if (typeof activeIndex === 'number' && activeIndex >= 0 && playerQueue.length > 0) {
        const activeTrack = playerQueue[activeIndex];
        
        // Remove all other tracks from the queue
        const indicesToRemove = playerQueue
          .map((_, index) => index)
          .filter(index => index !== activeIndex);
          
        if (indicesToRemove.length > 0) {
          await TrackPlayer.remove(indicesToRemove);
        }
        
        // Add the rest in the new order
        const remainingTracks = newQueue.filter(t => t.id !== activeTrack.id);
        if (remainingTracks.length > 0) {
          await TrackPlayer.add(remainingTracks.map(s => ({
            id: s.id,
            url: s.uri,
            title: s.title,
            artist: s.artist,
            artwork: s.coverUri || undefined,
            duration: s.duration,
          })));
        }
      } else {
        // Fallback if no active track is loaded yet
        await TrackPlayer.reset();
        await TrackPlayer.add(newQueue.map(s => ({
          id: s.id,
          url: s.uri,
          title: s.title,
          artist: s.artist,
          artwork: s.coverUri || undefined,
          duration: s.duration,
        })));
      }
    } catch (err) {
      console.warn('Error applying shuffle to TrackPlayer:', err);
    }
  },
  cycleRepeatMode: async () => {
    const { repeatMode } = get();
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
    
    set({ repeatMode: nextMode });

    try {
      const trackPlayerRepeatModes = {
        off: RepeatMode.Off,
        all: RepeatMode.Queue,
        one: RepeatMode.Track,
      };
      await TrackPlayer.setRepeatMode(trackPlayerRepeatModes[nextMode]);
    } catch (err) {
      console.warn('Error setting repeat mode on TrackPlayer:', err);
    }
  },
  setEqBand: (index, value) => set((state) => {
    const newBands = [...state.eqBands];
    newBands[index] = value;
    return { eqBands: newBands, eqPreset: 'Manual' };
  }),
  setEqPreset: (preset) => set({ eqPreset: preset, eqBands: [...EQ_PRESETS[preset]] }),
  setCrossfade: (duration) => set({ crossfadeDuration: duration }),
  updatePosition: (position) => set({ position }),
  updateDuration: (duration) => set({ duration }),
}));

