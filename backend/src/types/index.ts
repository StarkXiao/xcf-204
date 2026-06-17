export enum CharacterStatus {
  ON_DUTY = '出勤中',
  STANDBY = '待命',
  RECOVERING = '疗养',
  MIA = '失联',
  SERIOUSLY_INJURED = '重伤',
  OFFLINE = '离线',
}

export const ASSIGNABLE_STATUSES: CharacterStatus[] = [
  CharacterStatus.ON_DUTY,
  CharacterStatus.STANDBY,
];

export const UNAVAILABLE_STATUSES: CharacterStatus[] = [
  CharacterStatus.RECOVERING,
  CharacterStatus.MIA,
  CharacterStatus.SERIOUSLY_INJURED,
  CharacterStatus.OFFLINE,
];

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
