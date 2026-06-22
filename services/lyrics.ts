import axios from 'axios';

export interface LRCLine {
  time: number; // in seconds
  text: string;
}

export async function fetchSyncedLyrics(
  title: string,
  artist: string,
  album?: string,
  duration?: number
): Promise<LRCLine[] | null> {
  try {
    // 1. Try search API
    const searchRes = await axios.get('https://lrclib.net/api/search', {
      params: { track_name: title, artist_name: artist }
    });
    
    if (searchRes.data && searchRes.data.length > 0) {
      // Find the first result with synced lyrics
      const bestMatch = searchRes.data.find((t: any) => t.syncedLyrics);
      if (bestMatch && bestMatch.syncedLyrics) {
        return parseLRC(bestMatch.syncedLyrics);
      }
    }
    
    // 2. Fallback to get API
    const getParams: any = { track_name: title, artist_name: artist };
    if (album) getParams.album_name = album;
    if (duration) getParams.duration = Math.round(duration);
    
    const getRes = await axios.get('https://lrclib.net/api/get', { params: getParams });
    if (getRes.data && getRes.data.syncedLyrics) {
      return parseLRC(getRes.data.syncedLyrics);
    }
    
    return null;
  } catch (error) {
    console.warn('Error fetching synced lyrics:', error);
    return null;
  }
}

export async function fetchPlainLyrics(title: string, artist: string): Promise<string | null> {
  try {
    const res = await axios.get('https://lrclib.net/api/search', {
      params: { track_name: title, artist_name: artist }
    });
    
    if (res.data && res.data.length > 0) {
      return res.data[0].plainLyrics || null;
    }
    return null;
  } catch (error) {
    console.warn('Error fetching plain lyrics:', error);
    return null;
  }
}

export function parseLRC(lrcContent: string): LRCLine[] {
  const lines = lrcContent.split('\n');
  const parsed: LRCLine[] = [];
  
  // Regex to match [mm:ss.xx] or [mm:ss.xxx]
  const timeRegex = /\[(\d{2,}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  
  for (const line of lines) {
    let match;
    const times: number[] = [];
    
    // Extract all timestamps in the line (there can be multiple)
    while ((match = timeRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      let milliseconds = 0;
      if (match[3]) {
        milliseconds = parseInt(match[3], 10) * (match[3].length === 2 ? 10 : 1);
      }
      times.push(minutes * 60 + seconds + milliseconds / 1000);
    }
    
    if (times.length > 0) {
      // Remove all timestamps from the line to get the text
      const text = line.replace(timeRegex, '').trim();
      for (const time of times) {
        parsed.push({ time, text });
      }
    }
  }
  
  // Sort by time
  return parsed.sort((a, b) => a.time - b.time);
}
