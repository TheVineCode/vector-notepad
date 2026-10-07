export interface Note {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  deletedAt: string | null;
}

export interface NewNote {
  id: string;
  body: string;
  now: string;
}
