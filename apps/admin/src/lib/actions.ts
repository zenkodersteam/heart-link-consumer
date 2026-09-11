'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { serverApi } from './api';
import { isRedirectError } from './redirect-error';
import type {
  FacilityImportResponse,
  Profile,
  UpdateModerationFlagInput,
} from '@heartlink/api-contract';
import {


  TransitionSchema,
  FieldsSchema,
  UpdateProfileSchema,
  TransitionProfileSchema,
  ModeratePhotoSchema,
  SetPrimaryPhotoSchema,
  DeletePhotoSchema,
  BulkModeratePhotosSchema,
  RecordPaymentSchema,
  ConfirmPaymentSchema,
  MatchPaymentSchema,
  PaymentReasonSchema,
  CreateApplicationSchema,
  CreateFacilitySchema,
  UpdateFacilitySchema,
  CreateResourceCategorySchema,
  UpdateResourceCategorySchema,
  CreateResourceSchema,
  UpdateResourceSchema,
  type TransitionInput,
  type FieldsInput,
  type CreateApplicationInput,
  type UpdateProfileInput,
  type TransitionProfileInput,
  type ModeratePhotoInput,
  type SetPrimaryPhotoInput,
  type DeletePhotoInput,
  type BulkModeratePhotosInput,
  type RecordPaymentInput,
  type ConfirmPaymentInput,
  type MatchPaymentInput,
  type PaymentReasonInput,
  type CreateFacilityInput,
  type UpdateFacilityInput,
  type CreateResourceCategoryInput,
  type UpdateResourceCategoryInput,
  type CreateResourceInput,
  type UpdateResourceInput,
} from './schemas';

/**
 * Validate an action's input and fail with something a person can read.
 *
 * `schema.parse()` throws a ZodError whose `.message` is the JSON-encoded array
 * of issues. Every form here shows `err.message` in a toast, so a single empty
 * field surfaced as
 *
 *   [ { "origin": "string", "code": "too_small", "minimum": 2, ... } ]
 *
 * on screen, which tells the person nothing and looks like a crash. The issue
 * messages are already written for humans - this just uses them.
 */
function parseInput<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const message = result.error.issues
    .map((issue) => issue.message)
    .filter(Boolean)
    .join(' ');
  throw new Error(message || 'Some of those details are not valid.');
}

export async function transitionApplicationStatus(
  input: TransitionInput,
): Promise<void> {
  const data = parseInput(TransitionSchema, input);
  const api = await serverApi();
  await api.transitionApplication(data.id, {
    status: data.status,
    reviewOutcome: data.reviewOutcome,
    reviewNotes: data.reviewNotes,
  });
  revalidatePath('/intake');
  revalidatePath(`/intake/${data.id}`);
  revalidatePath('/intake/review', 'layout');
  if (data.nextPath) redirect(data.nextPath);
}

export async function createApplication(
  input: CreateApplicationInput,
): Promise<{ id: string; applicationNumber: string }> {
  const data = parseInput(CreateApplicationSchema, input);
  const api = await serverApi();
  const created = await api.createApplication({
    facilityId: data.facilityId,
    sourceChannel: data.sourceChannel,
    assignedStaffId: data.assignedStaffId,
  });
  revalidatePath('/intake');
  revalidatePath(`/intake/${created.id}`);
  return { id: created.id, applicationNumber: created.applicationNumber };
}

export async function uploadApplicationScan(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const applicationId = formData.get('applicationId');
  const file = formData.get('file');
  if (typeof applicationId !== 'string' || applicationId.length === 0) {
    return { error: 'applicationId is required' };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Please select a scanned application to upload' };
  }
  if (!INBOUND_SCAN_ACCEPTED_MIME.has(file.type)) {
    return {
      error: `Unsupported file type: ${file.type || 'unknown'} (PDF, JPEG, or PNG only)`,
    };
  }
  if (file.size > INBOUND_SCAN_MAX_BYTES) {
    return { error: 'File must be 10 MB or smaller' };
  }

  const api = await serverApi();
  await api.uploadApplicationDocument(applicationId, file, {
    type: 'scanned_application',
    ingestionSource: 'operator_upload',
  });
  revalidatePath('/intake');
  revalidatePath(`/intake/${applicationId}`);
  revalidatePath(`/intake/review/${applicationId}`);
  return { ok: true as const };
}

