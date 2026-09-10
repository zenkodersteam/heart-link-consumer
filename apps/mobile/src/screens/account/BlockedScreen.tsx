import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListSkeleton } from '../../components/Skeleton';
import type { BlockedProfile } from '@heartlink/consumer-api';
import { humanError } from '../../lib/errors';
import { useRefresh } from '../../lib/use-refresh';
import { useApiClientFactory } from '../../lib/use-api-client';
import { useNavigation } from '@react-navigation/native';

import type { RootNavigation } from '../../navigations/types';

import { colors, radii, spacing, themedStyles, type } from '../../theme';

/** People this member has blocked, and the way back from a block made by mistake. */
export default function BlockedScreen() {
  const navigation = useNavigation<RootNavigation>();
  const apiFactory = useApiClientFactory();
  const [items, setItems] = useState<BlockedProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const api = await apiFactory();
      const res = await api.listBlocks();
      setItems(res.items);
    } catch (e) {
      setError(humanError(e, 'We could not load your blocked list.'));
      setItems([]);
    }
  }, [apiFactory]);

  const { refreshing, onRefresh } = useRefresh(load);

  useEffect(() => {
    void load();
  }, [load]);

  async function unblock(profileId: string) {
    setWorking(profileId);
    try {
      const api = await apiFactory();
      await api.unblockProfile(profileId);
      setItems((cur) => (cur ?? []).filter((i) => i.profileId !== profileId));
    } catch (e) {
      setError(humanError(e, 'We could not unblock that profile.'));
    } finally {
      setWorking(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back} hitSlop={10}>
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Blocked</Text>
      </View>

      <FlashList
        data={items ?? []}
        keyExtractor={(b) => b.profileId}
        estimatedItemSize={72}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          <>
            <Text style={styles.intro}>
              Blocked profiles do not appear when you browse, and you will not receive letters from
              them.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={
          items === null ? (
            <ListSkeleton count={3} />
          ) : (
            <View style={styles.empty}>
              <Feather name="shield" size={22} color={colors.textMuted} />
              <Text style={styles.emptyText}>You have not blocked anyone.</Text>
            </View>
          )
        }
        renderItem={({ item: b }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{b.displayName}</Text>
              <Text style={styles.meta}>Blocked {new Date(b.blockedAt).toLocaleDateString()}</Text>
            </View>
            <Pressable
              onPress={() => void unblock(b.profileId)}
              disabled={working === b.profileId}
              accessibilityRole="button"
              accessibilityLabel={`Unblock ${b.displayName}`}
              hitSlop={8}
              style={styles.unblock}
            >
              {working === b.profileId ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.unblockText}>Unblock</Text>
              )}
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = themedStyles((colors) => ({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: { padding: 4 },
  title: { ...type.h2, color: colors.textPrimary },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  intro: { ...type.body, color: colors.textSecondary },
  error: { ...type.caption, color: colors.danger },
  empty: { alignItems: 'center', gap: 8, paddingVertical: spacing.xl },
  emptyText: { ...type.body, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { ...type.body, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold' },
  meta: { ...type.caption, color: colors.textMuted },
  unblock: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 88,
    alignItems: 'center',
  },
  unblockText: { ...type.caption, color: colors.primary, fontFamily: 'Inter_600SemiBold' },
}));
