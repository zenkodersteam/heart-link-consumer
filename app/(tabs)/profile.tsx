import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import { EmptyState } from '../../src/components/EmptyState';
import { BChip, ChipRow, SRow, SectionHeader, VitalsStrip } from '../../src/components/profile-bits';
import { Button } from '../../src/components/primitives';
import type { PublicProfileDetail, PublicProfilePhoto } from '../../src/lib/api';
import { ProfilePhoto } from '../../src/components/ProfilePhoto';
import { formatReleaseMonth, parsePrefs, stateName } from '../../src/lib/prefs';
import { useApiClientFactory } from '../../src/lib/use-api-client';
import { usePublicProfile } from '../../src/lib/use-public-profiles';
import { colors, fonts, radii, spacing, type } from '../../src/theme';

/**
 * Full profile, Mindtrip layout (UI lift): photo left with tint + thumbnail
 * rail, scrolling editorial column right with a sticky action bar. Every
 * section renders only when the API supplies its data; admin-only intake
 * fields never reach this surface.
 */

const CHANNEL_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  letters: 'mail',
  mail: 'mail',
  'app messaging': 'message-circle',
  messaging: 'message-circle',
  phone: 'phone',
  'phone calls': 'phone',
  video: 'video',
  'video visits': 'video',
};

function channelIcon(label: string): keyof typeof Feather.glyphMap {
  const key = label.toLowerCase();
  for (const k of Object.keys(CHANNEL_ICONS)) {
    if (key.includes(k)) return CHANNEL_ICONS[k];
  }
  return 'message-circle';
}


