import type { AdminUserLookupItem, Profile } from '@heartlink/api-contract';

const MAX_LOOKUP_RESULTS = 20;

export function profileLabel(profile: Pick<Profile, 'id' | 'displayName'>): string {
  return `${profile.displayName ?? 'Unnamed profile'} · ${profile.id}`;
}

export function userLabel(user: Pick<AdminUserLookupItem, 'id' | 'displayName' | 'email'>): string {
  return `${user.displayName ?? user.email} · ${user.email}`;
}

export function filterInboundProfiles<T extends Pick<Profile, 'id' | 'displayName'>>(
  profiles: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return profiles.slice(0, MAX_LOOKUP_RESULTS);
  return profiles.filter((profile) => profileLabel(profile).toLowerCase().includes(q)).slice(0, MAX_LOOKUP_RESULTS);
}

export function filterInboundUsers<
  T extends Pick<AdminUserLookupItem, 'id' | 'displayName' | 'email'>,
>(users: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return users.slice(0, MAX_LOOKUP_RESULTS);
  return users
    .filter((user) => userLabel(user).toLowerCase().includes(q) || user.id.toLowerCase().includes(q))
    .slice(0, MAX_LOOKUP_RESULTS);
}
