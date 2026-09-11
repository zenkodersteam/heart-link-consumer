'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileText,
  FileX,
  Loader2,
  Minus,
  Plus,
  RotateCw,
} from 'lucide-react';
import type { IntakeDocument } from '@heartlink/api-contract';
import { refreshDocumentUrl } from '../../lib/actions';
import { cn } from '../../lib/utils';

interface DocumentViewerPanelProps {
  document: IntakeDocument | null;
  className?: string;
}

interface PdfDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPageProxy>;
  destroy(): Promise<void>;
}

interface PdfPageProxy {
  getViewport(options: { scale: number; rotation?: number }): PdfViewport;
  render(options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }): { promise: Promise<void>; cancel?: () => void };
}

interface PdfViewport {
  width: number;
  height: number;
}

type PdfJsModule = typeof import('pdfjs-dist');

/**
 * What the document in the pane is.
 *
 * The applicant's own submission is the normal case and says so plainly; a
 * returned scan is worth distinguishing, because approving against the wrong
 * one is a real mistake.
 */
function documentLabel(document: IntakeDocument | null): string {
  if (!document) return 'No document';
  if (document.type === 'letter_inbound') return 'Scanned reply';
  if (document.type === 'photo') return 'Submitted photo';
  return isImage(document.mimeType) ? 'Submitted image' : 'Submitted application';
}
const ZOOM_LEVELS = [0.72, 0.86, 1, 1.18, 1.36, 1.6];

