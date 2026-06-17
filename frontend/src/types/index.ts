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

export const isAssignableStatus = (status: string): boolean => {
  return ASSIGNABLE_STATUSES.includes(status as CharacterStatus);
};

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
  extensionRequests?: MissionExtensionRequest[];
}

export interface MissionExtensionRequest {
  id: number;
  missionId: number;
  mission?: Mission;
  applicantId: number;
  applicant: Character;
  approverId?: number;
  approver?: Character;
  originalDueDate: string;
  requestedDueDate: string;
  reason: string;
  status: string;
  approvalComment?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
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

export interface DuplicateEventResult {
  event: Event;
  similarity: {
    title: number;
    date: number;
    location: number;
    overall: number;
  };
  matchReasons: string[];
}

export interface DuplicateCheckResponse {
  duplicates: DuplicateEventResult[];
  total: number;
  threshold: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}
