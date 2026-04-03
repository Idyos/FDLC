// Mirrors src/interfaces/userInterface.ts — no @/ aliases (Node.js context)

export const penyesPermissions = ["create", "delete", "edit", "*"] as const;
export type PenyesPermissions = (typeof penyesPermissions)[number];

export const provesPermissions = [
  "create",
  "delete",
  "editInfo",
  "editResults",
  "*",
] as const;
export type ProvesPermissions = (typeof provesPermissions)[number];

export const usersPermissions = ["create", "delete", "*"] as const;
export type UsersPermissions = (typeof usersPermissions)[number];

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  isTemporary: boolean;
  permissions: {
    penyes: PenyesPermissions[];
    proves: ProvesPermissions[];
    specificProvaId?: string;
    users: UsersPermissions[];
  };
}