export function DocumentViewerPanel({ document, className }: DocumentViewerPanelProps) {
  const [pdf, setPdf] = useState<PdfDocumentProxy | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<'missing' | 'render' | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(2);
  // Fit is the default, and it is a real measurement rather than a zoom preset.
  // At a fixed 100% a Letter page is wider than this pane, so every document
  // opened clipped under the field panel with a horizontal scrollbar beneath
  // it - the reviewer's first move was always to shrink it by hand.
  const [fitMode, setFitMode] = useState(true);
  const [paneWidth, setPaneWidth] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const [rotation, setRotation] = useState(0);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  /**
   * The URL the viewer actually loads.
   *
   * The document list does not always carry a `presignedUrl`, and the ones it
   * does carry expire in fifteen minutes - shorter than a reviewer's session.
   * So the one on the document is a starting point, and `refreshDocumentUrl`
   * is asked for a fresh one when there is none, or when a load fails on an
   * expired signature.
   */
  // Carries the document it belongs to, so switching documents drops the old
  // URL by comparison rather than by an effect that resets state.
  const [fetched, setFetched] = useState<{ documentId: string; url: string } | null>(null);
  const retriedFor = useRef<string | null>(null);
  const fetchedUrl = fetched && fetched.documentId === document?.id ? fetched.url : null;

  useEffect(() => {
    if (!document || document.presignedUrl || fetchedUrl) return undefined;
    let cancelled = false;
    void refreshDocumentUrl(document.id).then((url) => {
      if (!cancelled && url) setFetched({ documentId: document.id, url });
    });
    return () => {
      cancelled = true;
    };
  }, [document, fetchedUrl]);

  const rawUrl = document?.presignedUrl ?? fetchedUrl;
  const sourceUrl = rawUrl ? resolveStorageUrl(rawUrl) : null;
  const isPdfDocument = document?.mimeType === 'application/pdf' && Boolean(sourceUrl);
  // Everything horizontal between the pane's edge and the canvas: the
  // scroller's own padding (16 a side), the page card's (8 a side) and its
  // border (1 a side) - 50 - plus room for a classic scrollbar on platforms
  // that reserve one. Erring wide costs a few pixels of page; erring narrow
  // costs the clipped edge and the horizontal scrollbar this replaces.
  const PAGE_CHROME = 50 + 12;
  const fitScale =
    paneWidth > 0 && pageWidth > 0
      ? Math.min(2, Math.max(0.25, (paneWidth - PAGE_CHROME) / pageWidth))
      : 1;
  const zoom = fitMode ? fitScale : (ZOOM_LEVELS[zoomIndex] ?? 1);

  /** Stepping the zoom leaves fit mode, starting from whatever is on screen. */
  const stepZoom = (direction: 1 | -1) => {
    const from = fitMode
      ? ZOOM_LEVELS.reduce(
          (best, level, i) =>
            Math.abs(level - fitScale) < Math.abs((ZOOM_LEVELS[best] ?? 1) - fitScale) ? i : best,
          0,
        )
      : zoomIndex;
    setFitMode(false);
    setZoomIndex(Math.min(ZOOM_LEVELS.length - 1, Math.max(0, from + direction)));
  };

  useEffect(() => {
    if (!sourceUrl || !isPdfDocument) {
      return;
    }

    let cancelled = false;
    let loaded: PdfDocumentProxy | null = null;

    async function loadPdf() {
      setIsLoading(true);
      setLoadError(null);
      setActivePage(1);

      try {
        const pdfjs = (await import('pdfjs-dist')) as PdfJsModule;
        // Served from `public/`, copied there at build time by
        // scripts/copy-pdf-worker.mjs so it always matches the installed
        // pdfjs-dist. The previous `new URL('pdfjs-dist/…', import.meta.url)`
        // looked right but bundlers only rewrite that for relative specifiers -
        // a bare package name resolved against the chunk's own URL and 404'd,
        // which is what "could not load PDF viewer" was.
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const task = pdfjs.getDocument(sourceUrl!);
        loaded = (await task.promise) as PdfDocumentProxy;
        if (!cancelled) {
          setPdf(loaded);
        }
      } catch (error) {
        if (!cancelled) {
          setPdf(null);
          // Classified, never passed through. pdf.js puts the whole request URL
          // in its message, and for local-disk storage that URL carries the
          // signature token - which then sat on screen for anyone walking past
          // or screenshotting the page. The distinction that matters to a
          // reviewer is not the stack, it is whether the file is there at all.
          const raw = error instanceof Error ? error.message : '';
          // A signature that expired while the tab sat open looks like a 403.
          // Ask for a new one and let the effect run again, once.
          if (/\(403\)|Forbidden|expired/i.test(raw) && document && retriedFor.current !== document.id) {
            retriedFor.current = document.id;
            void refreshDocumentUrl(document.id).then((url) => {
              if (!cancelled && url) setFetched({ documentId: document.id, url });
            });
            return;
          }
          setLoadError(/\(404\)|MissingPDFException|Missing PDF/i.test(raw) ? 'missing' : 'render');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPdf();

    return () => {
      cancelled = true;
      if (loaded) {
        void loaded.destroy();
      }
    };
  }, [sourceUrl, isPdfDocument, document]);

  // Width of the scroll area, tracked live: the split can change under us when
  // the window resizes, and a fit that was right at open should stay right.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setPaneWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [pdf]);

  // The page's own width at 1:1, which is what the fit scale divides into.
  // Rotation changes it, so it is read again on every turn.
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    void (async () => {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1, rotation });
      if (!cancelled) setPageWidth(viewport.width);
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, rotation]);

  const pages = useMemo(() => {
    if (!pdf) return [];
    return Array.from({ length: pdf.numPages }, (_, index) => index + 1);
  }, [pdf]);

  function scrollToPage(pageNumber: number) {
    setActivePage(pageNumber);
    pageRefs.current[pageNumber - 1]?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  const pageCount = pages.length;

  return (
    <section
      className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden bg-surface-muted', className)}
    >
      {/* One quiet toolbar: what this is, where you are in it, and how big. The
          left rail of page "thumbnails" is gone — they were placeholder lines,
          not the pages — and page stepping lives here instead. */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border bg-background px-3 py-2 text-xs text-text-muted">
        <div className="mr-auto flex min-w-0 items-center gap-2 pl-1 font-semibold text-text">
          <FileText className="size-4 shrink-0 text-primary" />
          <span className="truncate text-[13px]">{documentLabel(document)}</span>
        </div>

        {pageCount > 1 ? (
          <div className="flex items-center gap-0.5">
            <IconButton
              label="Previous page"
              disabled={activePage <= 1}
              onClick={() => scrollToPage(Math.max(1, activePage - 1))}
            >
              <ChevronUp className="size-3.5" />
            </IconButton>
            <span className="min-w-[4.5rem] text-center font-medium tabular-nums text-text">
              Page {activePage} / {pageCount}
            </span>
            <IconButton
              label="Next page"
              disabled={activePage >= pageCount}
              onClick={() => scrollToPage(Math.min(pageCount, activePage + 1))}
            >
              <ChevronDown className="size-3.5" />
            </IconButton>
          </div>
        ) : null}

        {isPdfDocument ? (
          <div className="flex items-center gap-0.5 border-l border-border pl-1.5">
            <IconButton label="Zoom out" onClick={() => stepZoom(-1)}>
              <Minus className="size-3.5" />
            </IconButton>
            <button
              type="button"
              onClick={() => setFitMode(true)}
              title="Fit to width"
              className={cn(
                'min-w-[3.25rem] rounded-md px-2 py-1 text-center font-medium tabular-nums transition-colors hover:bg-surface',
                fitMode ? 'text-primary' : 'text-text',
              )}
            >
              {Math.round(zoom * 100)}%
            </button>
            <IconButton label="Zoom in" onClick={() => stepZoom(1)}>
              <Plus className="size-3.5" />
            </IconButton>
            <IconButton label="Rotate" onClick={() => setRotation((value) => (value + 90) % 360)}>
              <RotateCw className="size-3.5" />
            </IconButton>
          </div>
        ) : null}

        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open original"
            title="Open original"
            className="grid size-8 place-items-center rounded-md text-text transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Download className="size-3.5" />
          </a>
        ) : null}
      </div>

      <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto px-3 py-4 sm:px-4">
        {!document || !sourceUrl ? (
          <EmptyDocumentState />
        ) : isImage(document.mimeType) ? (
          <ImageDocument sourceUrl={sourceUrl} />
        ) : isLoading ? (
          <LoadingDocumentState />
        ) : loadError || !pdf ? (
          <PdfFallbackState sourceUrl={sourceUrl} error={loadError} />
        ) : (
          <div className="mx-auto flex w-fit min-w-full flex-col items-center gap-4 pb-6">
            {pages.map((pageNumber) => (
              <div
                key={pageNumber}
                ref={(node) => {
                  pageRefs.current[pageNumber - 1] = node;
                }}
                className="scroll-mt-4 overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(46,18,64,0.06),0_8px_24px_rgba(46,18,64,0.08)] ring-1 ring-border"
              >
                <PdfCanvasPage
                  pdf={pdf}
                  pageNumber={pageNumber}
                  scale={zoom}
                  rotation={rotation}
                  onVisible={setActivePage}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md text-text transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function PdfCanvasPage({
  pdf,
  pageNumber,
  scale,
  rotation,
  onVisible,
}: {
  pdf: PdfDocumentProxy;
  pageNumber: number;
  scale: number;
  rotation: number;
  onVisible: (pageNumber: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { promise: Promise<void>; cancel?: () => void } | null = null;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setIsRendering(true);
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale, rotation });
        const context = canvas.getContext('2d');
        if (!context) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [pdf, pageNumber, scale, rotation]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onVisible(pageNumber);
      },
      { threshold: 0.45 },
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [onVisible, pageNumber]);

  return (
    <div ref={wrapperRef} className="relative bg-white">
      {isRendering && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-[1px]">
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      )}
      <canvas ref={canvasRef} className="block max-w-none bg-white" />
    </div>
  );
}

function ImageDocument({ sourceUrl }: { sourceUrl: string }) {
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-lg bg-white ring-1 ring-border shadow-[0_8px_24px_rgba(46,18,64,0.08)]">
      {/* Runtime presigned URLs are not known at build time, so next/image is not a fit. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sourceUrl} alt="Scanned document" className="w-full bg-white" />
    </div>
  );
}

function EmptyDocumentState() {
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center rounded-xl border border-dashed border-border bg-background p-8 text-center">
      <FileX className="size-10 text-text-muted" />
      <h3 className="mt-4 text-base font-semibold text-text">No document attached</h3>
      <p className="mt-1 text-sm leading-6 text-text-muted">
        Upload the scanned application to review it here.
      </p>
    </div>
  );
}

function LoadingDocumentState() {
  return (
    <div className="mx-auto mt-16 flex max-w-sm flex-col items-center p-8 text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <h3 className="mt-4 text-base font-semibold text-text">Opening document…</h3>
    </div>
  );
}

function PdfFallbackState({
  sourceUrl,
  error,
}: {
  sourceUrl: string;
  error: 'missing' | 'render' | null;
}) {
  const missing = error === 'missing';
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-xl border border-border bg-background p-8 text-center">
      <AlertTriangle className="size-9 text-warning" />
      <h3 className="mt-4 text-base font-semibold text-text">
        {missing ? 'Document file is missing' : 'This document could not be displayed'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        {missing
          ? 'The file for this application could not be found. Upload the scan again before approving.'
          : 'You can still open the original file in a new tab.'}
      </p>
      {!missing && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          Open original PDF
          <ExternalLink className="size-4" />
        </a>
      )}
    </div>
  );
}

function isImage(mime: string | null | undefined): boolean {
  return Boolean(mime?.startsWith('image/'));
}

function resolveStorageUrl(url: string): string {
  return url;
}
