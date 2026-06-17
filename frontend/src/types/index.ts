export interface User {
  id: number;
  username: string;
  role: string;
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
  createdAt: string;
  updatedAt: string;
  characters?: EventCharacter[];
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  characters?: MissionCharacter[];
}

export interface EventCharacter {
  eventId: number;
  characterId: number;
  role?: string;
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

export interface LoginResponse {
  token: string;
  user: User;
}
