import api from './client';

export interface MemberDto {
  personName: string;
  personRole: string;
  jobTitle: string;
}

export interface MeetingDto {
  meetingNumber: number;
  meetingDate?: string;
  hijriDate?: string;
  dayName?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  goalsJson?: string;
  agendaJson?: string;
  decisionsJson?: string;
  notes?: string;
  status?: string;
}

export interface CommitteeMember {
  id: number;
  personName: string;
  personRole: string;
  jobTitle: string;
  sortOrder: number;
}

export interface CommitteeMeeting {
  id: number;
  meetingNumber: number;
  hijriDate: string;
  meetingDate: string;
  dayName: string;
  startTime: string;
  endTime: string;
  location: string;
  goalsJson: string;
  agendaJson: string;
  decisionsJson: string;
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommitteeSummary {
  id: number;
  name: string;
  committeeType: string;
  membersCount: number;
  meetingsCount: number;
  lastMeeting: { meetingNumber: number; hijriDate: string } | null;
  members: CommitteeMember[];
}

export interface CommitteeDetail {
  id: number;
  name: string;
  committeeType: string;
  members: CommitteeMember[];
  meetings: CommitteeMeeting[];
}

export const committeesApi = {
  getAll: () => api.get('/committee').then(r => r.data?.data ?? r.data ?? []),
  get: (id: number) => api.get(`/committee/${id}`).then(r => r.data?.data ?? r.data),
  updateMembers: (id: number, members: MemberDto[]) =>
    api.put(`/committee/${id}/members`, { members }).then(r => r.data),
  getMeetings: (id: number) =>
    api.get(`/committee/${id}/meetings`).then(r => r.data?.data ?? r.data ?? []),
  createMeeting: (id: number, data: MeetingDto) =>
    api.post(`/committee/${id}/meetings`, data).then(r => r.data),
  updateMeeting: (id: number, mid: number, data: MeetingDto) =>
    api.put(`/committee/${id}/meetings/${mid}`, data).then(r => r.data),
  deleteMeeting: (id: number, mid: number) =>
    api.delete(`/committee/${id}/meetings/${mid}`).then(r => r.data),
};