export async function updateDocumentFields(input: FieldsInput): Promise<{ ok: true }> {
  const data = parseInput(FieldsSchema, input);
  const api = await serverApi();
  await api.updateDocumentFields(data.documentId, { fields: data.fields });
  revalidatePath(`/intake/${data.applicationId}`);
  revalidatePath(`/intake/review/${data.applicationId}`);
  return { ok: true as const };
}

/**
 * A fresh signed URL for one document.
 *
 * Two reasons the viewer needs this rather than only the `presignedUrl` that
 * comes back on the document list:
 *
 *   - the list endpoint does not always carry one, and a viewer with no URL
 *     shows an empty pane for a document that is sitting right there in S3;
 *   - the ones it does carry expire in fifteen minutes, which is less than a
 *     reviewer spends on a stack of applications. A tab left open came back to
 *     a 403 and no way to recover short of a reload.
 *
 * The client method existed and had no callers.
 */
export async function refreshDocumentUrl(documentId: string): Promise<string | null> {
  const id = parseInput(z.string().uuid(), documentId);
  const api = await serverApi();
  try {
    const { url } = await api.getDocumentPresignedUrl(id);
    return url ?? null;
  } catch {
    // The viewer already has a "could not load" state; a thrown server action
    // would replace the whole screen with an error boundary instead.
    return null;
  }
}

// =============================================================================
// Profiles (M3 W7)
// =============================================================================

export async function updateProfile(input: UpdateProfileInput): Promise<void> {
  const data = parseInput(UpdateProfileSchema, input);
  const api = await serverApi();
  const { id, ...rest } = data;
  await api.updateProfile(id, rest);
  revalidatePath('/profiles');
  revalidatePath(`/profiles/${id}`);
}

/**
 * What a server action hands back when it can fail in a way a person should read.
 *
 * Returned, not thrown. In a production build Next replaces the message of any
 * error thrown out of a server action with React's generic #441 ("An error
 * occurred in the Server Components render…"), so the API's own explanation —
 * "this profile cannot be paused from its current status", say — never reached
 * the toast. Everyone saw "Minified React error #441" instead.
 */
export type ActionResult = { ok: true } | { ok: false; error: string };

async function attempt(work: () => Promise<void>): Promise<ActionResult> {
  try {
    await work();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error && err.message ? err.message : 'Something went wrong. Please try again.',
    };
  }
}

export async function transitionProfile(input: TransitionProfileInput): Promise<ActionResult> {
  return attempt(async () => {
    const data = parseInput(TransitionProfileSchema, input);
    const api = await serverApi();
    await api.transitionProfile(data.id, {
      status: data.status,
      notes: data.notes,
    });
    revalidatePath('/profiles');
    revalidatePath(`/profiles/${data.id}`);
  });
}

export async function activateProfile(profileId: string): Promise<ActionResult> {
  return attempt(async () => {
    if (typeof profileId !== 'string' || profileId.length === 0) {
      throw new Error('No profile was selected.');
    }
    const api = await serverApi();
    await api.activateProfile(profileId);
    revalidatePath('/profiles');
    revalidatePath(`/profiles/${profileId}`);
  });
}

export async function moderatePhoto(input: ModeratePhotoInput): Promise<void> {
  const data = parseInput(ModeratePhotoSchema, input);
  const api = await serverApi();
  await api.moderateProfilePhoto(data.profileId, data.photoId, {
    status: data.status,
    notes: data.notes,
  });
  revalidatePath('/profiles');
  revalidatePath(`/profiles/${data.profileId}`);
  revalidatePath('/profiles/photo-review');
}

