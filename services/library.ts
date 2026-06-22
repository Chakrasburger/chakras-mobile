import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { Track } from '../stores/playerStore';

const isWeb = Platform.OS === 'web';
let mockTracks: Track[] = [];

export const db = isWeb ? null : SQLite.openDatabaseSync('chakras_library.db');

export function initDatabase() {
  if (isWeb) return;
  db!.execSync(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT NOT NULL,
      duration INTEGER NOT NULL,
      uri TEXT NOT NULL,
      coverUri TEXT,
      genre TEXT,
      year INTEGER,
      playCount INTEGER DEFAULT 0,
      lastPlayed INTEGER,
      addedAt INTEGER NOT NULL,
      isFavorite INTEGER DEFAULT 0
    );
    
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      playlist_id TEXT,
      track_id TEXT,
      position INTEGER,
      PRIMARY KEY (playlist_id, track_id),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );
  `);
  try {
    db!.execSync('ALTER TABLE tracks ADD COLUMN isFavorite INTEGER DEFAULT 0;');
  } catch (err) {
    // Ignore error if column already exists
  }
}

export function saveTrack(track: Track) {
  if (isWeb) {
    const idx = mockTracks.findIndex(t => t.id === track.id);
    if (idx >= 0) {
      mockTracks[idx] = track;
    } else {
      mockTracks.push(track);
    }
    return;
  }
  const statement = db!.prepareSync(
    `INSERT OR REPLACE INTO tracks 
    (id, title, artist, album, duration, uri, coverUri, genre, year, playCount, lastPlayed, addedAt, isFavorite) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  
  try {
    statement.executeSync([
      track.id, track.title, track.artist, track.album, track.duration, 
      track.uri, track.coverUri, track.genre || null, track.year || null, 
      track.playCount, track.lastPlayed || null, track.addedAt, track.isFavorite ? 1 : 0
    ]);
  } finally {
    statement.finalizeSync();
  }
}

export function getAllTracks(): Track[] {
  if (isWeb) {
    return mockTracks;
  }
  const statement = db!.prepareSync('SELECT * FROM tracks ORDER BY title ASC');
  try {
    const result = statement.executeSync();
    const rows = result.getAllSync() as any[];
    return rows.map(r => ({
      ...r,
      isFavorite: r.isFavorite === 1
    })) as Track[];
  } finally {
    statement.finalizeSync();
  }
}

export function clearAllTables() {
  if (isWeb) {
    mockTracks = [];
    return;
  }
  db!.execSync(`
    DELETE FROM tracks;
    DELETE FROM playlists;
    DELETE FROM playlist_tracks;
    VACUUM;
  `);
}
