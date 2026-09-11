'use client';

import { useMemo, useState, useTransition } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { toast } from 'sonner';
import { ACTIVE_FORM_SCHEMA, type FieldSpec } from '@heartlink/domain';

import type { IntakeDocument } from '@heartlink/api-contract';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { updateDocumentFields } from '../../lib/actions';
import { bucketConfidence, type ConfidenceBucket } from '../../lib/confidence';
import { cn } from '../../lib/utils';
import { Select } from '../ui/select';
import { Checkbox } from '../ui/checkbox';

/**
 * Right panel of the review workspace - header strip + scrollable list of
 * editable fields, per Figma `17:222`. Every renderer is dispatched purely on
 * `FieldSpec.type` / `multi` / `multiLine` so adding or removing a field in
 * the domain schema file requires zero changes here (hot-swap contract).
 *
 * Field-state shape:
 *   - boolean → string ('true' | 'false'), wire-format matches `FieldValue`
 *     Zod schema and the mapper's string outputs.
 *   - multi-select enum → string[] (RHF Controller, not register)
 *   - everything else → string
 * null is re-serialized from "" on submit; the server accepts all three.
 */

type FieldValue = string | string[];
type FieldFormState = Record<string, FieldValue>;

export function OcrFieldEditor({
  applicationId,
  document,
  className,
}: {
  applicationId: string;
  document: IntakeDocument | null;
  className?: string;
}) {
  const scores = (document?.ocrConfidenceScores ?? {}) as Record<
    string,
    number | null
  >;
  const initialValues = useMemo(() => buildInitialValues(document), [document]);

  const form = useForm<FieldFormState>({
    defaultValues: initialValues,
  });

  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const onSubmit = (values: FieldFormState) => {
    if (!document) {
      toast.error('No document to save fields for.');
      return;
    }
    const changed: Record<string, string | string[] | null> = {};
    for (const [k, v] of Object.entries(values)) {
      if (!valuesEqual(initialValues[k], v)) {
        // Normalize empty string → null so downstream clears correctly.
        changed[k] = typeof v === 'string' && v === '' ? null : v;
      }
    }
    if (Object.keys(changed).length === 0) {
      toast.info('No changes to save.');
      return;
    }
    startTransition(async () => {
      const result = await updateDocumentFields({
        documentId: document.id,
        applicationId,
        fields: changed,
      });
      if (!result.ok) {
        toast.error('Could not save', { description: result.error });
        return;
      }
      setSavedAt(new Date());
      toast.success('Changes saved');
      form.reset(values);
    });
  };

  // Nothing came back pre-filled: say so once, in plain words, rather than
  // leaving a page of blank boxes that looks like a failure to load.
  const prefilled = Object.values(initialValues).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== '',
  );
  const dirty = form.formState.isDirty;

  return (
    <form
      id="ocr-field-editor-form"
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn('flex min-h-0 flex-col overflow-hidden bg-background', className)}
    >
      {/* Save sits with the fields it saves. It used to have a bar of its own
          at the foot of this panel, directly above the page's decision bar —
          two rows of buttons stacked at the bottom of one screen. */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-2.5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-5 text-text">Applicant details</h2>
          <p className="text-[11px] leading-4 text-text-muted">
            {dirty
              ? 'Unsaved changes'
              : savedAt
                ? `Saved at ${savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                : 'Check each field against the document'}
          </p>
        </div>
        <div className="flex-1" />
        <Button
          type="submit"
          size="sm"
          variant={dirty ? 'primary' : 'outline'}
          disabled={isPending || !document || !dirty}
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>

      {/* Scrollable field list, grouped by the PDF's printed sections */}
      <div className="@container min-h-0 flex-1 overflow-auto pb-4">
        {document && !prefilled ? (
          <p className="mx-4 mt-3 rounded-md bg-surface px-3 py-2 text-xs leading-5 text-text-muted">
            Nothing could be filled in automatically for this document. Enter the details as they
            appear on the form.
          </p>
        ) : null}
        {groupFieldsBySection(ACTIVE_FORM_SCHEMA).map((group) => (
          <section key={group.title ?? 'fields'}>
            {group.title ? (
              // Sticky, because the section is the only thing telling a reviewer
              // which part of the paper form they are looking at.
              <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 pb-2 pt-4 backdrop-blur">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-muted">
                  {group.title}
                </span>
              </div>
            ) : null}
            {/* Two columns once the pane is wide enough. */}
            <div className="grid items-start gap-x-4 gap-y-3.5 px-5 pb-2 pt-3 @xl:grid-cols-2">
              {group.fields.map((field) => (
                <FieldRow
                  key={field.key}
                  field={field}
                  confidence={scores[field.key] ?? null}
                  control={form.control}
                  register={form.register}
                  disabled={isPending || !document}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </form>
  );
}

/**
 * A field the scan was unsure of: an amber or red edge, and a "Check" tag.
 *
 * In words a reviewer uses rather than a percentage. Fields with no reading at
 * all keep the ordinary border — on a form nothing was read from, every one of
 * them being dashed was noise, not a signal.
 */
function doubtBorder(bucket: ConfidenceBucket): string {
  if (bucket === 'low') return 'border-danger/70 focus-visible:ring-danger/25';
  if (bucket === 'mid') return 'border-warning/70 focus-visible:ring-warning/25';
  return '';
}

/**
 * Split schema fields into display groups per `FormSchema.sections` (a section
 * starts at its firstKey and runs to the next section). Schemas without
 * sections yield one untitled group, preserving the flat-list behavior.
 */
function groupFieldsBySection(schema: typeof ACTIVE_FORM_SCHEMA): Array<{
  title: string | null;
  fields: FieldSpec[];
}> {
  const sections = schema.sections ?? [];
  if (sections.length === 0) return [{ title: null, fields: schema.fields }];
  const startTitles = new Map(sections.map((s) => [s.firstKey, s.title]));
  const groups: Array<{ title: string | null; fields: FieldSpec[] }> = [];
  for (const field of schema.fields) {
    const title = startTitles.get(field.key);
    if (title !== undefined || groups.length === 0) {
      groups.push({ title: title ?? null, fields: [] });
    }
    groups[groups.length - 1]!.fields.push(field);
  }
  return groups;
}

function FieldRow({
  field,
  confidence,
  control,
  register,
  disabled,
}: {
  field: FieldSpec;
  confidence: number | null;
  control: Control<FieldFormState>;
  register: ReturnType<typeof useForm<FieldFormState>>['register'];
  disabled?: boolean;
}) {
  const bucket = bucketConfidence(confidence);
  const borderCls = doubtBorder(bucket);
  const doubtful = bucket === 'low' || bucket === 'mid';
  const id = `ocr-field-${field.key}`;
  const name = field.key;
  const isMultiEnum = field.type === 'enum' && field.multi === true;
  const wide = field.multiLine === true || isMultiEnum;

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', wide && '@xl:col-span-2')}>
      <div className="flex items-center gap-2">
        <label
          htmlFor={id}
          className="truncate text-xs font-medium leading-4 text-text"
        >
          {field.label}
          {field.required && <span className="ml-0.5 text-danger">*</span>}
        </label>
        <div className="flex-1" />
        {doubtful ? (
          <span
            className={cn(
              'rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide',
              bucket === 'low' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning',
            )}
          >
            Check
          </span>
        ) : null}
      </div>

      {field.multiLine ? (
        // Sized to what is in it. Fixed rows gave every long-text field the same
        // box whether it held nothing or six lines: the two empty ones ate a
        // third of the section, while the bio - the one a reviewer actually has
        // to read - was clipped mid-sentence behind an inner scrollbar. It
        // grows to fit and only starts scrolling past a screenful.
        <Textarea
          id={id}
          rows={2}
          disabled={disabled}
          className={cn(borderCls, 'field-sizing-content max-h-72 min-h-[42px]')}
          {...register(name)}
        />
      ) : field.type === 'boolean' ? (
        <Controller
          control={control}
          name={name}
          render={({ field: rhf }) => (
            <label
              htmlFor={id}
              className={cn('flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-border px-2.5', borderCls)}
            >
              <Checkbox
                id={id}
                disabled={disabled}
                checked={rhf.value === 'true'}
                onChange={(e) => rhf.onChange(e.target.checked ? 'true' : 'false')}
                className="size-4 rounded border-border text-primary focus:ring-primary/30"
              />
              <span className="text-sm text-text">
                {rhf.value === 'true' ? 'Yes' : 'No'}
              </span>
            </label>
          )}
        />
      ) : field.type === 'date' ? (
        <Input
          id={id}
          type="date"
          disabled={disabled}
          className={cn(borderCls)}
          {...register(name)}
        />
      ) : field.type === 'number' ? (
        <Input
          id={id}
          type="number"
          inputMode="numeric"
          disabled={disabled}
          className={cn(borderCls)}
          {...register(name)}
        />
      ) : field.type === 'enum' && !isMultiEnum ? (
        <Controller
          control={control}
          name={name}
          render={({ field: rhf }) => (
            <Select
              id={id}
              disabled={disabled}
              className={cn('w-full', borderCls)}
              value={typeof rhf.value === 'string' ? rhf.value : ''}
              onValueChange={rhf.onChange}
              options={[
                { value: '', label: 'Select…' },
                ...(field.enumValues ?? []).map((v) => ({
                  value: v,
                  label: humanizeEnumValue(v),
                })),
              ]}
            />
          )}
        />
      ) : isMultiEnum ? (
        <Controller
          control={control}
          name={name}
          render={({ field: rhf }) => (
            <MultiEnumCheckboxGroup
              field={field}
              disabled={disabled}
              value={Array.isArray(rhf.value) ? rhf.value : []}
              onChange={rhf.onChange}
            />
          )}
        />
      ) : (
        <Input
          id={id}
          type="text"
          disabled={disabled}
          className={cn(borderCls)}
          {...register(name)}
        />
      )}
    </div>
  );
}

function MultiEnumCheckboxGroup({
  field,
  disabled,
  value,
  onChange,
}: {
  field: FieldSpec;
  disabled?: boolean;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const max = field.maxSelections;
  const atCap = typeof max === 'number' && value.length >= max;

  function toggle(v: string) {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      if (atCap) return;
      onChange([...value, v]);
    }
  }

  return (
    <div className="rounded-sm border border-border px-2.5 py-2">
      <div className="mb-1.5 flex items-center justify-between text-[11px] text-text-muted">
        <span>
          {value.length}
          {typeof max === 'number' ? ` / ${max}` : ''} selected
        </span>
        {atCap && typeof max === 'number' && (
          <span className="text-warning">Max {max} - uncheck one to change</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {(field.enumValues ?? []).map((v) => {
          const checked = value.includes(v);
          const disabledByCap = !checked && atCap;
          return (
            <label
              key={v}
              className={cn(
                'flex items-center gap-2 text-sm',
                disabled || disabledByCap ? 'opacity-60' : '',
              )}
            >
              <Checkbox
                disabled={disabled || disabledByCap}
                checked={checked}
                onChange={() => toggle(v)}
              />
              <span>{humanizeEnumValue(v)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * `snake_case_value` → `Snake Case Value`. Preserves numeric-only values
 * (e.g. photo_numbers_included entries "1"…"6") without mangling them.
 */
function humanizeEnumValue(v: string): string {
  if (/^\d+$/.test(v)) return v;
  return v
    .split('_')
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

function buildInitialValues(document: IntakeDocument | null): FieldFormState {
  const out: FieldFormState = {};
  const stored = (document?.ocrExtractedFields?.fields ?? {}) as Record<
    string,
    string | string[] | null
  >;
  for (const f of ACTIVE_FORM_SCHEMA.fields) {
    const raw = stored[f.key];
    if (f.type === 'enum' && f.multi === true) {
      out[f.key] = Array.isArray(raw) ? raw : [];
    } else if (Array.isArray(raw)) {
      // Defensive: if storage has an array for a scalar field, join it.
      out[f.key] = raw.join(', ');
    } else {
      out[f.key] = raw ?? '';
    }
  }
  return out;
}

function valuesEqual(a: FieldValue | undefined, b: FieldValue | undefined): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  return (a ?? '') === (b ?? '');
}
