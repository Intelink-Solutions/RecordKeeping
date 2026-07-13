import { store } from "@/lib/store";

export type AppRole = "shop-owner" | "manager" | "staff" | "employee";

const ROLE_KEY = "pos_user_role";
const VISIBILITY_KEY = "pos_user_visibility";

const HRM_PERMISSION_KEYS = [
  "departmentsPermission",
  "designationsPermission",
  "shiftsPermission",
  "employeesPermission",
  "leaveTypesPermission",
  "leavesPermission",
  "holidaysPermission",
  "attendancePermission",
  "payrollPermission",
  "attendanceReportPermission",
  "payrollReportPermission",
  "leaveReportPermission",
] as const;

// The granular permission keys from the backend
export interface Visibility {
  profileEditPermission?: boolean;
  salePermission?: boolean;
  salesListPermission?: boolean;
  purchasePermission?: boolean;
  purchaseListPermission?: boolean;
  productPermission?: boolean;
  stockPermission?: boolean;
  partiesPermission?: boolean;
  addIncomePermission?: boolean;
  addExpensePermission?: boolean;
  dueListPermission?: boolean;
  lossProfitPermission?: boolean;
  reportsPermission?: boolean;
  departmentsPermission?: boolean;
  designationsPermission?: boolean;
  shiftsPermission?: boolean;
  employeesPermission?: boolean;
  leaveTypesPermission?: boolean;
  leavesPermission?: boolean;
  holidaysPermission?: boolean;
  attendancePermission?: boolean;
  payrollPermission?: boolean;
  attendanceReportPermission?: boolean;
  payrollReportPermission?: boolean;
  leaveReportPermission?: boolean;
  hrmPermission?: boolean;
  branchesPermission?: boolean;
  warehousesPermission?: boolean;
  transfersPermission?: boolean;
  branchRolesPermission?: boolean;
}

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

export function setVisibility(v: Record<string, unknown> | null | undefined): void {
  if (!v) {
    localStorage.removeItem(VISIBILITY_KEY);
    return;
  }
  // Normalize: backend may store "1"/true/"true" — coerce all to boolean
  const normalized: Visibility = {};
  for (const [key, val] of Object.entries(v)) {
    (normalized as Record<string, boolean>)[key] = val === true || val === "1" || val === 1 || val === "true";
  }
  // Backward compatibility: expand legacy single HRM flag into the new per-screen permissions.
  if (normalized.hrmPermission === true) {
    for (const key of HRM_PERMISSION_KEYS) {
      (normalized as Record<string, boolean>)[key] = true;
    }
  }
  localStorage.setItem(VISIBILITY_KEY, JSON.stringify(normalized));
}

export function getVisibility(): Visibility {
  try {
    const raw = localStorage.getItem(VISIBILITY_KEY);
    const parsed = raw ? (JSON.parse(raw) as Visibility) : {};
    if (parsed.hrmPermission === true) {
      for (const key of HRM_PERMISSION_KEYS) {
        (parsed as Record<string, boolean>)[key] = true;
      }
    }
    return parsed;
  } catch {
    return {};
  }
}

/** Shop owners bypass all permission checks */
export function isOwner(role: AppRole = getCurrentRole()): boolean {
  return role === "shop-owner";
}

/** Check if user has a specific visibility permission */
export function hasPermission(key: keyof Visibility, role: AppRole = getCurrentRole()): boolean {
  if (isOwner(role)) return true; // Owner has all permissions
  const v = getVisibility();
  return v[key] === true;
}

export function canManageData(role: AppRole = getCurrentRole()): boolean {
  return role === "shop-owner" || role === "manager" || role === "staff";
}

export function canAccessSettings(role: AppRole = getCurrentRole()): boolean {
  return role === "shop-owner" || role === "manager" || role === "staff" || role === "employee";
}

export function canEditUserProfile(role: AppRole = getCurrentRole()): boolean {
  if (role === "shop-owner") return true;
  return hasPermission("profileEditPermission", role);
}

export function roleLabel(role: AppRole = getCurrentRole()): string {
  if (role === "shop-owner") return "Shop Owner";
  if (role === "manager") return "Manager";
  if (role === "employee") return "Employee";
  return "Staff";
}

/** Map route paths to the required visibility permission key */
const ROUTE_PERMISSION_MAP: Record<string, keyof Visibility> = {
  "/add-sale": "salePermission",
  "/sales": "salesListPermission",
  "/sale-return": "salePermission",
  "/sale-returns": "salesListPermission",
  "/add-purchase": "purchasePermission",
  "/purchases": "purchaseListPermission",
  "/purchase-return": "purchasePermission",
  "/purchase-returns": "purchaseListPermission",
  "/products": "productPermission",
  "/categories": "productPermission",
  "/brands": "productPermission",
  "/units": "productPermission",
  "/stock": "stockPermission",
  "/customers": "partiesPermission",
  "/suppliers": "partiesPermission",
  "/due-list": "dueListPermission",
  "/expenses": "addExpensePermission",
  "/expense-categories": "addExpensePermission",
  "/income": "addIncomePermission",
  "/income-categories": "addIncomePermission",
  "/loss-profit": "lossProfitPermission",
  "/reports": "reportsPermission",
  "/finance": "addExpensePermission",
  "/hrm/departments": "departmentsPermission",
  "/hrm/designations": "designationsPermission",
  "/hrm/shifts": "shiftsPermission",
  "/hrm/employees": "employeesPermission",
  "/hrm/leave-types": "leaveTypesPermission",
  "/hrm/leaves": "leavesPermission",
  "/hrm/holidays": "holidaysPermission",
  "/hrm/attendance": "attendancePermission",
  "/hrm/payroll": "payrollPermission",
  "/hrm/attendance-report": "attendanceReportPermission",
  "/hrm/payroll-report": "payrollReportPermission",
  "/hrm/leave-report": "leaveReportPermission",
  "/branches": "branchesPermission",
  "/warehouses": "warehousesPermission",
  "/transfers": "transfersPermission",
  "/branch-roles": "branchRolesPermission",
  "/items": "salePermission",
  "/dashboard": "reportsPermission",
};

/** Check whether the current user can access a given route path */
export function canAccessRoute(path: string, role: AppRole = getCurrentRole()): boolean {
  if (isOwner(role)) return true;
  // Settings visible to all authenticated roles; User Roles is owner-only
  if (path === "/settings") return true;
  if (path === "/user-roles") return isOwner(role);
  if (path === "/hrm") return HRM_PERMISSION_KEYS.some((key) => hasPermission(key, role));
  // Check exact match first
  const permKey = ROUTE_PERMISSION_MAP[path];
  if (permKey) return hasPermission(permKey, role);
  // Check prefix match (e.g. /sale-return/123)
  for (const [routePrefix, key] of Object.entries(ROUTE_PERMISSION_MAP)) {
    if (path.startsWith(routePrefix)) return hasPermission(key, role);
  }
  // Report routes
  if (path.startsWith("/report/")) return hasPermission("reportsPermission", role);
  // Allow everything else (home, profile, notifications)
  return true;
}

/** Filter menu items based on permissions */
export function filterMenuItems<T extends { path: string }>(items: T[], role: AppRole = getCurrentRole()): T[] {
  if (isOwner(role)) return items;
  return items.filter(item => canAccessRoute(item.path, role));
}
