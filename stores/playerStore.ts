import { create } from 'zustand';

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

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
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
  
  play: (track?: Track) => void;
  pause: () => void;
  togglePlayPause: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (position: number) => void;
  setVolume: (volume: number) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  setEqBand: (index: number, value: number) => void;
  setEqPreset: (preset: string) => void;
  setCrossfade: (duration: number) => void;
  updatePosition: (position: number) => void;
  updateDuration: (duration: number) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
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
  
  play: (track?: Track) => {
    if (track) {
      set({ currentTrack: track, isPlaying: true });
    } else {
      set({ isPlaying: true });
    }
  },
  pause: () => set({ isPlaying: false }),
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  next: () => {
    const { queue, queueIndex, repeatMode } = get();
    if (queue.length === 0) return;
    
    let nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return; // End of queue
      }
    }
    
    set({
      queueIndex: nextIndex,
      currentTrack: queue[nextIndex],
      isPlaying: true,
      position: 0,
    });
  },
  previous: () => {
    const { queue, queueIndex } = get();
    if (queue.length === 0 || queueIndex <= 0) return;
    
    const prevIndex = queueIndex - 1;
    set({
      queueIndex: prevIndex,
      currentTrack: queue[prevIndex],
      isPlaying: true,
      position: 0,
    });
  },
  seekTo: (position) => set({ position }),
  setVolume: (volume) => set({ volume }),
  setQueue: (tracks, startIndex = 0) => set({
    queue: tracks,
    queueIndex: startIndex,
    currentTrack: tracks[startIndex] || null,
  }),
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  removeFromQueue: (index) => set((state) => {
    const newQueue = [...state.queue];
    newQueue.splice(index, 1);
    
    let newIndex = state.queueIndex;
    if (index < state.queueIndex) {
      newIndex--;
    }
    
    return { queue: newQueue, queueIndex: newIndex };
  }),
  toggleShuffle: () => set((state) => ({ shuffleEnabled: !state.shuffleEnabled })),
  cycleRepeatMode: () => set((state) => {
    const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
    const nextMode = modes[(modes.indexOf(state.repeatMode) + 1) % modes.length];
    return { repeatMode: nextMode };
  }),
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
