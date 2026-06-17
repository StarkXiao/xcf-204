export interface User {
  id: number;
  username: string;
  role: string;
  characterId: number | null;
}

export interface Character {
  id: number;
  name: string;
  codeName?: string;
  ability: string;
  level: string;
  status: string;
  description?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  events?: CharacterEvent[];
  missions?: CharacterMission[];
  levelHistories?: LevelHistory[];
}

export interface Event {
  id: number;
  title: string;
  type: string;
  level: string;
  date: string;
  location: string;
  description: string;
  result?: string;
  disposalStatus: string;
  disposalConclusion?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  characters?: EventCharacter[];
  missions?: Mission[];
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  eventId?: number;
  event?: Event;
  createdAt: string;
  updatedAt: string;
  characters?: MissionCharacter[];
}

export interface EventCharacter {
  eventId: number;
  characterId: number;
  role?: string;
  contribution?: string;
  missionResult?: string;
  collaboration?: string;
  character: Character;
}

export interface MissionCharacter {
  missionId: number;
  characterId: number;
  role?: string;
  character: Character;
}

export interface CharacterEvent {
  eventId: number;
  characterId: number;
  role?: string;
  event: Event;
}

export interface CharacterMission {
  missionId: number;
  characterId: number;
  role?: string;
  mission: Mission;
}

export interface Worldview {
  title: string;
  setting: string;
  stats: {
    registeredCharacters: string;
    totalEvents: string;
    activeMissions: string;
  };
}

export interface LevelHistory {
  id: number;
  characterId: number;
  oldLevel: string;
  newLevel: string;
  reason: string;
  description?: string;
  eventId?: number;
  event?: Event;
  missionId?: number;
  mission?: Mission;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}
