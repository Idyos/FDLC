import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions";
import { createUserFn } from "./users/createUser";
import { deleteUserFn } from "./users/deleteUser";
import { getUsersFn } from "./users/getUsers";
import { deletePenyaFn } from "./penyes/deletePenya";
import { onPenyaWrittenFn, onResultsWrittenFn } from "./ranking/updateRanking";
import {
  onProvaParticipantWrittenFn,
  onSubProvaParticipantWrittenFn,
  recomputeProvaParticipantsFn,
} from "./proves/updateProvaParticipants";

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

export const createUser = createUserFn;
export const deleteUser = deleteUserFn;
export const getUsers = getUsersFn;
export const deletePenya = deletePenyaFn;
export const onPenyaWritten = onPenyaWrittenFn;
export const onResultsWritten = onResultsWrittenFn;
export const onProvaParticipantWritten = onProvaParticipantWrittenFn;
export const onSubProvaParticipantWritten = onSubProvaParticipantWrittenFn;
export const recomputeProvaParticipants = recomputeProvaParticipantsFn;
