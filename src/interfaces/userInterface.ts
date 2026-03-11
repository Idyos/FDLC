export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isTemporary: boolean;
  permissions: {
    penyes: PenyesPermissions[];
    proves: ProvesPermissions[];
    specificProvaId?: string; // if set, proves permissions apply only to this specific prova
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