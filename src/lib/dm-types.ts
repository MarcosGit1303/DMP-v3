export interface ImageItem {
  id: string;
  name: string;
  folder: string;
  size: number;
  type: string;
  lastModified: number;
  // Object URL — recreated on each session, not persisted.
  url: string;
}

export interface ImageMeta {
  id: string;
  name: string;
  folder: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface Track {
  id: string;
  ytId: string;
  title: string;
  url: string;
  addedAt: number;
}

export interface Group {
  id: string;
  name: string;
  trackIds: string[];
}
