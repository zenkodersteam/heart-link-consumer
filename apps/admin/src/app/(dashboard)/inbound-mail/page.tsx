import { CheckCircle2, MailOpen } from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '../../../components/ui/card';
import { PageHero } from '../../../components/layout/PageHero';
import { InboundMailForm } from '../../../components/inbound-mail/InboundMailForm';
import { serverApi } from '../../../lib/api';

export const dynamic = 'force-dynamic';

interface InboundMailPageProps {
  searchParams: Promise<{
    ok?: string;
    threadId?: string;
    documentId?: string;
  }>;
}

export default async function InboundMailPage({ searchParams }: InboundMailPageProps) {
  const { ok, threadId, documentId } = await searchParams;
  const recorded = ok === '1' && Boolean(threadId) && Boolean(documentId);
  const api = await serverApi();
  const [profilesResult, usersResult] = await Promise.allSettled([
    api.listProfiles({ limit: 100 }),
    api.listAdminUsers({ limit: 100 }),
  ]);
  const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.items : [];
  const users = usersResult.status === 'fulfilled' ? usersResult.value.items : [];

  return (
    <div className="flex w-full flex-col gap-6 p-8">
      {/* Was a hand-rolled heading, so this screen sat at a different size and
          weight from every other page in the portal. */}
      <PageHero
        eyebrow="Inbound Mail"
        title="Inbound Mail"
        description="Log a scanned inmate reply and attach it to the correct mailbox thread so the outside user sees it in their conversation."
      />

      {recorded ? (
        <Card className="animate-fade-up border-success/30">
          <CardBody className="gap-1 p-5">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 aria-hidden className="size-[18px]" />
              <span className="text-sm font-semibold">Reply recorded</span>
            </div>
            <p className="text-sm text-text-muted">
              The scan was attached to thread{' '}
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-text">
                {threadId}
              </code>{' '}
              as document{' '}
              <code className="rounded bg-surface px-1.5 py-0.5 text-xs text-text">
                {documentId}
              </code>
              .
            </p>
          </CardBody>
        </Card>
      ) : null}

      <Card className="animate-fade-up max-w-3xl" style={{ animationDelay: '60ms' }}>
        <CardHeader className="flex flex-row items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-gold-tint text-accent-gold">
            <MailOpen aria-hidden className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <CardTitle>Record a scanned reply</CardTitle>
            <p className="mt-1 text-sm text-text-muted">
              Choose the inmate profile and outside user, then upload the scan. It joins the
              existing thread for that pair, or opens one.
            </p>
          </div>
        </CardHeader>
        <CardBody className="p-6">
          <InboundMailForm profiles={profiles} users={users} />
        </CardBody>
      </Card>
    </div>
  );
}
