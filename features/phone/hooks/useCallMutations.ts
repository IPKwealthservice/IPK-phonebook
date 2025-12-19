import { useCallback } from "react";

import {
  logCallInteraction,
  updateLeadAfterCall,
  updateLeadDetailsWithClientCode,
  updateLeadStatus,
} from "@/features/leads/services/interactions.service";

export type LogCallOptions = Parameters<typeof logCallInteraction>[0];
export type UpdateLeadAfterCallOptions = Parameters<typeof updateLeadAfterCall>[0];
export type UpdateLeadStatusOptions = Parameters<typeof updateLeadStatus>[0];

export const useCallMutations = () => {
  const logCall = useCallback(
    async (options: LogCallOptions) => {
      await logCallInteraction(options);
    },
    []
  );

  const changeStage = useCallback(
    async (options: UpdateLeadAfterCallOptions) => {
      return updateLeadAfterCall(options);
    },
    []
  );

  const updateLeadDetails = useCallback(
    async (leadId: string, clientCode: string, note?: string | null) => {
      return updateLeadDetailsWithClientCode({ leadId, clientCode, note });
    },
    []
  );

  const updateStatus = useCallback(
    async (options: UpdateLeadStatusOptions) => {
      return updateLeadStatus(options);
    },
    []
  );

  return { logCall, changeStage, updateStatus, updateLeadDetails };
};