export async function setPrimaryPhoto(input: SetPrimaryPhotoInput): Promise<void> {
  const data = parseInput(SetPrimaryPhotoSchema, input);
  const api = await serverApi();
  await api.setPrimaryProfilePhoto(data.profileId, data.photoId);
  revalidatePath(`/profiles/${data.profileId}`);
}

export async function deletePhoto(input: DeletePhotoInput): Promise<void> {
  const data = parseInput(DeletePhotoSchema, input);
  const api = await serverApi();
  await api.deleteProfilePhoto(data.profileId, data.photoId);
  revalidatePath(`/profiles/${data.profileId}`);
}

const PHOTO_ACCEPTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const INBOUND_SCAN_ACCEPTED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const INBOUND_SCAN_MAX_BYTES = 10 * 1024 * 1024;

export async function importIntakePhotos(profileId: string): Promise<{ imported: number }> {
  if (!profileId) throw new Error('profileId is required');
  const api = await serverApi();
  const result = await api.importIntakeProfilePhotos(profileId);
  revalidatePath('/profiles');
  revalidatePath(`/profiles/${profileId}`);
  revalidatePath('/profiles/photo-review');
  return result;
}

/**
 * Upload one or more photos to a profile.
 *
 * Takes every `file` on the form rather than the first. A member's photos
 * arrive together — four in one envelope — and uploading them one dialog at a
 * time was four rounds of picking a file and waiting.
 *
 * Each is checked on its own and uploaded in sequence, so one photo the API
 * refuses does not throw away the others that were fine. What went wrong, and
 * for which file, comes back to the caller.
 */
