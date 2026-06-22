import { create } from 'zustand';

export interface DownloadItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  progress: number; // 0 to 100
  status: 'queued' | 'downloading' | 'converting' | 'done' | 'error';
  error?: string;
}

interface DownloadState {
  downloads: DownloadItem[];
  addDownload: (item: DownloadItem) => void;
  updateProgress: (id: string, progress: number) => void;
  setStatus: (id: string, status: DownloadItem['status'], error?: string) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
}

export const useDownloadStore = create<DownloadState>((set) => ({
  downloads: [],
  
  addDownload: (item) => set((state) => {
    if (state.downloads.find(d => d.id === item.id)) return state;
    return { downloads: [...state.downloads, item] };
  }),
  
  updateProgress: (id, progress) => set((state) => ({
    downloads: state.downloads.map(d => 
      d.id === id ? { ...d, progress, status: progress === 100 ? 'converting' : 'downloading' } : d
    )
  })),
  
  setStatus: (id, status, error) => set((state) => ({
    downloads: state.downloads.map(d => 
      d.id === id ? { ...d, status, error } : d
    )
  })),
  
  removeDownload: (id) => set((state) => ({
    downloads: state.downloads.filter(d => d.id !== id)
  })),
  
  clearCompleted: () => set((state) => ({
    downloads: state.downloads.filter(d => d.status !== 'done' && d.status !== 'error')
  })),
}));
