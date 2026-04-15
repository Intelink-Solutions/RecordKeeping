import { store } from "@/lib/store";

export type AppRole = "shop-owner" | "manager" | "staff" | "employee";

const ROLE_KEY = "pos_user_role";

function normalizeRole(value: string | null | undefined): AppRole {
  const raw = (value ?? "").toLowerCase();

  if (raw === "shop-owner" || raw === "shop owner" || raw === "owner" || raw === "admin" || raw === "administrator") {
    return "shop-owner";
  }

  if (raw === "employee") {
    return "employee";
  }

  if (raw === "manager" || raw === "shop-manager" || raw === "shop manager") {
    return "manager";
  }

  return "staff";
}

export function setCurrentRole(role: string): void {
  localStorage.setItem(ROLE_KEY, normalizeRole(role));
}

export function getCurrentRole(): AppRole {
  const fromStorage = localStorage.getItem(ROLE_KEY);
  if (fromStorage) return normalizeRole(fromStorage);

  const fromProfile = store.getUserProfile().role;
  return normalizeRole(fromProfile);
}

export function canManageData(role: AppRole = getCurrentRole()): boolean {
  return role === "shop-owner" || role === "manager";
}

export function canAccessSettings(role: AppRole = getCurrentRole()): boolean {
  return role === "shop-owner";
}

export function canEditUserProfile(role: AppRole = getCurrentRole()): boolean {
  return role === "shop-owner";
}

export function roleLabel(role: AppRole = getCurrentRole()): string {
  if (role === "shop-owner") return "Shop Owner";
  if (role === "manager") return "Manager";
  if (role === "employee") return "Employee";
  return "Staff";
}
