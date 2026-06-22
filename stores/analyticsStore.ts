import { create } from 'zustand';
import { Track } from './playerStore';

export interface PlayHistoryItem {
  trackId: string;
  timestamp: number;
}

interface AnalyticsState {
  totalPlays: number;
  totalMinutes: number;
  playHistory: PlayHistoryItem[];
  
  recordPlay: (track: Track) => void;
  getTopArtists: (limit: number) => { name: string; plays: number }[];
  getTopTracks: (limit: number, allTracks: Track[]) => { track: Track; plays: number }[];
  getWeeklyActivity: () => number[]; // 7 items (Mon-Sun)
  getHourlyActivity: () => number[]; // 24 items (0-23)
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  totalPlays: 0,
  totalMinutes: 0,
  playHistory: [],
  
  recordPlay: (track) => set((state) => {
    const newHistory = [...state.playHistory, { trackId: track.id, timestamp: Date.now() }];
    // Keep last 10000 records to avoid memory bloat
    if (newHistory.length > 10000) newHistory.shift();
    
    return {
      totalPlays: state.totalPlays + 1,
      totalMinutes: state.totalMinutes + Math.floor(track.duration / 60),
      playHistory: newHistory
    };
  }),
  
  // Note: These getters would ideally be computed properties or memoized hooks in a real app,
  // but for simplicity we expose them as methods here.
  getTopArtists: (limit) => {
    // We would need the full track list to correlate trackId to artist name.
    // Assuming we have that in libraryStore, this would be computed there.
    // For now, this is a placeholder.
    return [];
  },
  
  getTopTracks: (limit, allTracks) => {
    const counts: Record<string, number> = {};
    get().playHistory.forEach(h => {
      counts[h.trackId] = (counts[h.trackId] || 0) + 1;
    });
    
    const sortedIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const topTracks = [];
    
    for (const id of sortedIds) {
      if (topTracks.length >= limit) break;
      const track = allTracks.find(t => t.id === id);
      if (track) {
        topTracks.push({ track, plays: counts[id] });
      }
    }
    
    return topTracks;
  },
  
  getWeeklyActivity: () => {
    const activity = Array(7).fill(0);
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    get().playHistory.forEach(h => {
      if (h.timestamp >= oneWeekAgo) {
        // 0 is Sunday, we want 0 to be Monday
        const date = new Date(h.timestamp);
        const day = date.getDay() === 0 ? 6 : date.getDay() - 1;
        activity[day]++;
      }
    });
    
    return activity;
  },
  
  getHourlyActivity: () => {
    const activity = Array(24).fill(0);
    get().playHistory.forEach(h => {
      const hour = new Date(h.timestamp).getHours();
      activity[hour]++;
    });
    return activity;
  }
}));
