import axios from 'axios';

export interface EnrichedMetadata {
  coverUrl?: string;
  album?: string;
  year?: number;
  genre?: string;
  duration?: number;
}

export async function enrichFromiTunes(title: string, artist: string): Promise<EnrichedMetadata | null> {
  try {
    const term = `${artist} ${title}`.trim().replace(/\s+/g, '+');
    const response = await axios.get('https://itunes.apple.com/search', {
      params: {
        term,
        media: 'music',
        limit: 5,
      },
      timeout: 1200
    });

    if (response.data && response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0]; // Take best match
      
      const metadata: EnrichedMetadata = {};
      
      // Get high-res artwork (replace 100x100 with 600x600)
      if (result.artworkUrl100) {
        metadata.coverUrl = result.artworkUrl100.replace('100x100bb', '600x600bb');
      }
      
      if (result.collectionName) {
        metadata.album = result.collectionName;
      }
      
      if (result.releaseDate) {
        metadata.year = new Date(result.releaseDate).getFullYear();
      }
      
      if (result.primaryGenreName) {
        metadata.genre = result.primaryGenreName;
      }

      if (result.trackTimeMillis) {
        metadata.duration = result.trackTimeMillis / 1000;
      }
      
      return metadata;
    }
    
    return null;
  } catch (error) {
    console.warn('Error fetching metadata from iTunes:', error);
    return null;
  }
}
