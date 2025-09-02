
export type MediaKind = 'image' | 'video';

export interface MediaItem {
  id: string;              
  filename: string;        
  originalName: string;    
  mime: string;
  kind: MediaKind;
  size: number;
  createdAt: string;// ISO
}
