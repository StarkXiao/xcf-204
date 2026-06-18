import axios from 'axios';
import { Character, Event, Mission, LoginResponse, Worldview, LevelHistory, EventCharacter, MissionExtensionRequest, DuplicateCheckResponse, MissionChangeLog, BatchAssignResult, BatchPriorityResult, BatchDueDateResult, BatchOperationResponse, RiskStats, LevelEscalation } from '../types';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }).then((res) => res.data),
  register: (username: string, password: string) =>
    api.post('/auth/register', { username, password }).then((res) => res.data),
  getProfile: () => api.get('/auth/profile').then((res) => res.data),
};

export const characterAPI = {
  getAll: () => api.get<Character[]>('/characters').then((res) => res.data),
  getById: (id: number) => api.get<Character>(`/characters/${id}`).then((res) => res.data),
  create: (data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<Character>('/characters', data).then((res) => res.data),
  update: (id: number, data: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.put<Character>(`/characters/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/characters/${id}`).then((res) => res.data),
  getLevelHistories: (characterId: number) =>
    api.get<LevelHistory[]>(`/characters/${characterId}/level-histories`).then((res) => res.data),
  createLevelHistory: (characterId: number, data: Omit<LevelHistory, 'id' | 'characterId' | 'createdAt' | 'event' | 'mission'>) =>
    api.post<LevelHistory>(`/characters/${characterId}/level-histories`, data).then((res) => res.data),
};

export const eventAPI = {
  getAll: () => api.get<Event[]>('/events').then((res) => res.data),
  getById: (id: number) => api.get<Event>(`/events/${id}`).then((res) => res.data),
  create: (data: any) => api.post<Event>('/events', data).then((res) => res.data),
  update: (id: number, data: any) => api.put<Event>(`/events/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/events/${id}`).then((res) => res.data),
  updateCharacterRole: (eventId: number, characterId: number, data: {
    role?: string;
    contribution?: string;
    missionResult?: string;
    collaboration?: string;
  }) => api.put<EventCharacter>(`/events/${eventId}/characters/${characterId}/role`, data).then((res) => res.data),
  autoUpdateConclusion: (id: number, autoUpdate: boolean = true) =>
    api.post<Event>(`/events/${id}/auto-update-conclusion`, { autoUpdateConclusion: autoUpdate }).then((res) => res.data),
  checkDuplicates: (data: { title: string; date: string; location: string; excludeId?: number; threshold?: number }) =>
    api.post<DuplicateCheckResponse>('/events/check-duplicates', data).then((res) => res.data),
  getRiskStats: () => api.get<RiskStats>('/events/risk-stats').then((res) => res.data),
  getEscalations: () => api.get<LevelEscalation[]>('/events/escalations').then((res) => res.data),
};

export const missionAPI = {
  getAll: () => api.get<Mission[]>('/missions').then((res) => res.data),
  getById: (id: number) => api.get<Mission>(`/missions/${id}`).then((res) => res.data),
  create: (data: any) => api.post<Mission>('/missions', data).then((res) => res.data),
  update: (id: number, data: any) => api.put<Mission>(`/missions/${id}`, data).then((res) => res.data),
  delete: (id: number) => api.delete(`/missions/${id}`).then((res) => res.data),
  getChangeLogs: (id: number) => api.get<MissionChangeLog[]>(`/missions/${id}/change-logs`).then((res) => res.data),
  batchAssignCharacters: (data: { missionIds: number[]; characterIds: number[]; replaceExisting?: boolean }) =>
    api.post<BatchOperationResponse<BatchAssignResult>>('/missions/batch/assign', data).then((res) => res.data),
  batchUpdatePriority: (data: { missionIds: number[]; priority: string }) =>
    api.post<BatchOperationResponse<BatchPriorityResult>>('/missions/batch/priority', data).then((res) => res.data),
  batchUpdateDueDate: (data: { missionIds: number[]; dueDate: string }) =>
    api.post<BatchOperationResponse<BatchDueDateResult>>('/missions/batch/due-date', data).then((res) => res.data),
};

export const missionExtensionAPI = {
  getAll: () => api.get<MissionExtensionRequest[]>('/mission-extensions').then((res) => res.data),
  getPending: () => api.get<MissionExtensionRequest[]>('/mission-extensions/pending').then((res) => res.data),
  getPendingCount: () => api.get<{ count: number }>('/mission-extensions/pending/count').then((res) => res.data),
  getById: (id: number) => api.get<MissionExtensionRequest>(`/mission-extensions/${id}`).then((res) => res.data),
  create: (data: { missionId: number; requestedDueDate: string; reason: string }) =>
    api.post<MissionExtensionRequest>('/mission-extensions', data).then((res) => res.data),
  approve: (id: number, data: { status: '已批准' | '已拒绝'; approvalComment?: string }) =>
    api.put<{ request: MissionExtensionRequest; mission: Mission | null }>(`/mission-extensions/${id}/approve`, data).then((res) => res.data),
  getByMissionId: (missionId: number) =>
    api.get<MissionExtensionRequest[]>(`/mission-extensions/mission/${missionId}`).then((res) => res.data),
};

export const worldviewAPI = {
  get: () => api.get<Worldview>('/worldview').then((res) => res.data),
};

export default api;
