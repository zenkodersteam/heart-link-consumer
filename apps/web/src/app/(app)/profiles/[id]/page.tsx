import { ProfileDetail } from '@/components/profiles/profile-detail';

/**
 * One member's full profile.
 *
 * The id is read here and handed down, so the client component below never has
 * to unwrap the params promise itself.
 */
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfileDetail id={id} />;
}
