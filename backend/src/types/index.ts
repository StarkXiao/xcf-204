export interface JwtPayload {
  userId: number;
  username: string;
  role: string;
  characterId: number | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CharacterCreate {
  name: string;
  codeName?: string;
  ability: string;
  level: string;
  status: string;
  description?: string;
  avatar?: string;
}

export interface EventCreate {
  title: string;
  type: string;
  level: string;
  date: string;
  location: string;
  description: string;
  result?: string;
  disposalStatus?: string;
  isPublic?: boolean;
  characterIds?: number[];
}

export interface MissionCreate {
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  eventId?: number;
  characterIds?: number[];
}