export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { data, loading, error } = usePublicProfile(typeof id === 'string' ? id : undefined);
  const factory = useApiClientFactory();
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [saved, setSaved] = useState(false);

  // Safety actions. Reporting and blocking are deliberately separate: a member
  // may want a profile looked at without cutting contact, or the reverse.
  // Shown in a real dialog — Alert does nothing on the web build.
  //
  // Declared above the early returns below: these are hooks, and React
  // requires the same hooks to run in the same order on every render. Placing
  // them after a conditional return crashed this screen, and with it every
  // screen in the tab group.
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [safetyBusy, setSafetyBusy] = useState(false);
  const [safetyNote, setSafetyNote] = useState<string | null>(null);

  const submitReport = useCallback(
    (reason: 'inappropriate_content' | 'fake_identity' | 'policy_violation') => {
      void (async () => {
        setSafetyBusy(true);
        try {
          const api = await factory();
          if (!data) return;
          await api.reportProfile(data.id, { reason });
          setSafetyNote('Thank you. Our team will review this profile.');
        } catch {
          setSafetyNote('We could not send that report. Please try again.');
        } finally {
          setSafetyBusy(false);
          setReportOpen(false);
        }
      })();
    },
    [factory, data],
  );

  const submitBlock = useCallback(() => {
    void (async () => {
      setSafetyBusy(true);
      try {
        const api = await factory();
        if (!data) return;
        await api.blockProfile(data.id);
        router.replace('/(tabs)');
      } catch {
        setSafetyNote('We could not block that profile. Please try again.');
        setSafetyBusy(false);
        setBlockOpen(false);
      }
    })();
  }, [factory, data, router]);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  useEffect(() => {
    if (typeof id !== 'string') return;
    let alive = true;
    void (async () => {
      try {
        const client = await factory();
        const res = await client.listSavedProfiles();
        if (alive) setSaved(res.items.some((p) => p.id === id));
      } catch {
        if (alive) setSaved(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [factory, id]);

  useEffect(() => {
    if (!data) return;
    const urls = [data.primaryPhotoUrl, ...(data.photos ?? []).map((p) => p.presignedUrl)].filter(Boolean) as string[];
    if (urls.length) void Image.prefetch(urls, 'memory-disk').catch(() => false);
  }, [data]);

  async function toggleSave(profileId: string) {
    const nextSaved = !saved;
    setSaved(nextSaved);
    try {
      const client = await factory();
      if (nextSaved) await client.saveProfile(profileId);
      else await client.unsaveProfile(profileId);
    } catch {
      setSaved(!nextSaved); // revert on failure
    }
  }

  // Deep-link fallback. This route only ever renders one member, so arriving
  // without an id means a shared/emailed link lost its `?id=` or the listing
  // has since come down. Say that plainly and hand back a way forward.
  if (!id) {
    return (
      <Fallback>
        <EmptyState
          icon="user"
          title="No profile selected"
          body="This page shows one member's full profile: their photos, their story, and how to write to them. The link you followed didn't carry a profile, or that listing is no longer active."
          note="Listings come and go as memberships start and end, so older links sometimes point nowhere."
          ctaLabel="Browse profiles"
          onPress={() => router.replace('/(tabs)')}
          secondaryLabel="Go to your liked profiles"
          onSecondaryPress={() => router.replace('/liked')}
        />
      </Fallback>
    );
  }
  if (loading) {
    return (
      <Fallback>
        <ActivityIndicator color={colors.primary} />
      </Fallback>
    );
  }
  if (error || !data) {
    return (
      <Fallback>
        <EmptyState
          icon="user-x"
          title="This profile isn't available"
          body={error ?? 'It may have been removed, or the membership behind it has ended.'}
          ctaLabel="Browse profiles"
          onPress={() => router.replace('/(tabs)')}
        />
      </Fallback>
    );
  }

  const photos = data.photos ?? [];
  const activePhoto: PublicProfilePhoto | undefined = photos[activePhotoIdx];
  const photoUri = activePhoto?.presignedUrl ?? data.primaryPhotoUrl ?? null;

  const photoPane = (
    <View style={isDesktop ? styles.photoDesktop : styles.photoMobile}>
      <ProfilePhoto uri={photoUri} name={data.displayName} style={styles.photoImg} priority="high" />
      <View style={styles.photoTint} pointerEvents="none" />
      <LinearGradient
        colors={['rgba(22,5,31,0)', 'rgba(22,5,31,0.7)']}
        style={styles.photoScrim}
        pointerEvents="none"
      />
      {/* Controls sit on the photo, the way a phone app puts them, instead of
          a text link in the page flow above it. */}
      <View style={styles.photoTopBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }: { pressed: boolean }) => [
            styles.roundBtn,
            pressed ? { transform: [{ scale: 0.94 }] } : null,
          ]}
        >
          <Feather name="chevron-left" size={20} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={() => setMenuOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="More options"
          style={({ pressed }: { pressed: boolean }) => [
            styles.roundBtn,
            pressed ? { transform: [{ scale: 0.94 }] } : null,
          ]}
        >
          <Feather name="more-vertical" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.photoIdentity} pointerEvents="none">
        <Text style={styles.photoName} numberOfLines={1}>
          {data.displayName}
          {data.age ? <Text style={styles.photoAge}>  {data.age}</Text> : null}
        </Text>
        {data.facility?.state ? (
          <View style={styles.photoMetaRow}>
            <Feather name="home" size={12} color="rgba(251,245,232,0.9)" />
            <Text style={styles.photoMeta}>{stateName(data.facility.state)}</Text>
          </View>
        ) : null}
      </View>
      {data.isVerified ? (
      <View style={styles.vbadge} pointerEvents="none">
        <Feather name="shield" size={13} color={colors.goldBright} />
        <Text style={styles.vbadgeText}>Verified Profile</Text>
      </View>
      ) : null}
      {photos.length > 1 ? (
        <View style={styles.thumbs}>
          {photos.map((p, idx) => (
            <Pressable key={p.id} onPress={() => setActivePhotoIdx(idx)}>
              {({ hovered }: { hovered?: boolean }) => (
                <Image
                  source={{ uri: p.presignedUrl }}
                  style={[
                    styles.thumb,
                    idx === activePhotoIdx ? styles.thumbActive : null,
                    hovered ? styles.thumbHover : null,
                  ]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority={idx === activePhotoIdx ? 'high' : 'low'}
                />
              )}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );

  const column = <EditorialColumn data={data} />;

  const actionBar = (
    <View style={styles.stickybar}>
      <View style={styles.mbar}>
        <View style={styles.mbtnFlex}>
          <Button
            label={saved ? 'Saved to Liked' : 'Save to Liked'}
            variant="secondary"
            onPress={() => toggleSave(data.id)}
          />
        </View>
        {data.acceptsMail ? (
          <View style={styles.mbtnFlex}>
            <Button
              label={saved ? 'Write a letter' : 'Like to write'}
              disabled={!saved}
              onPress={() =>
                router.push(`/mailbox?compose=${data.id}&name=${encodeURIComponent(data.displayName)}`)
              }
            />
          </View>
        ) : null}
      </View>
      {safetyNote ? <Text style={styles.safetyNote}>{safetyNote}</Text> : null}
      <ConfirmDialog
        open={menuOpen}
        title={data.displayName}
        message="What would you like to do?"
        actions={[
          {
            label: 'Sponsor their membership',
            onPress: () => {
              setMenuOpen(false);
              router.push(`/sponsor?profile=${data.id}`);
            },
          },
          {
            label: 'Report this profile',
            onPress: () => {
              setMenuOpen(false);
              setReportOpen(true);
            },
          },
          {
            label: `Block ${data.displayName}`,
            destructive: true,
            onPress: () => {
              setMenuOpen(false);
              setBlockOpen(true);
            },
          },
        ]}
        cancelLabel="Close"
        onCancel={() => setMenuOpen(false)}
      />
      <ConfirmDialog
        open={reportOpen}
        icon="flag"
        title="Report this profile"
        message="Tell us what the problem is and our team will review it. Reporting does not block them."
        actions={[
          { label: 'Inappropriate content', onPress: () => submitReport('inappropriate_content') },
          { label: 'Pretending to be someone else', onPress: () => submitReport('fake_identity') },
          { label: 'Breaks the rules', onPress: () => submitReport('policy_violation') },
        ]}
        onCancel={() => setReportOpen(false)}
        busy={safetyBusy}
      />
      <ConfirmDialog
        open={blockOpen}
        icon="slash"
        title={`Block ${data.displayName}?`}
        message="They will no longer appear when you browse, and you will not receive letters from them. You can undo this from your account."
        actions={[{ label: 'Block', destructive: true, onPress: submitBlock }]}
        onCancel={() => setBlockOpen(false)}
        busy={safetyBusy}
      />
    </View>
  );

  if (isDesktop) {
    return (
      <View style={styles.pd}>
        {photoPane}
        <View style={styles.bodyCol}>
          <ScrollView
            contentContainerStyle={styles.bodyScroll}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={undefined}
          >
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={16} color={colors.primary} />
              <Text style={styles.backLabel}>Back</Text>
            </Pressable>
            {column}
            {actionBar}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.mobileScroll} showsVerticalScrollIndicator={false}>
        {photoPane}
        <View style={styles.mobileBody}>
          <EditorialColumn data={data} hideName />
        </View>
      </ScrollView>
      {actionBar}
    </SafeAreaView>
  );
}

function EditorialColumn({ data, hideName }: { data: PublicProfileDetail; hideName?: boolean }) {
  const prefs = parsePrefs(data.matchPreferences);
  const basics: { label: string; icon: keyof typeof Feather.glyphMap }[] = [];
  const push = (v: string | null, icon: keyof typeof Feather.glyphMap) => {
    if (v) basics.push({ label: v, icon });
  };
  push(prefs.heightRange, 'arrow-up');
  push(prefs.iAm, 'user');
  push(prefs.religion, 'sun');
  push(prefs.exercise, 'activity');
  push(prefs.education, 'book-open');
  push(prefs.tattoos, 'feather');
  push(prefs.kids, 'users');
  push(prefs.politicalViews, 'flag');
  if (prefs.languages.length) basics.push({ label: prefs.languages.join(' & '), icon: 'globe' });

  const hopeRows: { icon: keyof typeof Feather.glyphMap; label: string; value: string }[] = [];
  if (prefs.interestedIn) hopeRows.push({ icon: 'user', label: 'Interested in', value: prefs.interestedIn });
  if (prefs.relationshipPace)
    hopeRows.push({ icon: 'trending-up', label: 'Relationship pace', value: prefs.relationshipPace });
  if (prefs.futureExpectations)
    hopeRows.push({ icon: 'clock', label: 'Looking ahead', value: prefs.futureExpectations });
  if (prefs.loveLanguage) hopeRows.push({ icon: 'mail', label: 'Love language', value: prefs.loveLanguage });

  const hasHoping = prefs.emotionalIntentions.length > 0 || hopeRows.length > 0 || !!prefs.seeking;
  const release = data.releaseDate ? formatReleaseMonth(data.releaseDate) : null;

  return (
    <View>
      {prefs.typeOfConnection.length ? (
        <Text style={styles.overline}>{prefs.typeOfConnection.join(' · ').toUpperCase()}</Text>
      ) : null}
      {/* On a phone the name is already over the photo above, so repeating it
          here just pushed the bio further down. */}
      {hideName ? null : (
        <View style={styles.nmrow}>
          <Text style={styles.nm}>{data.displayName}</Text>
          {data.age != null ? <Text style={styles.ag}>{data.age}</Text> : null}
        </View>
      )}
      {data.bio ? <Text style={styles.prose}>{data.bio}</Text> : null}

      <VitalsStrip releaseDate={release} state={stateName(data.facility.state)} acceptsMail={data.acceptsMail} />

      {basics.length ? (
        <>
          <SectionHeader label="The basics" />
          <ChipRow>
            {basics.map((b) => (
              <BChip key={b.label} label={b.label} icon={b.icon} />
            ))}
          </ChipRow>
        </>
      ) : null}

      {hasHoping ? (
        <>
          <SectionHeader label="What I'm hoping to find" />
          {prefs.seeking ? <Text style={styles.prose}>{prefs.seeking}</Text> : null}
          {prefs.emotionalIntentions.length ? (
            <>
              <Text style={styles.mlabel}>Hoping to share</Text>
              <ChipRow>
                {prefs.emotionalIntentions.map((e) => (
                  <BChip key={e} label={e} />
                ))}
              </ChipRow>
            </>
          ) : null}
          {hopeRows.length ? (
            <View style={styles.srows}>
              {hopeRows.map((r) => (
                <SRow key={r.label} icon={r.icon} label={r.label} value={r.value} />
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {prefs.valuesLifestyle.length ? (
        <>
          <SectionHeader label="Values & lifestyle" />
          <ChipRow>
            {prefs.valuesLifestyle.map((v) => (
              <BChip key={v} label={v} />
            ))}
          </ChipRow>
        </>
      ) : null}

      {data.interests.length ? (
        <>
          <SectionHeader label="Interests" />
          <ChipRow>
            {data.interests.map((i) => (
              <BChip key={i} label={i} />
            ))}
          </ChipRow>
        </>
      ) : null}

      {prefs.communicationChannels.length || data.locationDescription ? (
        <>
          <SectionHeader label="Ways to connect" />
          {prefs.communicationChannels.length ? (
            <ChipRow>
              {prefs.communicationChannels.map((c) => (
                <BChip key={c} label={c} icon={channelIcon(c)} />
              ))}
            </ChipRow>
          ) : null}
          {data.locationDescription ? (
            <View style={styles.srows}>
              <SRow icon="home" label="Writes from" value={data.locationDescription} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function Fallback({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.empty}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },

  pd: { flex: 1, flexDirection: 'row', minHeight: 0 },
  photoDesktop: { width: '46%', position: 'relative', overflow: 'hidden' },
  // 4/5 made this ~500pt tall on a phone, which filled the screen and pushed
  // the person's name and story below the fold: you opened a profile and saw a
  // photo and nothing else. Shorter, so identity and the start of the bio are
  // visible without scrolling.
  photoMobile: { position: 'relative', aspectRatio: 5 / 4, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%', backgroundColor: colors.surfaceMuted },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  photoTopBar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(251,245,232,0.92)',
  },
  photoIdentity: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.lg, gap: 3 },
  photoName: { fontFamily: fonts.heading, fontSize: 26, color: '#FBF5E8' },
  photoAge: { fontFamily: fonts.heading, fontSize: 20, color: 'rgba(251,245,232,0.85)' },
  photoMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  photoMeta: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(251,245,232,0.9)' },
  phInitial: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.sidebar, marginBottom: 10,
  },
  phInitialText: { fontFamily: fonts.heading, fontSize: 26, color: colors.sidebarText },
  phText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  photoTint: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.photoTint },
  photoScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  safetyNote: { fontFamily: fonts.body, fontSize: 12.5, color: colors.primary, textAlign: 'center', paddingTop: 8 },
  safetyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 10 },
  safetyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  safetyText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textMuted },
  safetyDot: { color: colors.textMuted },
  vbadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22,5,31,0.55)',
    borderWidth: 1,
    borderColor: colors.goldBright,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  vbadgeText: { fontFamily: fonts.bodySemibold, fontSize: 12, color: colors.goldBright },
  thumbs: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', gap: 8 },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: colors.surfaceMuted,
  },
  thumbActive: { borderColor: colors.goldBright },
  thumbHover: {
    borderColor: colors.goldBright,
    transform: [{ scale: 1.08 }],
    ...Platform.select({
      web: { transitionProperty: 'transform, border-color', transitionDuration: '160ms' } as object,
    }),
  },

  bodyCol: { flex: 1, minWidth: 0 },
  bodyScroll: { paddingHorizontal: 40, paddingTop: 20, paddingBottom: 0, flexGrow: 1 },
  mobileScroll: { paddingBottom: 90, flexGrow: 1, paddingTop: 0 },
  mobileBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingLeft: spacing.lg, alignSelf: 'flex-start', paddingHorizontal: Platform.select({ default: 0 }) },
  backLabel: { ...type.button, color: colors.primary, fontSize: 14 },

  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    letterSpacing: 2,
    color: colors.gold,
    marginTop: spacing.sm,
  },
  nmrow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 4 },
  nm: { fontFamily: fonts.heading, fontSize: 30, color: colors.textPrimary },
  ag: { fontFamily: fonts.bodyMedium, fontSize: 21, color: colors.textSecondary },
  prose: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 24, color: colors.textSecondary, marginTop: 10 },
  mlabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, marginTop: 12, marginBottom: 9 },
  srows: { marginTop: 16 },

  // Sticky action bar: pinned on web desktop scroll + mobile bottom.
  stickybar: {
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bgDeep,
    ...Platform.select({
      web: {
        position: 'sticky' as never,
        bottom: 0,
        backgroundImage: 'linear-gradient(180deg, rgba(251,241,235,0), #FBF1EB 40%)',
        backgroundColor: 'transparent',
      } as object,
    }),
  },
  mbar: { flexDirection: 'row', gap: 10 },
  mbtnFlex: { flex: 1 },
  sponsorLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  sponsorLinkText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: colors.gold },
});
