import { SetMetadata } from '@nestjs/common';

export const PRIVILEGES_KEY = 'privileges';
export const RequirePrivileges = (...privileges: string[]) =>
  SetMetadata(PRIVILEGES_KEY, privileges); 