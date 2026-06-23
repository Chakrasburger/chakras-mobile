import { create } from 'zustand';
import { Track } from './playerStore';

export interface Album {
  id: string;
  name: string;
  artist: string;
  coverUri: string | null;
  trackCount: number;
  tracks: Track[];
}

export interface Artist {
  id: string;
  name: string;
  albumCount: number;
  trackCount: number;
  coverUri: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

interface LibraryState {
  songs: Track[];
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  isScanning: boolean;
  searchQuery: string;
  sortBy: 'title' | 'artist' | 'album' | 'dateAdded' | 'playCount';
  sortOrder: 'asc' | 'desc';
  
  setSongs: (songs: Track[]) => void;
  addSong: (song: Track) => void;
  removeSong: (id: string) => void;
  updateSong: (id: string, updates: Partial<Track>) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: LibraryState['sortBy'], order?: 'asc' | 'desc') => void;
  getFilteredSongs: () => Track[];
  
  // Playlist actions
  addPlaylist: (name: string) => void;
  removePlaylist: (id: string) => void;
  addTrackToPlaylist: (playlistId: string, track: Track) => void;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  setPlaylists: (playlists: Playlist[]) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  songs: [],
  albums: [],
  artists: [],
  playlists: [],
  isScanning: false,
  searchQuery: '',
  sortBy: 'title',
  sortOrder: 'asc',

  setSongs: (songs) => {
    // Derive unique albums and artists lists
    const albumsMap = new Map<string, Track[]>();
    const artistsMap = new Map<string, Set<string>>(); // artist -> set of album names
    const artistTracksCount = new Map<string, number>();

    songs.forEach(track => {
      // Albums derivation
      const albumKey = `${track.album} - ${track.artist}`;
      if (!albumsMap.has(albumKey)) {
        albumsMap.set(albumKey, []);
      }
      albumsMap.get(albumKey)!.push(track);

      // Artists derivation
      if (!artistsMap.has(track.artist)) {
        artistsMap.set(track.artist, new Set());
        artistTracksCount.set(track.artist, 0);
      }
      artistsMap.get(track.artist)!.add(track.album);
      artistTracksCount.set(track.artist, artistTracksCount.get(track.artist)! + 1);
    });

    const derivedAlbums: Album[] = Array.from(albumsMap.entries()).map(([key, albumSongs]) => ({
      id: key,
      name: albumSongs[0].album,
      artist: albumSongs[0].artist,
      coverUri: albumSongs[0].coverUri,
      trackCount: albumSongs.length,
      tracks: albumSongs
    }));

    const derivedArtists: Artist[] = Array.from(artistsMap.entries()).map(([artistName, albumsSet]) => ({
      id: artistName,
      name: artistName,
      albumCount: albumsSet.size,
      trackCount: artistTracksCount.get(artistName) || 0,
      coverUri: null
    }));

    set({ 
      songs, 
      albums: derivedAlbums, 
      artists: derivedArtists 
    });
  },
  
  addSong: (song) => {
    const currentSongs = [...get().songs, song];
    get().setSongs(currentSongs);
  },
  
  removeSong: (id) => {
    const currentSongs = get().songs.filter((s) => s.id !== id);
    get().setSongs(currentSongs);
  },
  
  updateSong: (id, updates) => {
    const currentSongs = get().songs.map((s) => (s.id === id ? { ...s, ...updates } : s));
    get().setSongs(currentSongs);
  },
  
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  
  setSortBy: (sortBy, order) => set((state) => ({
    sortBy,
    sortOrder: order || (state.sortBy === sortBy && state.sortOrder === 'asc' ? 'desc' : 'asc'),
  })),
  
  getFilteredSongs: () => {
    const { songs, searchQuery, sortBy, sortOrder } = get();
    
    let filtered = songs;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = songs.filter(
        (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q) || s.album.toLowerCase().includes(q)
      );
    }
    
    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'artist':
          comparison = a.artist.localeCompare(b.artist);
          break;
        case 'album':
          comparison = a.album.localeCompare(b.album);
          break;
        case 'dateAdded':
          comparison = a.addedAt - b.addedAt;
          break;
        case 'playCount':
          comparison = a.playCount - b.playCount;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  },

  addPlaylist: (name) => {
    const id = Date.now().toString();
    const createdAt = Date.now();
    try {
      const { savePlaylist } = require('../services/library');
      savePlaylist(id, name, createdAt);
    } catch (e) {
      console.warn('Error saving playlist to SQLite:', e);
    }
    set((state) => ({
      playlists: [...state.playlists, {
        id,
        name,
        tracks: [],
        createdAt
      }]
    }));
  },

  removePlaylist: (id) => {
    try {
      const { deletePlaylist } = require('../services/library');
      deletePlaylist(id);
    } catch (e) {
      console.warn('Error deleting playlist from SQLite:', e);
    }
    set((state) => ({
      playlists: state.playlists.filter(p => p.id !== id)
    }));
  },

  addTrackToPlaylist: (playlistId, track) => {
    try {
      const { saveTrack, addTrackToPlaylistDb } = require('../services/library');
      // Save track first to ensure SQLite integrity / foreign key constraint
      saveTrack(track);
      // For simplicity, position is tracks.length
      const playlist = get().playlists.find(p => p.id === playlistId);
      const position = playlist ? playlist.tracks.length : 0;
      addTrackToPlaylistDb(playlistId, track.id, position);
    } catch (e) {
      console.warn('Error adding track to playlist in SQLite:', e);
    }
    set((state) => ({
      playlists: state.playlists.map(p => {
        if (p.id === playlistId && !p.tracks.some(t => t.id === track.id)) {
          return { ...p, tracks: [...p.tracks, track] };
        }
        return p;
      })
    }));
  },

  removeTrackFromPlaylist: (playlistId, trackId) => {
    try {
      const { removeTrackFromPlaylistDb } = require('../services/library');
      removeTrackFromPlaylistDb(playlistId, trackId);
    } catch (e) {
      console.warn('Error removing track from playlist in SQLite:', e);
    }
    set((state) => ({
      playlists: state.playlists.map(p => {
        if (p.id === playlistId) {
          return { ...p, tracks: p.tracks.filter(t => t.id !== trackId) };
        }
        return p;
      })
    }));
  },

  setPlaylists: (playlists) => set({ playlists }),
}));
