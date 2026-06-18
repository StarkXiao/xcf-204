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
  levelEscalations?: LevelEscalation[];
  _escalation?: EscalationNotice;
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

export interface MissionChangeLog {
  id: number;
  missionId: number;
  userId: number | null;
  user: {
    id: number;
    username: string;
    character: {
      name: string;
      avatar: string | null;
    } | null;
  } | null;
  actionType: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  batchId: string | null;
  createdAt: string;
}

export interface BatchAssignResult {
  missionId: number;
  title: string;
  added: string[];
  removed: string[];
}

export interface BatchPriorityResult {
  missionId: number;
  title: string;
  oldPriority: string;
  newPriority: string;
}

export interface BatchDueDateResult {
  missionId: number;
  title: string;
  oldDueDate: string;
  newDueDate: string;
}

export interface BatchOperationResponse<T> {
  message: string;
  batchId: string;
  results: T[];
}

export interface LevelEscalation {
  id: number;
  eventId: number;
  oldLevel: string;
  newLevel: string;
  oldResult?: string | null;
  newResult?: string | null;
  reason: string;
  triggeredMissionId?: number | null;
  triggeredMission?: Mission;
  createdAt: string;
}

export interface EscalationNotice {
  triggered: boolean;
  reason: string;
  missionId: number;
  missionTitle: string;
  oldLevel: string;
  newLevel: string;
}

export interface RiskStats {
  totalEvents: number;
  pendingEvents: number;
  escalatedEvents: number;
  highRiskEvents: number;
  activeMissions: number;
  highPriorityMissions: number;
  riskLevel: '高危' | '警戒' | '关注' | '平稳';
  recentEscalations: Array<{
    id: number;
    eventId: number;
    oldLevel: string;
    newLevel: string;
    oldResult?: string | null;
    newResult?: string | null;
    reason: string;
    triggeredMissionId?: number | null;
    createdAt: string;
    event: {
      id: number;
      title: string;
      level: string;
      disposalStatus: string;
    };
    triggeredMission?: {
      id: number;
      title: string;
      status: string;
    };
  }>;
  levelDistribution: Array<{
    level: string;
    count: number;
  }>;
}

export interface Collaborator {
  character: {
    id: number;
    name: string;
    codeName?: string | null;
    avatar?: string | null;
    level: string;
    ability: string;
    status: string;
  };
  sharedEvents: number;
  sharedMissions: number;
  eventIds: number[];
  missionIds: number[];
  totalCollaborations: number;
}

export interface CollaborationNetwork {
  character: {
    id: number;
    name: string;
    codeName?: string | null;
    avatar?: string | null;
    level: string;
    ability: string;
  };
  totalEvents: number;
  totalMissions: number;
  totalCollaborators: number;
  collaborators: Collaborator[];
}
