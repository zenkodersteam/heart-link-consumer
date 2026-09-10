import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import type { PublicProfileSummary } from '@heartlink/consumer-api';
import { formatReleaseMonth, parsePrefs, stateName } from '@heartlink/consumer-api';
import { usePublicProfile } from '../lib/use-public-profiles';
import type { RootNavigation } from '../navigations/types';

import { colors, fonts, spacing, themedStyles } from '../theme';
import { BChip, ChipRow, SRow, VitalsStrip } from './profile-bits';
import { Button } from './primitives';

/**
 * Desktop browse story panel (Mindtrip pattern, UI lift item 2): gold
 * overline of connection types, serif name, bio prose, "Hoping to share"
 * chips, vitals strip, Values + Love language rows, then ghost "View full
 * profile" (the ONLY navigation into profile detail) + gradient
 * "Write a letter".
 */
export function StoryPanel({ profile, canWrite }: { profile: PublicProfileSummary; canWrite?: boolean }) {
  const navigation = useNavigation<RootNavigation>();
  const detail = usePublicProfile(profile.id).data;
  const prefs = parsePrefs(detail?.matchPreferences);

  const overline = prefs.typeOfConnection.join(' · ');
  const bio = detail?.bio || profile.bioExcerpt || null;
  const hoping = prefs.emotionalIntentions.length
    ? prefs.emotionalIntentions
    : (detail?.interests ?? []).slice(0, 3);
  const release = detail?.releaseDate ? formatReleaseMonth(detail.releaseDate) : null;

  return (
    <View style={styles.panel}>
      <View style={styles.mcard}>
        {overline ? <Text style={styles.overline}>{overline.toUpperCase()}</Text> : null}
        <Text style={styles.title}>{profile.displayName}</Text>
        {bio ? (
          <Text style={styles.prose} numberOfLines={4}>
            {bio}
          </Text>
        ) : null}

        {hoping.length ? (
          <>
            <Text style={styles.mlabel}>Hoping to share</Text>
            <ChipRow>
              {hoping.map((h) => (
                <BChip key={h} label={h} />
              ))}
            </ChipRow>
          </>
        ) : null}

        <VitalsStrip
          releaseDate={release}
          state={stateName(profile.facility.state)}
          acceptsMail={detail?.acceptsMail ?? true}
        />

        {prefs.valuesLifestyle.length || prefs.loveLanguage ? (
          <View style={styles.srows}>
            {prefs.valuesLifestyle.length ? (
              <SRow icon="heart" label="Values" value={prefs.valuesLifestyle.join(', ')} />
            ) : null}
            {prefs.loveLanguage ? (
              <SRow icon="mail" label="Love language" value={prefs.loveLanguage} />
            ) : null}
          </View>
        ) : null}

      </View>

      {/* Action bar sits below the card (mockup), not inside it. */}
      <View style={styles.mbar}>
        <View style={styles.mbtn}>
          <Button
            label="View full profile"
            variant="secondary"
            style={styles.mbtnInner}
            onPress={() => navigation.navigate('Profile', { id: profile.id })}
          />
        </View>
        <View style={styles.mbtn}>
          <Button
            label={canWrite ? 'Write a letter' : 'Like to write'}
            style={styles.mbtnInner}
            disabled={!canWrite}
            onPress={() =>
              navigation.navigate('Tabs', { screen: 'Mailbox', params: { compose: profile.id, name: profile.displayName } })
            }
          />
        </View>
      </View>
    </View>
  );
}

const styles = themedStyles((colors) => ({
  // Shrinkable at narrow desktop widths so the browse columns never clip.
  // Height mirrors ProfileDeck's desktop column: 520px card row + 16px gap +
  // action row. The panel stretches down from the same y-origin as the deck,
  // so the top and bottom edges stay aligned across desktop viewport sizes.
  panel: { flexBasis: 340, flexShrink: 1, maxWidth: 340, minWidth: 270, height: '100%', maxHeight: 613, gap: 14 },
  mcard: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(46,18,64,0.05)',
    borderRadius: 24,
    paddingHorizontal: 26,
    paddingTop: 26,
    paddingBottom: 22,
    boxShadow:
      '0 1px 2px rgba(46,18,64,0.05), 0 8px 18px rgba(46,18,64,0.06), 0 24px 48px rgba(46,18,64,0.10)',
  },
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    letterSpacing: 2,
    color: colors.gold,
    marginBottom: 8,
  },
  title: { fontFamily: fonts.heading, fontSize: 27, lineHeight: 32, color: colors.textPrimary },
  prose: { fontFamily: fonts.body, fontSize: 14, lineHeight: 24, color: colors.textSecondary, marginTop: 10 },
  mlabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textPrimary, marginTop: 18, marginBottom: 9 },
  srows: { marginTop: 16 },
  mbar: { flexDirection: 'row', gap: 10 },
  mbtn: { flex: 1 },
  mbtnInner: { paddingHorizontal: spacing.sm, paddingVertical: 12 },
}));
