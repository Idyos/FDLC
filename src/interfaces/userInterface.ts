export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  isTemporary: boolean;
  permissions: {
    penyes: PenyesPermissions[];
    proves:  ProvesPermissions[];
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
  "*",
] as const;
export type UsersPermissions = (typeof usersPermissions)[number];