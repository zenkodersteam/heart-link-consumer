'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, CopyMinus, Upload } from 'lucide-react';
import type { FacilityImportResponse } from '@heartlink/api-contract';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { importFacilities } from '../../lib/actions';
import { cn } from '../../lib/utils';

const TEMPLATE = 'name,state,addressLine1,addressLine2,city,zip,notes';

/**
 * Bring in a spreadsheet of facilities.
 *
 * Checked before it is committed, and the check is shown, because these rows
 * decide where physical letters are posted: a wrong address is invisible from
 * everywhere else in the system, and only shows up as mail that never arrives.
 *
 * So the flow is deliberately two steps — see what the file would do, then say
 * yes — rather than one button that writes immediately.
 */
export function FacilityImportDialog() {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<FacilityImportResponse | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const reset = () => {
    setCsv('');
    setPreview(null);
  };

  const check = () =>
    startTransition(async () => {
      try {
        setPreview(await importFacilities(csv, false));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'That file could not be read');
      }
    });

  const commit = () =>
    startTransition(async () => {
      try {
        const result = await importFacilities(csv, true);
        toast.success(
          result.created === 1
            ? 'One facility added'
            : `${result.created} facilities added`,
        );
        setOpen(false);
        reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'The import did not complete');
      }
    });

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void file.text().then((text) => {
      setCsv(text);
      setPreview(null);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="size-4" /> Import from a spreadsheet
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import facilities</DialogTitle>
          </DialogHeader>

          <p className="text-[13px] leading-6 text-text-muted">
            Nothing is saved until you have seen what the file would do. Expected columns:{' '}
            <span className="font-mono text-[12px] text-text">{TEMPLATE}</span>
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFile}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              Choose a file
            </Button>
            <span className="text-[12px] text-text-muted">or paste below</span>
          </div>

          <Textarea
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              // The preview described the previous text; keeping it on screen
              // beside changed input would be describing the wrong file.
              setPreview(null);
            }}
            rows={8}
            placeholder={TEMPLATE}
            className="font-mono text-[12px]"
          />

          {preview ? <ImportPreview preview={preview} /> : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            {preview ? (
              <Button
                variant="primary"
                size="sm"
                disabled={pending || preview.ready === 0}
                onClick={commit}
              >
                {pending
                  ? 'Importing…'
                  : preview.ready === 0
                    ? 'Nothing to import'
                    : `Import ${preview.ready}`}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={pending || csv.trim().length === 0}
                onClick={check}
              >
                {pending ? 'Checking…' : 'Check the file'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ImportPreview({ preview }: { preview: FacilityImportResponse }) {
  const problems = preview.rows.filter((r) => r.outcome !== 'ready');

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface/40 p-3">
      <div className="flex flex-wrap items-center gap-4 text-[13px]">
        <Tally icon={<Check className="size-3.5" />} tone="success" n={preview.ready} label="ready to add" />
        <Tally icon={<CopyMinus className="size-3.5" />} tone="muted" n={preview.duplicates} label="already on file" />
        <Tally icon={<AlertTriangle className="size-3.5" />} tone="danger" n={preview.errors} label="cannot be read" />
      </div>

      {/* Only the rows needing attention. Listing the good ones would bury them. */}
      {problems.length > 0 ? (
        <ul className="max-h-48 overflow-y-auto text-[12px] leading-5">
          {problems.map((r) => (
            <li key={r.line} className="border-t border-border py-1.5 first:border-t-0">
              <span className="font-medium text-text">Line {r.line}</span>
              {r.name ? <span className="text-text-muted"> · {r.name}</span> : null}
              <span
                className={cn(
                  'ml-1',
                  r.outcome === 'duplicate' ? 'text-text-muted' : 'text-danger',
                )}
              >
                — {r.problems.join('; ')}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Tally({
  icon,
  n,
  label,
  tone,
}: {
  icon: React.ReactNode;
  n: number;
  label: string;
  tone: 'success' | 'danger' | 'muted';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        tone === 'success' && 'text-success',
        tone === 'danger' && n > 0 ? 'text-danger' : '',
        tone === 'muted' && 'text-text-muted',
      )}
    >
      {icon}
      <span className="font-medium">{n}</span> {label}
    </span>
  );
}
