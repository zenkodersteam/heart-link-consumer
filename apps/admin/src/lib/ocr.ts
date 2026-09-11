import type { OcrStatus } from '@heartlink/api-contract';

/**
 * Whether a scan is still being read.
 *
 * Lives here rather than beside `OcrProgress` because that file is
 * `'use client'`, and every export of a client module is a client reference on
 * the server — callable only by rendering it, never as a function. The server
 * components that decide whether to show the progress bar at all
 * (`DocumentsCard`, `ProfileDocumentsCard`) were calling it directly, which
 * took down the whole intake and profile pages in production with React's
 * generic #441.
 */
export function isOcrRunning(status: OcrStatus): boolean {
  return status === 'pending' || status === 'processing';
}
