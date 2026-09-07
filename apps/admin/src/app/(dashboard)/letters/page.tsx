import { serverApi } from '../../../lib/api';
import { LetterApprovalList } from '../../../components/letters/LetterApprovalList';
import { MarkSectionSeen } from '../../../components/shell/MarkSectionSeen';

export const dynamic = 'force-dynamic';

/**
 * Letters awaiting approval.
 *
 * The API for this existed from M1 and nothing called it, so every letter a
 * member wrote sat at `awaiting_approval` with no screen able to move it —
 * correspondence was collected and never sent.
 */
export default async function LettersPage() {
  const api = await serverApi();
  const pending = await api.listPendingCommunications();

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <MarkSectionSeen section="letters" />
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <h1 className="font-serif text-2xl leading-[34px] text-text">Letters for approval</h1>
        <span className="text-sm text-text-muted">
          {pending.total} waiting
        </span>
      </header>
      <p className="max-w-2xl text-sm leading-6 text-text-muted">
        Every letter is read before it is posted. Approving sends it to the print queue; rejecting
        tells the member and returns their letter credit.
      </p>
      <LetterApprovalList items={pending.items} />
    </div>
  );
}
