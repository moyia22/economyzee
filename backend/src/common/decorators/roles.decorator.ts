import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const WRITE_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
