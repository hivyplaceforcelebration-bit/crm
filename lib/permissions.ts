// Which route prefixes each role can reach, matching the Role Permissions
// Reference chart on Settings > Users & Roles. "admin" always has full
// access. Dashboard is intentionally left off every list below - it's the
// shared landing page every role can reach.
export const ROLE_ROUTES: Record<string, string[]> = {
  admin: ["*"],
  manager: [
    "/protected/dashboard",
    "/protected/bookings",
    "/protected/customers",
    "/protected/packages",
    "/protected/invoices",
    "/protected/analytics",
    "/protected/staff",
    "/protected/calendar",
    "/protected/marketing",
  ],
  agent: [
    "/protected/dashboard",
    "/protected/leads",
    "/protected/bookings",
    "/protected/customers",
    "/protected/invoices",
    "/protected/calendar",
    "/protected/marketing",
  ],
  staff: [
    "/protected/dashboard",
    "/protected/bookings",
    "/protected/calendar",
  ],
}

export function canAccessRoute(role: string, pathname: string): boolean {
  const routes = ROLE_ROUTES[role] ?? ROLE_ROUTES.staff
  if (routes.includes("*")) return true
  if (pathname === "/protected" || pathname === "/protected/dashboard") return true
  return routes.some((r) => pathname === r || pathname.startsWith(r + "/"))
}
