export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isTemporary: boolean;
  hasResetPassword?: boolean;
  permissions: {
    penyes: PenyesPermissions[];
    proves: ProvesPermissions[];
    specificProvaId?: string;
    users: UsersPermissions[];
  };
}

export const penyesPermissions = [
  "create",
  "delete",
  "edit",
  "*",
] as const;
export type PenyesPermissions = (typeof penyesPermissions)[number];

export const provesPermissions = [
  "create",
  "delete",
  "editInfo",
  "editResults",
  "*",
] as const;
export type ProvesPermissions = (typeof provesPermissions)[number];

export const usersPermissions = [
  "create",
  "delete",
  "edit",
  "*",
] as const;
export type UsersPermissions = (typeof usersPermissions)[number];