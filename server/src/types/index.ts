import { Request } from 'express';

export interface JwtPayload {
  memberId: string;
  email: string;
  roleId: string;
}

export interface Permission {
  project: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    manage_members: boolean;
  };
  task: {
    create: boolean;
    edit: boolean;
    delete: boolean;
    assign: boolean;
  };
  member: {
    view_all: boolean;
    view_workload: boolean;
    manage: boolean;
  };
  system: {
    manage_roles: boolean;
    view_all_stats: boolean;
    manage_settings: boolean;
  };
}

export interface AuthenticatedRequest extends Request {
  member?: {
    id: string;
    email: string;
    roleId: string;
    permissions: Permission;
  };
}
