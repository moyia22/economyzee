import { publicApi } from './api-client';

export interface RegisterWithEmailCodePayload {
  name: string;
  email: string;
  password: string;
}

export async function registerWithEmailCode(payload: RegisterWithEmailCodePayload) {
  return publicApi.post<{
    success: boolean;
    email: string;
    emailVerificationRequired: boolean;
    message: string;
  }>('/auth/register', payload);
}

export async function loginWithEmailPassword(email: string, password: string) {
  return publicApi.post<{
    accessToken: string;
    userId: string;
    orgId: string;
    role: string;
  }>('/auth/login', { email, password });
}

export async function verifyEmailCode(email: string, code: string) {
  return publicApi.post<{ success: boolean; email: string; message: string }>('/auth/verify-email-code', {
    email,
    code,
  });
}

export async function resendEmailCode(email: string) {
  return publicApi.post<{
    success: boolean;
    email: string;
    alreadyVerified?: boolean;
    message: string;
  }>('/auth/resend-email-code', { email });
}

export async function getEmailVerificationStatus(email: string) {
  return publicApi.post<{
    email: string;
    emailVerified: boolean;
    emailVerifiedAt: string | null;
  }>('/auth/email-verification-status', { email });
}
