'use client';

import {
  formatReleaseMonth,
  parsePrefs,
  stateName,
  type PublicProfileDetail,
  type ReportReason,
} from '@heartlink/consumer-api';
import {
  Activity,
  ArrowUp,
  BookOpen,
  ChevronLeft,
  Clock,
  Feather,
  Flag,
  Gift,
  Globe,
  Heart,
  Home,
  Mail,
  MessageCircle,
  MoreVertical,
  PenLine,
  Phone,
  Slash,
  Sun,
  TrendingUp,
  User,
  UserX,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageSpinner, Spinner } from '@/components/ui/spinner';
import {
  useBlockProfile,
  usePublicProfile,
  useReportProfile,
  useSavedProfiles,
  useToggleSaved,
} from '@/lib/queries';

import { PhotoCarousel } from './photo-carousel';
import { Chip, ChipRow, DetailRow, SectionHeader, VitalsStrip } from './profile-bits';

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  letters: Mail,
  mail: Mail,
  'app messaging': MessageCircle,
  messaging: MessageCircle,
  phone: Phone,
  'phone calls': Phone,
  video: Video,
  'video visits': Video,
};

function channelIcon(label: string): LucideIcon {
  const key = label.toLowerCase();
  for (const candidate of Object.keys(CHANNEL_ICONS)) {
    if (key.includes(candidate)) return CHANNEL_ICONS[candidate];
  }
  return MessageCircle;
}

const REPORT_REASONS: { reason: ReportReason; label: string }[] = [
  { reason: 'inappropriate_content', label: 'Inappropriate content' },
  { reason: 'fake_identity', label: 'Pretending to be someone else' },
  { reason: 'policy_violation', label: 'Breaks the rules' },
];

