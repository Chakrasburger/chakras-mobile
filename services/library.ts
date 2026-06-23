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

export function savePlaylist(id: string, name: string, createdAt: number) {
  if (isWeb) return;
  const stmt = db!.prepareSync(`INSERT OR REPLACE INTO playlists (id, name, createdAt) VALUES (?, ?, ?)`);
  try {
    stmt.executeSync([id, name, createdAt]);
  } finally {
    stmt.finalizeSync();
  }
}

export function deletePlaylist(id: string) {
  if (isWeb) return;
  const stmt = db!.prepareSync(`DELETE FROM playlists WHERE id = ?`);
  try {
    stmt.executeSync([id]);
  } finally {
    stmt.finalizeSync();
  }
}

export function addTrackToPlaylistDb(playlistId: string, trackId: string, position: number) {
  if (isWeb) return;
  const stmt = db!.prepareSync(`INSERT OR REPLACE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)`);
  try {
    stmt.executeSync([playlistId, trackId, position]);
  } finally {
    stmt.finalizeSync();
  }
}

export function removeTrackFromPlaylistDb(playlistId: string, trackId: string) {
  if (isWeb) return;
  const stmt = db!.prepareSync(`DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?`);
  try {
    stmt.executeSync([playlistId, trackId]);
  } finally {
    stmt.finalizeSync();
  }
}

export function getAllPlaylists(): any[] {
  if (isWeb) return [];
  const plStmt = db!.prepareSync('SELECT * FROM playlists ORDER BY createdAt DESC');
  try {
    const plResult = plStmt.executeSync();
    const playlists = plResult.getAllSync() as any[];
    
    return playlists.map(p => {
      const tracksStmt = db!.prepareSync(`
        SELECT t.* FROM tracks t 
        INNER JOIN playlist_tracks pt ON t.id = pt.track_id 
        WHERE pt.playlist_id = ? 
        ORDER BY pt.position ASC
      `);
      try {
        const tracksResult = tracksStmt.executeSync([p.id]);
        const tracks = tracksResult.getAllSync() as any[];
        return {
          id: p.id,
          name: p.name,
          createdAt: p.createdAt,
          tracks: tracks.map(r => ({
            ...r,
            isFavorite: r.isFavorite === 1
          }))
        };
      } finally {
        tracksStmt.finalizeSync();
      }
    });
  } finally {
    plStmt.finalizeSync();
  }
}

