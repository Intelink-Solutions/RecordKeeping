import { Navigate, useLocation } from "react-router-dom";
import { canAccessRoute, getCurrentRole } from "@/lib/permissions";

/**
 * Wraps a route element to check visibility-based permissions.
 * If the user lacks permission for the current path, redirects to /home.
 */
const PermissionGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const role = getCurrentRole();

  if (!canAccessRoute(location.pathname, role)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

export default PermissionGuard;
