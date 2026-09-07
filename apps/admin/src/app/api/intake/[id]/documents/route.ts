import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createApiClient } from '@heartlink/api-client';

const INBOUND_SCAN_ACCEPTED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const INBOUND_SCAN_MAX_BYTES = 10 * 1024 * 1024;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: applicationId } = await context.params;
  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId is required' }, { status: 400 });
  }

  const { getToken } = await auth();
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthenticated: no Clerk session' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: 'Please select a scanned application to upload' },
      { status: 400 },
    );
  }
  if (!INBOUND_SCAN_ACCEPTED_MIME.has(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type || 'unknown'} (PDF, JPEG, or PNG only)`,
      },
      { status: 400 },
    );
  }
  if (file.size > INBOUND_SCAN_MAX_BYTES) {
    return NextResponse.json({ error: 'File must be 10 MB or smaller' }, { status: 400 });
  }

  const api = createApiClient({
    baseUrl:
      process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
    token,
  });

  try {
    const document = await api.uploadApplicationDocument(applicationId, file, {
      type: 'scanned_application',
      ingestionSource: 'operator_upload',
    });
    return NextResponse.json({ ok: true, documentId: document.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload scan' },
      { status: 500 },
    );
  }
}