export async function uploadPhoto(
  formData: FormData,
): Promise<{ uploaded: number; failures: Array<{ name: string; reason: string }> }> {
  const profileId = formData.get('profileId');
  if (typeof profileId !== 'string' || profileId.length === 0) {
    throw new Error('profileId is required');
  }

  const files = formData.getAll('file').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    throw new Error('Please select a photo to upload');
  }

  const api = await serverApi();
  const failures: Array<{ name: string; reason: string }> = [];
  let uploaded = 0;

  for (const file of files) {
    const reason = !PHOTO_ACCEPTED_MIME.has(file.type)
      ? `Unsupported photo type: ${file.type}`
      : file.size > PHOTO_MAX_BYTES
        ? 'Photo must be 10 MB or smaller'
        : null;
    if (reason) {
      failures.push({ name: file.name, reason });
      continue;
    }
    try {
      await api.uploadProfilePhoto(profileId, file);
      uploaded += 1;
    } catch (err) {
      failures.push({ name: file.name, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  revalidatePath('/profiles');
  revalidatePath(`/profiles/${profileId}`);
  revalidatePath('/profiles/photo-review');

  // Nothing at all got through: that is a failed action, not a partial one.
  if (uploaded === 0) {
    throw new Error(failures[0]?.reason ?? 'Could not upload that photo');
  }

  return { uploaded, failures };
}

export async function bulkModeratePhotos(
  input: BulkModeratePhotosInput,
): Promise<{ updated: number }> {
  const data = parseInput(BulkModeratePhotosSchema, input);
  const api = await serverApi();
  const result = await api.bulkModeratePhotos(data);
  revalidatePath('/profiles/photo-review');
  revalidatePath('/profiles');
  return result;
}

export async function recordInboundScan(
  formData: FormData,
): Promise<{ error: string } | void> {
  const profileId = formData.get('profileId');
  const userId = formData.get('userId');
  const file = formData.get('file');

  if (typeof profileId !== 'string' || profileId.trim().length === 0) {
    return { error: 'Profile ID is required' };
  }
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    return { error: 'User ID is required' };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Please select a scanned reply to upload' };
  }
  if (!INBOUND_SCAN_ACCEPTED_MIME.has(file.type)) {
    return {
      error: `Unsupported file type: ${file.type || 'unknown'} (PDF, JPEG, or PNG only)`,
    };
  }
  if (file.size > INBOUND_SCAN_MAX_BYTES) {
    return { error: 'File must be 10 MB or smaller' };
  }

  const forward = new FormData();
  forward.append('profileId', profileId.trim());
  forward.append('userId', userId.trim());
  const subject = formData.get('subject');
  if (typeof subject === 'string' && subject.trim().length > 0) {
    forward.append('subject', subject.trim());
  }
  forward.append('file', file);

  const api = await serverApi();
  let params: URLSearchParams;
  try {
    const result = await api.recordInboundScan(forward);
    revalidatePath('/inbound-mail');
    params = new URLSearchParams({
      ok: '1',
      threadId: result.threadId,
      documentId: result.documentId,
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to record inbound scan' };
  }

  // Outside the try on purpose: `redirect` reports itself by throwing, so a
  // redirect inside that block was caught by the same `catch` and returned as
  // `{ error: 'NEXT_REDIRECT;...' }` — every successful upload ended on an
  // error message, and the success card was never reached.
  redirect(`/inbound-mail?${params.toString()}`);
}

export async function moderateCommunication(input: {
  communicationId: string;
  status: 'approved' | 'rejected';
}): Promise<void> {
  if (!input.communicationId) throw new Error('communicationId is required');
  if (input.status !== 'approved' && input.status !== 'rejected') {
    throw new Error('status must be approved or rejected');
  }
  const api = await serverApi();
  await api.moderateCommunication(input.communicationId, { status: input.status });
  revalidatePath('/moderation');
}

export async function moderateOutsideProfile(input: {
  profileId: string;
  decision: 'approved' | 'rejected';
  notes?: string;
}): Promise<void> {
  if (!input.profileId) throw new Error('profileId is required');
  if (input.decision !== 'approved' && input.decision !== 'rejected') {
    throw new Error('decision must be approved or rejected');
  }
  const api = await serverApi();
  await api.moderateOutsideProfile(input.profileId, {
    decision: input.decision,
    notes: input.notes,
  });
  revalidatePath('/moderation');
}

// =============================================================================
// Payments (M3 W7)
// =============================================================================

export async function recordPayment(
  input: RecordPaymentInput,
): Promise<{ id: string; paymentNumber: string }> {
  const data = parseInput(RecordPaymentSchema, input);
  const api = await serverApi();
  const created = await api.recordPayment(data);
  revalidatePath('/payments');
  return { id: created.id, paymentNumber: created.paymentNumber };
}

export async function matchPayment(input: MatchPaymentInput): Promise<void> {
  const data = parseInput(MatchPaymentSchema, input);
  const api = await serverApi();
  await api.matchPayment(data.paymentId, {
    applicationId: data.applicationId,
    profileId: data.profileId,
    subscriptionId: data.subscriptionId,
  });
  revalidatePath('/payments');
  revalidatePath(`/payments/${data.paymentId}/match`);
  if (data.profileId) revalidatePath(`/profiles/${data.profileId}`);
  redirect('/payments');
}

export async function confirmPayment(input: ConfirmPaymentInput): Promise<void> {
  const data = parseInput(ConfirmPaymentSchema, input);
  const api = await serverApi();
  const updated = await api.confirmPayment(data.paymentId, {
    notes: data.notes,
    purpose: data.purpose,
  });
  revalidatePath('/payments');
  revalidatePath(`/payments/${data.paymentId}/match`);
  if (updated.profileId) revalidatePath(`/profiles/${updated.profileId}`);
  redirect('/payments');
}

export async function markPaymentException(
  input: PaymentReasonInput,
): Promise<void> {
  const data = parseInput(PaymentReasonSchema, input);
  const api = await serverApi();
  await api.markPaymentException(data.paymentId, { reason: data.reason });
  revalidatePath('/payments');
  revalidatePath(`/payments/${data.paymentId}/match`);
  redirect('/payments');
}

export async function refundPayment(input: PaymentReasonInput): Promise<void> {
  const data = parseInput(PaymentReasonSchema, input);
  const api = await serverApi();
  await api.refundPayment(data.paymentId, { reason: data.reason });
  revalidatePath('/payments');
}

export async function searchMatchSuggestions(
  paymentId: string,
  q: string,
) {
  if (typeof paymentId !== 'string' || paymentId.length === 0) {
    return { items: [] };
  }
  const api = await serverApi();
  return api.listMatchSuggestions(paymentId, q);
}

// =============================================================================
// Facilities (M3 W8)
// =============================================================================

export async function createFacility(
  input: CreateFacilityInput,
): Promise<{ id: string }> {
  const data = parseInput(CreateFacilitySchema, input);
  const api = await serverApi();
  const created = await api.createFacility({
    name: data.name,
    state: data.state,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2 ?? null,
    city: data.city,
    zip: data.zip,
    notes: data.notes ?? null,
  });
  revalidatePath('/facilities');
  return { id: created.id };
}

export async function updateFacility(input: UpdateFacilityInput): Promise<void> {
  const data = parseInput(UpdateFacilitySchema, input);
  const api = await serverApi();
  const { id, ...rest } = data;
  await api.updateFacility(id, rest);
  revalidatePath('/facilities');
}

// =============================================================================
// Resources (MVP retention lane)
// =============================================================================

export async function createResourceCategory(input: CreateResourceCategoryInput): Promise<void> {
  const data = parseInput(CreateResourceCategorySchema, input);
  const api = await serverApi();
  await api.createResourceCategory(data);
  revalidatePath('/resources');
}

export async function updateResourceCategory(input: UpdateResourceCategoryInput): Promise<void> {
  const data = parseInput(UpdateResourceCategorySchema, input);
  const api = await serverApi();
  const { id, ...rest } = data;
  await api.updateResourceCategory(id, rest);
  revalidatePath('/resources');
}

export async function createResource(input: CreateResourceInput): Promise<void> {
  const data = parseInput(CreateResourceSchema, input);
  const api = await serverApi();
  await api.createResource({
    ...data,
    description: data.description ?? null,
    organization: data.organization ?? null,
    phone: data.phone ?? null,
    url: data.url ?? null,
    tags: data.tags ?? [],
  });
  revalidatePath('/resources');
}

export async function updateResource(input: UpdateResourceInput): Promise<void> {
  const data = parseInput(UpdateResourceSchema, input);
  const api = await serverApi();
  const { id, ...rest } = data;
  await api.updateResource(id, {
    ...rest,
    tags: rest.tags ?? undefined,
  });
  revalidatePath('/resources');
}

// ── Operational settings ──────────────────────────────────────────────────

const MailFromSchema = z.object({
  name: z.string().trim().optional(),
  line1: z.string().trim().min(1, 'Street address is required'),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, 'City is required'),
  // PostGrid expects the 2-letter code; a full state name is silently undeliverable.
  state: z.string().trim().length(2, 'Use the 2-letter state code'),
  zip: z.string().trim().min(5, 'ZIP is required'),
});

export async function updateMailFrom(input: z.infer<typeof MailFromSchema>): Promise<void> {
  const data = parseInput(MailFromSchema, input);
  const api = await serverApi();
  await api.setMailFromSettings(data);
  revalidatePath('/settings');
  revalidatePath('/outbound-mail');
}

const PlanSettingSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  swipeDailyCap: z.coerce.number().int().min(0).optional(),
  letterAllowance: z.coerce.number().int().min(0).optional(),
  photoLimit: z.coerce.number().int().min(0).optional(),
  bioWordLimit: z.coerce.number().int().min(0).optional(),
  mailbox: z.boolean().optional(),
  prioritySupport: z.boolean().optional(),
});

export async function updatePlanSetting(input: z.infer<typeof PlanSettingSchema>): Promise<void> {
  const data = parseInput(PlanSettingSchema, input);
  const { id, ...rest } = data;
  const api = await serverApi();
  await api.updatePlanSettings(id, rest);
  revalidatePath('/settings');
}

/**
 * Put a scan whose text could not be read back through recognition.
 *
 * A failed scan had no way forward: the queue's own three attempts were spent
 * and the only route to a listing was deleting the document and uploading the
 * same file again.
 */
/**
 * Put a scan back through text recognition.
 *
 * Revalidates both sections, not just the intake list. The same button sits on
 * the intake detail, the review workspace and the profile page, and only
 * `/intake` was being refreshed — so everywhere else the row still showed the
 * old result after the retry, and the only sign anything had happened was a
 * toast that disappeared. `'layout'` because these are dynamic routes and the
 * document could belong to any id under them.
 */
export async function retryDocumentOcr(documentId: string): Promise<void> {
  const api = await serverApi();
  await api.retryDocumentOcr(documentId);
  revalidatePath('/intake', 'layout');
  revalidatePath('/profiles', 'layout');
}

/**
 * Record that the current user has opened a section, so its sidebar badge stops
 * counting what they have now seen. Best effort: a badge that fails to clear is
 * not worth failing a page over.
 */
export async function markNavSectionSeen(section: string): Promise<void> {
  try {
    const api = await serverApi();
    await api.markNavSectionSeen(section);
  } catch (err) {
    // Ignored on purpose — see above. A missing-session redirect is not a
    // badge failure, though, and has to keep travelling.
    if (isRedirectError(err)) throw err;
  }
}

/**
 * Look up listings by name for the inbound-mail form.
 *
 * The form used to be handed the first 100 profiles and filter that array in
 * the browser, so anyone outside those 100 could not be found however
 * carefully you typed — and a mailroom looking up the profile a letter belongs
 * to is exactly the case where the list is longer than 100.
 *
 * Returns an empty list on failure rather than throwing: a lookup that cannot
 * reach the API should not take the whole form down with it.
 */
export async function searchProfilesForLookup(
  query: string,
): Promise<Array<Pick<Profile, 'id' | 'displayName'>>> {
  const q = query.trim();
  try {
    const api = await serverApi();
    const res = await api.listProfiles({ q: q || undefined, limit: 20 });
    return res.items.map((p) => ({ id: p.id, displayName: p.displayName }));
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return [];
  }
}

/**
 * Put a failed or returned letter back in the queue.
 *
 * Lets the error through rather than swallowing it: unlike a badge that failed
 * to clear, someone pressing this needs to know whether it worked.
 */
export async function resendLetter(communicationId: string): Promise<void> {
  const api = await serverApi();
  await api.resendLetter(communicationId);
  revalidatePath('/outbound-mail');
}

/**
 * Approve or reject a letter waiting to be posted.
 *
 * The error is allowed through: someone deciding on correspondence needs to
 * know whether their decision was recorded.
 */
export async function moderateLetter(
  id: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  const api = await serverApi();
  await api.moderateCommunication(id, { status });
  revalidatePath('/letters');
  revalidatePath('/outbound-mail');
}

/**
 * Assign, re-grade, escalate or close a report.
 *
 * The error is allowed through: a moderator needs to know whether their
 * decision was recorded.
 */
export async function updateModerationFlag(
  id: string,
  input: UpdateModerationFlagInput,
): Promise<void> {
  const api = await serverApi();
  await api.updateModerationFlag(id, input);
  revalidatePath('/moderation');
}

/**
 * Check a facility spreadsheet, or import it.
 *
 * `commit` false writes nothing and returns the same report, which is what the
 * preview shows.
 */
export async function importFacilities(
  csv: string,
  commit: boolean,
): Promise<FacilityImportResponse> {
  const api = await serverApi();
  const result = await api.importFacilities({ csv, commit });
  if (commit) revalidatePath('/facilities');
  return result;
}

export async function dispatchQueuedLetters(): Promise<{
  attempted: number;
  dispatched: number;
  failed: number;
  blocked: string[];
}> {
  const api = await serverApi();
  const res = await api.dispatchQueuedLetters();
  revalidatePath('/outbound-mail');
  revalidatePath('/settings');
  return res;
}
