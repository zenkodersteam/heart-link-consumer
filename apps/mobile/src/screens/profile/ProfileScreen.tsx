import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DropdownMenu } from '../../components/DropdownMenu';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { BChip, ChipRow, SRow, SectionHeader, VitalsStrip } from '../../components/profile-bits';
import { Button } from '../../components/primitives';
import type { PublicProfileDetail, PublicProfilePhoto } from '@heartlink/consumer-api';
import { ProfilePhoto } from '../../components/ProfilePhoto';
import { formatReleaseMonth, parsePrefs, stateName } from '@heartlink/consumer-api';
import { useApiClientFactory } from '../../lib/use-api-client';
import { usePublicProfile } from '../../lib/use-public-profiles';
import { useNavigation, useRoute } from '@react-navigation/native';

import type { RootNavigation, RootRoute } from '../../navigations/types';

import { colors, fonts, radii, spacing, themedStyles, type } from '../../theme';
import { ProfileDetailSkeleton } from '../../components/Skeleton';

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
  const navigation = useNavigation<RootNavigation>();
  const insets = useSafeAreaInsets();
  const { id } = useRoute<RootRoute<'Profile'>>().params;
  const { data, loading, error, reload } = usePublicProfile(typeof id === 'string' ? id : undefined);
  const factory = useApiClientFactory();
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  // Page width is measured rather than assumed: the pane is full-bleed on a
  // phone but a fixed column on desktop.
  const [paneWidth, setPaneWidth] = useState(0);
  const carouselRef = useRef<ScrollView>(null);
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
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<View | null>(null);
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
        navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });
      } catch {
        setSafetyNote('We could not block that profile. Please try again.');
        setSafetyBusy(false);
        setBlockOpen(false);
      }
    })();
  }, [factory, data, navigation]);

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
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] })}
          secondaryLabel="Go to your liked profiles"
          onSecondaryPress={() => navigation.navigate('Tabs', { screen: 'Liked' })}
        />
      </Fallback>
    );
  }
  if (loading) {
    // Holds the shape of the profile being fetched: photo block, then the
    // name and story beneath it.
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <ProfileDetailSkeleton />
      </SafeAreaView>
    );
  }
  // A failure and an empty result mean different things. Something went wrong
  // is worth retrying; a listing that has genuinely ended is not, and offering
  // "Try again" there would just fail again.
  if (error) {
    return (
      <Fallback>
        <ErrorState
          error={error}
          fallback="We couldn't open this profile just now."
          onRetry={reload}
        />
      </Fallback>
    );
  }
  if (!data) {
    return (
      <Fallback>
        <EmptyState
          icon="user-x"
          title="This profile isn't available"
          body="It may have been removed, or the membership behind it has ended."
          ctaLabel="Browse profiles"
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] })}
        />
      </Fallback>
    );
  }

  const photos = data.photos ?? [];
  const activePhoto: PublicProfilePhoto | undefined = photos[activePhotoIdx];
  const photoUri = activePhoto?.presignedUrl ?? data.primaryPhotoUrl ?? null;

  // One page per photo; with none we still render a single page so the
  // placeholder, scrim and identity block all keep their positions.
  const pages = photos.length ? photos : [{ id: 'placeholder', presignedUrl: photoUri ?? '' }];

  const photoPane = (
    <View
      style={isDesktop ? styles.photoDesktop : styles.photoMobile}
      onLayout={(e) => setPaneWidth(e.nativeEvent.layout.width)}
    >
      {paneWidth > 0 ? (
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={pages.length > 1}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / paneWidth);
            if (i !== activePhotoIdx) setActivePhotoIdx(i);
          }}
          style={StyleSheet.absoluteFill}
        >
          {pages.map((p, idx) => (
            <View key={p.id} style={{ width: paneWidth, height: '100%' }}>
              <ProfilePhoto
                uri={p.presignedUrl || null}
                name={data.displayName}
                style={styles.photoImg}
                priority={idx === 0 ? 'high' : 'low'}
                showCaption={false}
              />
            </View>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.photoTint} pointerEvents="none" />
      <LinearGradient
        colors={['rgba(22,5,31,0)', 'rgba(22,5,31,0.7)']}
        style={styles.photoScrim}
        pointerEvents="none"
      />
      {/* Controls sit on the photo, the way a phone app puts them, instead of
          a text link in the page flow above it. */}
      {/* No back control here: leaving is a swipe from the left edge or the
          system back button, the way a phone does it. The overflow keeps the
          corner to itself. */}
      {/* Below the clock, not under it.
          The photo runs to the top of the screen, and this row was insetting
          from the photo rather than from the safe area - which put a 36pt
          control inside the status bar, where iOS takes the taps for itself.
          It looked reachable and was not. */}
      <View style={[styles.photoTopBar, { top: insets.top + spacing.xs }]}>
        <Pressable
          ref={menuBtnRef}
          onPress={() => {
            // Measure first so the menu drops from under the button rather
            // than from a fixed offset that could land over it.
            menuBtnRef.current?.measureInWindow?.((x, y, w, h) => {
              setMenuAnchor({ top: y + h + 8, right: 16 });
              setMenuOpen(true);
            });
            if (!menuBtnRef.current?.measureInWindow) setMenuOpen(true);
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="More options"
          style={({ pressed }: { pressed: boolean }) => [
            styles.roundBtn,
            pressed ? { transform: [{ scale: 0.94 }] } : null,
          ]}
        >
          {/* Fixed dark, not `textPrimary`. This button floats on the photo,
              not on the page, and its pill is a fixed cream in both themes —
              so following the page's text colour turned the glyph light on a
              light pill at night and left the control invisible. */}
          <Feather name="more-vertical" size={18} color={colors.midnight} />
        </Pressable>
      </View>

      <View style={[styles.photoIdentity, pages.length > 1 ? styles.photoIdentityRaised : null]} pointerEvents="none">
        <Text style={styles.photoName} numberOfLines={1} maxFontSizeMultiplier={1.4}>
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
      {pages.length > 1 ? (
        <View style={styles.dots} pointerEvents="box-none">
          {pages.map((p, idx) => (
            <Pressable
              key={p.id}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Photo ${idx + 1} of ${pages.length}`}
              onPress={() => {
                setActivePhotoIdx(idx);
                carouselRef.current?.scrollTo({ x: idx * paneWidth, animated: true });
              }}
              style={[styles.dot, idx === activePhotoIdx ? styles.dotActive : null]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );

  const column = <EditorialColumn data={data} />;

  // Everything a person can do with this profile now lives in the one menu
  // hanging off the button that opened it, rather than two large buttons
  // pinned over the content plus links underneath.
  const actionBar = (
    <>
      {safetyNote ? (
        <View style={styles.stickybar}>
          <Text style={styles.safetyNote}>{safetyNote}</Text>
        </View>
      ) : null}

      <DropdownMenu
        open={menuOpen}
        anchor={menuAnchor}
        onClose={() => setMenuOpen(false)}
        items={[
          {
            label: saved ? 'Remove from Liked' : 'Like',
            icon: 'heart',
            onPress: () => toggleSave(data.id),
          },
          ...(data.acceptsMail
            ? [
                {
                  label: saved ? 'Write a letter' : 'Like first to write',
                  icon: 'edit-3' as const,
                  disabled: !saved,
                  onPress: () =>
                    navigation.navigate('Tabs', {
                      screen: 'Mailbox',
                      params: { compose: data.id, name: data.displayName },
                    }),
                },
              ]
            : []),
          {
            label: 'Sponsor membership',
            icon: 'gift',
            onPress: () => navigation.navigate('Sponsor', { profile: data.id }),
          },
          {
            label: 'Report profile',
            icon: 'flag',
            separated: true,
            onPress: () => setReportOpen(true),
          },
          {
            label: `Block ${data.displayName}`,
            icon: 'slash',
            destructive: true,
            onPress: () => setBlockOpen(true),
          },
        ]}
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
    </>
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
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
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
        {/* The words get their own paper, lifted over the photo — the same idea
            the deck card uses. Before this the photo and the text met at a hard
            horizontal line across the screen, which is what made the page read
            as two slabs rather than one profile. */}
        <View style={styles.mobileSheet}>
          <View style={styles.sheetGrabber} />
          <EditorialColumn data={data} hideName />
        </View>
      </ScrollView>

      {/* The two things anyone opens a profile to do. They were both inside the
          "..." menu, so nothing on the screen was actionable. */}
      <View style={styles.mobileActions}>
        <View style={styles.mobileActionBtn}>
          <Button
            label={saved ? 'Liked' : 'Like'}
            variant="secondary"
            // Filled once liked, outline before: the icon says the state, so
            // the word does not have to carry it alone.
            icon={
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={17}
                color={saved ? colors.primary : colors.textSecondary}
              />
            }
            onPress={() => toggleSave(data.id)}
          />
        </View>
        {data.acceptsMail ? (
          <View style={styles.mobileActionBtnWide}>
            <Button
              label={saved ? 'Write a letter' : 'Like first to write'}
              disabled={!saved}
              onPress={() =>
                navigation.navigate('Tabs', {
                  screen: 'Mailbox',
                  params: { compose: data.id, name: data.displayName },
                })
              }
            />
          </View>
        ) : null}
      </View>

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
      {/* Facts before prose, the order the client's card uses. A full bio is
          often several hundred words, and leading with it buried when someone
          is coming home and whether they take mail — which is what most people
          open a profile to find out — under a wall of text. */}
      <VitalsStrip releaseDate={release} state={stateName(data.facility.state)} acceptsMail={data.acceptsMail} />

      {data.bio ? <Text style={styles.prose}>{data.bio}</Text> : null}

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

/** How far the detail sheet is lifted over the foot of the photo. */
const SHEET_OVERLAP = 26;

const styles = themedStyles((colors) => ({
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
    // `top` is set at the call site from the safe-area inset.
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    // `flex-end`, not `space-between`: the back control that used to hold the
    // left of this row is gone, and space-between with one child parks it on
    // the left.
    justifyContent: 'flex-end',
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
  // Clears SHEET_OVERLAP as well as its own margin: the sheet is lifted over
  // the foot of the photo, and without this it cut the state line in half.
  photoIdentity: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg + SHEET_OVERLAP,
    gap: 3,
  },
  // The thumbnail strip is pinned to the same corner, so with more than one
  // photo the name sat underneath it. Clear the strip (52px) plus a gap.
  photoIdentityRaised: { bottom: spacing.lg + SHEET_OVERLAP + 18 },
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
  dots: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(251,245,232,0.45)',
  },
  // The active page reads as a pill rather than a bigger circle, so the row
  // keeps a steady rhythm.
  dotActive: { width: 20, backgroundColor: colors.goldBright },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  thumbActive: { borderColor: colors.goldBright },

  bodyCol: { flex: 1, minWidth: 0 },
  bodyScroll: { paddingHorizontal: 40, paddingTop: 20, paddingBottom: 0, flexGrow: 1 },
  mobileScroll: { paddingBottom: spacing.xl, flexGrow: 1, paddingTop: 0 },
  mobileBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  mobileSheet: {
    marginTop: -SHEET_OVERLAP,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.bgDeep,
  },
  // A short bar at the top of the sheet, so the lift reads as deliberate.
  sheetGrabber: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  mobileActions: {
    flexDirection: 'row',
    // Room between the two: at 8 they read as one segmented control, and the
    // secondary button was easy to hit when reaching for the primary one.
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    // Lifts the bar off the page rather than drawing a hard line across it.
    boxShadow: '0 -6px 20px rgba(46, 18, 64, 0.06)',
  },
  mobileActionBtn: { flex: 1 },
  mobileActionBtnWide: { flex: 1.4 },

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
}));
