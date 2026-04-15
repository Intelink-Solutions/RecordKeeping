import { useMemo } from "react";
import { getSyncStatus } from "@/lib/sync-status";
import {
  canAccessSettings,
  canEditUserProfile,
  canManageData,
  getCurrentRole,
  roleLabel,
} from "@/lib/permissions";

export function useAppContext() {
  const role = getCurrentRole();
  const syncStatus = getSyncStatus();

  return useMemo(() => {
    return {
      role,
      roleLabel: roleLabel(role),
      syncStatus,
      canManageData: canManageData(role),
      canAccessSettings: canAccessSettings(role),
      canEditUserProfile: canEditUserProfile(role),
    };
  }, [role, syncStatus]);
}
