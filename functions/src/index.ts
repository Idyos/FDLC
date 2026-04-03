import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";
import { createUserFn } from "./users/createUser";
import { deleteUserFn } from "./users/deleteUser";

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

export const createUser = createUserFn;
export const deleteUser = deleteUserFn;