export function ProfileDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data, isPending, isError, error, refetch } = usePublicProfile(id);
  const { data: saved } = useSavedProfiles();
  const toggleSaved = useToggleSaved();
  const blockProfile = useBlockProfile();
  const reportProfile = useReportProfile();

  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  const isSaved = (saved?.items ?? []).some((p) => p.id === id);

  if (isPending) return <PageSpinner label="Opening this profile…" />;

  if (isError) {
    return (
      <Fallback
        icon={UserX}
        title="We couldn't open this profile"
        body={
          error instanceof Error
            ? error.message
            : 'Something went wrong on our side. Please try again in a moment.'
        }
        action={
          <Button variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!data) {
    // A listing that has genuinely ended is not worth a "Try again" that would
    // only fail the same way, so this case is separated from the error above.
    return (
      <Fallback
        icon={UserX}
        title="This profile isn't available"
        body="It may have been removed, or the membership behind it has ended."
        action={
          <Button asChild variant="secondary">
            <Link href="/browse">Browse profiles</Link>
          </Button>
        }
      />
    );
  }

  const submitReport = (reason: ReportReason) => {
    reportProfile.mutate(
      { profileId: data.id, reason },
      {
        onSuccess: () => {
          setReportOpen(false);
          toast.success('Thank you', {
            description: 'Our team will review this profile.',
          });
        },
        onError: () =>
          toast.error('We could not send that report', {
            description: 'Please try again in a moment.',
          }),
      },
    );
  };

  const submitBlock = () => {
    blockProfile.mutate(data.id, {
      onSuccess: () => {
        setBlockOpen(false);
        toast.success(`${data.displayName} is blocked`, {
          description: 'You can undo this from your account.',
        });
        router.replace('/browse');
      },
      onError: () =>
        toast.error('We could not block that profile', {
          description: 'Please try again in a moment.',
        }),
    });
  };

  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="More options"
          className="grid size-9 place-items-center rounded-full bg-surface/90 text-ink shadow-sm transition-transform hover:bg-surface active:scale-95"
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => toggleSaved.mutate({ id: data.id, saved: isSaved })}
        >
          <Heart className={isSaved ? 'size-4 fill-primary text-primary' : 'size-4 text-ink-faint'} />
          {isSaved ? 'Remove from Liked' : 'Like'}
        </DropdownMenuItem>
        {data.acceptsMail ? (
          <DropdownMenuItem
            // Writing is gated on liking first, the same as on the phone: the
            // mailbox is not a way around that step.
            disabled={!isSaved}
            onSelect={() =>
              router.push(
                `/mailbox?compose=${data.id}&name=${encodeURIComponent(data.displayName)}`,
              )
            }
          >
            <PenLine className="size-4 text-ink-faint" />
            {isSaved ? 'Write a letter' : 'Like first to write'}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => router.push(`/sponsor?profile=${data.id}`)}>
          <Gift className="size-4 text-ink-faint" />
          Sponsor membership
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setReportOpen(true)}>
          <Flag className="size-4 text-ink-faint" />
          Report profile
        </DropdownMenuItem>
        <DropdownMenuItem destructive onSelect={() => setBlockOpen(true)}>
          <Slash className="size-4" />
          Block {data.displayName}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="lg:flex">
      {/* Photo pane: full-bleed above the story on a phone, a sticky column
          beside it once there is room for the two side by side. */}
      <div className="relative lg:sticky lg:top-0 lg:h-dvh lg:w-[46%] lg:shrink-0">
        <PhotoCarousel
          photos={data.photos ?? []}
          fallbackUrl={data.primaryPhotoUrl}
          name={data.displayName}
          age={data.age}
          state={stateName(data.facility?.state)}
          verified={data.isVerified}
          className="aspect-[5/4] w-full lg:aspect-auto lg:h-full"
        />
        <div className="absolute inset-x-4 top-4 flex items-start justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="grid size-9 place-items-center rounded-full bg-surface/90 text-ink shadow-sm transition-transform hover:bg-surface active:scale-95"
          >
            <ChevronLeft className="size-5" />
          </button>
          {actionsMenu}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-2xl px-5 pb-28 pt-6 lg:px-10 lg:pb-16">
          <Story data={data} />
        </div>

        {/* The two things worth doing here follow the story down the page and
            stop at the bottom of the viewport, so they are always in reach
            without covering the bio. */}
        <div className="sticky bottom-0 border-t border-line bg-surface/95 pb-[calc(env(safe-area-inset-bottom)+4.5rem)] pt-4 backdrop-blur-sm lg:pb-6">
          <div className="mx-auto flex max-w-2xl gap-3 px-5 lg:px-10">
            <Button
              variant="secondary"
              className="flex-1"
              aria-pressed={isSaved}
              onClick={() => toggleSaved.mutate({ id: data.id, saved: isSaved })}
            >
              <Heart className={isSaved ? 'size-4 fill-primary text-primary' : 'size-4'} />
              {isSaved ? 'Liked' : 'Like'}
            </Button>
            {data.acceptsMail ? (
              <Button
                className="flex-1"
                disabled={!isSaved}
                title={isSaved ? undefined : 'Like this profile before writing'}
                onClick={() =>
                  router.push(
                    `/mailbox?compose=${data.id}&name=${encodeURIComponent(data.displayName)}`,
                  )
                }
              >
                <PenLine className="size-4" />
                {isSaved ? 'Write a letter' : 'Like first to write'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogTitle>Report this profile</DialogTitle>
          <DialogDescription>
            Tell us what the problem is and our team will review it. Reporting does not block
            them.
          </DialogDescription>
          <div className="mt-5 grid gap-2">
            {REPORT_REASONS.map((option) => (
              <Button
                key={option.reason}
                variant="secondary"
                disabled={reportProfile.isPending}
                onClick={() => submitReport(option.reason)}
              >
                {reportProfile.isPending ? <Spinner size="sm" /> : null}
                {option.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogTitle>Block {data.displayName}?</DialogTitle>
          <DialogDescription>
            They will no longer appear when you browse, and you will not receive letters from
            them. You can undo this from your account.
          </DialogDescription>
          <div className="mt-6 flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setBlockOpen(false)}
              disabled={blockProfile.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={submitBlock}
              disabled={blockProfile.isPending}
            >
              {blockProfile.isPending ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
              Block
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The editorial column. Every section draws only when the API supplied its
 * data, so a sparse profile reads as short rather than as a page of empty
 * headings — and admin-only intake fields never reach this surface.
 */
function Story({ data }: { data: PublicProfileDetail }) {
  const prefs = parsePrefs(data.matchPreferences);

  const basics: { label: string; icon: LucideIcon }[] = [];
  const pushBasic = (value: string | null, icon: LucideIcon) => {
    if (value) basics.push({ label: value, icon });
  };
  pushBasic(prefs.heightRange, ArrowUp);
  pushBasic(prefs.iAm, User);
  pushBasic(prefs.religion, Sun);
  pushBasic(prefs.exercise, Activity);
  pushBasic(prefs.education, BookOpen);
  pushBasic(prefs.tattoos, Feather);
  pushBasic(prefs.kids, Users);
  pushBasic(prefs.politicalViews, Flag);
  if (prefs.languages.length) basics.push({ label: prefs.languages.join(' & '), icon: Globe });

  const hopes: { icon: LucideIcon; label: string; value: string }[] = [];
  if (prefs.interestedIn) hopes.push({ icon: User, label: 'Interested in', value: prefs.interestedIn });
  if (prefs.relationshipPace)
    hopes.push({ icon: TrendingUp, label: 'Relationship pace', value: prefs.relationshipPace });
  if (prefs.futureExpectations)
    hopes.push({ icon: Clock, label: 'Looking ahead', value: prefs.futureExpectations });
  if (prefs.loveLanguage)
    hopes.push({ icon: Mail, label: 'Love language', value: prefs.loveLanguage });

  const hasHopes = Boolean(prefs.seeking) || prefs.emotionalIntentions.length > 0 || hopes.length > 0;
  const release = data.releaseDate ? formatReleaseMonth(data.releaseDate) : null;

  return (
    <div>
      {prefs.typeOfConnection.length ? (
        <p className="text-[11.5px] font-bold uppercase tracking-[2px] text-gold">
          {prefs.typeOfConnection.join(' · ')}
        </p>
      ) : null}

      {/* The name is already over the photo above, so it is not repeated here
          on a phone; on desktop the photo is beside the column, not above it. */}
      <div className="mt-1 hidden items-baseline gap-2.5 lg:flex">
        <h1 className="font-[family-name:var(--font-bree)] text-3xl text-ink">
          {data.displayName}
        </h1>
        {data.age != null ? <span className="text-xl text-ink-soft">{data.age}</span> : null}
      </div>

      {/* Facts before prose, the order the client's card uses. A full bio is
          often several hundred words, and leading with it buried when someone
          is coming home and whether they take mail — which is what most people
          open a profile to find out — under a wall of text. */}
      <VitalsStrip
        releaseDate={release}
        state={stateName(data.facility?.state)}
        acceptsMail={data.acceptsMail}
      />

      {data.bio ? (
        <p className="mt-5 whitespace-pre-line text-[15px] leading-7 text-ink-soft">{data.bio}</p>
      ) : null}

      {basics.length ? (
        <>
          <SectionHeader label="The basics" />
          <ChipRow>
            {basics.map((item) => (
              <Chip key={item.label} label={item.label} icon={item.icon} />
            ))}
          </ChipRow>
        </>
      ) : null}

      {hasHopes ? (
        <>
          <SectionHeader label="What I'm hoping to find" />
          {prefs.seeking ? (
            <p className="mt-3 text-[15px] leading-7 text-ink-soft">{prefs.seeking}</p>
          ) : null}
          {prefs.emotionalIntentions.length ? (
            <>
              <p className="mt-4 text-[13px] font-bold text-ink">Hoping to share</p>
              <ChipRow>
                {prefs.emotionalIntentions.map((item) => (
                  <Chip key={item} label={item} />
                ))}
              </ChipRow>
            </>
          ) : null}
          {hopes.length ? (
            <div className="mt-5">
              {hopes.map((row) => (
                <DetailRow key={row.label} icon={row.icon} label={row.label} value={row.value} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {prefs.valuesLifestyle.length ? (
        <>
          <SectionHeader label="Values & lifestyle" />
          <ChipRow>
            {prefs.valuesLifestyle.map((item) => (
              <Chip key={item} label={item} />
            ))}
          </ChipRow>
        </>
      ) : null}

      {data.interests.length ? (
        <>
          <SectionHeader label="Interests" />
          <ChipRow>
            {data.interests.map((item) => (
              <Chip key={item} label={item} />
            ))}
          </ChipRow>
        </>
      ) : null}

      {prefs.communicationChannels.length || data.locationDescription ? (
        <>
          <SectionHeader label="Ways to connect" />
          {prefs.communicationChannels.length ? (
            <ChipRow>
              {prefs.communicationChannels.map((channel) => (
                <Chip key={channel} label={channel} icon={channelIcon(channel)} />
              ))}
            </ChipRow>
          ) : null}
          {data.locationDescription ? (
            <div className="mt-5">
              <DetailRow icon={Home} label="Writes from" value={data.locationDescription} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Fallback({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="grid size-16 place-items-center rounded-full border border-gold bg-gold-faint">
        <Icon className="size-7 text-gold" />
      </span>
      <h1 className="mt-5 font-[family-name:var(--font-bree)] text-xl text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}
