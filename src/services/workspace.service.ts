import { api } from './api-client';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export async function getWorkspaces() {
  return api.get<any[]>('/organizations');
}

export async function getWorkspaceById(id: string) {
  return api.get<any>(`/organizations/${id}`);
}

export async function getWorkspaceMembers(orgId: string) {
  return api.get<any[]>(`/organizations/${orgId}/members`);
}

export interface InviteResponse {
  alreadyMember: boolean;
  emailSent?: boolean;
  emailError?: string | null;
  token?: string;
  inviteUrl?: string;
  message: string;
}

export async function inviteMember(orgId: string, email: string, role?: string) {
  return api.post<InviteResponse>(`/organizations/${orgId}/invite`, { email, role });
}

export async function createWorkspace(name: string) {
  return api.post(`/organizations`, { name });
}

export async function updateWorkspace(id: string, name: string) {
  return api.patch(`/organizations/${id}`, { name });
}

export async function deleteWorkspace(id: string) {
  return api.delete(`/organizations/${id}`);
}

/** O proprio usuario sai do workspace. Bloqueia se for o unico OWNER. */
export async function leaveWorkspace(orgId: string) {
  return api.post<{ success: boolean; nextOrgId?: string | null }>(`/organizations/${orgId}/leave`, {});
}

/** OWNER/ADMIN remove outro membro do workspace. */
export async function removeWorkspaceMember(orgId: string, memberId: string) {
  return api.delete<{ success: boolean }>(`/organizations/${orgId}/members/${memberId}`);
}

/** OWNER/ADMIN altera o cargo de um membro. */
export async function updateMemberRole(orgId: string, memberId: string, role: WorkspaceRole) {
  return api.patch(`/organizations/${orgId}/members/${memberId}/role`, { role });
}

// ======== INVITE LINK ========

export async function generateInviteLink(orgId: string, role?: string, expiresInDays?: number) {
  return api.post<{ id: string; token: string; expiresAt: string }>(`/organizations/${orgId}/invite-link`, { role, expiresInDays });
}

export async function getInviteLinks(orgId: string) {
  return api.get<any[]>(`/organizations/${orgId}/invite-links`);
}

export async function revokeInviteLink(orgId: string, linkId: string) {
  return api.delete(`/organizations/${orgId}/invite-link/${linkId}`);
}

export async function validateInviteToken(token: string) {
  return api.get<{
    valid: boolean;
    orgName?: string;
    orgId?: string;
    role?: string;
    roleLabel?: string;
    invitedBy?: string;
    invitedEmailMasked?: string | null;
    reason?: string;
  }>(`/invites/${token}`);
}

export async function acceptInvite(token: string) {
  return api.post<{ alreadyMember: boolean; orgId: string; orgName: string; role?: string }>(`/invites/${token}/accept`);
}
