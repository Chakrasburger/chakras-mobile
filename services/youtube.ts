import axios from 'axios';

export interface YouTubeResult {
  videoId: string;
  title: string;
  author: string;
  lengthSeconds: number;
  viewCount: number;
  thumbnail: string;
}

// Fallback list of public Invidious instances
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.flokinet.to',
  'https://iv.melmac.space',
  'https://invidious.lunar.icu'
];

export async function searchVideos(query: string): Promise<YouTubeResult[]> {
  let lastError = null;
  
  // Try instances sequentially until one works
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const response = await axios.get(`${instance}/api/v1/search`, {
        params: {
          q: query,
          type: 'video'
        },
        timeout: 5000 // 5 second timeout per instance
      });

      if (response.data && Array.isArray(response.data)) {
        return response.data.map((item: any) => ({
          videoId: item.videoId,
          title: item.title,
          author: item.author,
          lengthSeconds: item.lengthSeconds,
          viewCount: item.viewCount,
          thumbnail: item.videoThumbnails?.[0]?.url || 
                     `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
        }));
      }
    } catch (error) {
      console.warn(`Failed fetching from ${instance}:`, error);
      lastError = error;
      // Continue to next instance
    }
  }

  throw new Error('No se pudo conectar a los servidores de búsqueda (Invidious). Intenta más tarde.');
}
