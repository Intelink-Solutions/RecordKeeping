import { useMemo } from "react";
import { getSyncStatus } from "@/lib/sync-status";
import {
  canAccessSettings,
  canEditUserProfile,
  canManageData,
  getCurrentRole,
  isOwner,
  hasPermission,
  roleLabel,
} from "@/lib/permissions";
import type { Visibility } from "@/lib/permissions";

export function useAppContext() {
  const role = getCurrentRole();
  const syncStatus = getSyncStatus();

  return useMemo(() => {
    return {
      role,
      roleLabel: roleLabel(role),
      syncStatus,
      isOwner: isOwner(role),
      canManageData: canManageData(role),
      canAccessSettings: canAccessSettings(role),
      canEditUserProfile: canEditUserProfile(role),
      hasPermission: (key: keyof Visibility) => hasPermission(key, role),
    };
  }, [role, syncStatus]);
}
