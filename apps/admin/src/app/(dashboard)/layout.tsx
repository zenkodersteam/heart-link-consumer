import { NavCountsProvider } from '../../components/intake/NavCountsProvider';
import { AdminShell } from '../../components/shell/AdminShell';
import { AdminUserMenu } from '../../components/auth/AdminUserMenu';
import { currentStaff, serverApi } from '../../lib/api';
import { isAuthFailure, redirectToSignOut } from '../../lib/auth-failure';
import type { NavCounts } from '@heartlink/api-contract';

// Render per request so the sidebar attention badges reflect live counts on
// every load, including a hard refresh of the same route (W7 UI flag #13).
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout wraps every staff page, so it is where a session the API will
  // not serve gets caught — once, before any page renders, rather than each
  // page throwing its own raw error.
  let counts: NavCounts | undefined;
  try {
    const api = await serverApi();
    counts = await api.getNavCounts();
  } catch (err) {
    // A session that is expired, or an account without staff access, is sent to
    // be signed out. Anything else is just a count we could not fetch, and the
    // portal still works without it.
    if (isAuthFailure(err)) redirectToSignOut(err);
    counts = undefined;
  }

  const staff = await currentStaff();

  return (
    <NavCountsProvider initialCounts={counts}>
      <AdminShell
        userSlot={
          staff ? (
            <AdminUserMenu
              email={staff.email}
              displayName={staff.displayName}
              role={staff.role}
            />
          ) : null
        }
      >
        {children}
      </AdminShell>
    </NavCountsProvider>
  );
}
