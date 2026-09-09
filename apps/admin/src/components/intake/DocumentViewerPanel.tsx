'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  FileX,
  Loader2,
  Minus,
  Plus,
  RotateCw,
  ShieldCheck,
} from 'lucide-react';
import type { Application, IntakeDocument } from '@heartlink/api-contract';
import { APPLICATION_STATUS_LABEL } from '../../lib/adminLabels';
import { cn } from '../../lib/utils';

interface DocumentViewerPanelProps {
  application: Application;
  document: IntakeDocument | null;
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

export function DocumentViewerPanel({ application, document }: DocumentViewerPanelProps) {
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

  const sourceUrl = document?.presignedUrl ? resolveStorageUrl(document.presignedUrl) : null;
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
  }, [sourceUrl, isPdfDocument]);

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

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden border-r border-border bg-[radial-gradient(circle_at_12%_8%,rgba(219, 2, 82,0.10),transparent_28%),linear-gradient(135deg,#fbf1eb_0%,#f5ebe5_48%,#efe3dd_100%)]">
      <aside className="hidden w-[184px] shrink-0 flex-col border-r border-border/80 bg-[#fffaf7]/88 p-3 shadow-[inset_-1px_0_0_rgba(255,255,255,0.7)] xl:flex">
        <div className="mb-3 rounded-2xl border border-border bg-background p-3 shadow-soft">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-gold">
            <ShieldCheck className="size-3.5" />
            Review packet
          </div>
          <div className="mt-1 font-serif text-[17px] leading-tight text-text">
            {application.applicationNumber}
          </div>
          <div className="mt-2 inline-flex rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {APPLICATION_STATUS_LABEL[application.status]}
          </div>
        </div>

        <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
          Pages
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {pages.length > 0 ? (
            pages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => scrollToPage(pageNumber)}
                className={`group w-full rounded-2xl border p-2 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                  activePage === pageNumber
                    ? 'border-primary/30 bg-primary/10 shadow-soft'
                    : 'border-border bg-background/82 hover:border-border-strong hover:bg-white'
                }`}
              >
                <div className="aspect-[3/4] overflow-hidden rounded-xl border border-border bg-gradient-to-br from-white to-surface-muted p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <div className="h-2 w-16 rounded-full bg-primary/20" />
                  <div className="mt-3 grid grid-cols-2 gap-1">
                    <div className="h-2 rounded bg-text/10" />
                    <div className="h-2 rounded bg-text/10" />
                    <div className="h-2 rounded bg-text/10" />
                    <div className="h-2 rounded bg-text/10" />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="h-1.5 rounded bg-primary/16" />
                    <div className="h-1.5 rounded bg-text/10" />
                    <div className="h-1.5 rounded bg-text/10" />
                    <div className="h-1.5 rounded bg-text/10" />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-text">{pageNumber}</span>
                  <span className="truncate text-[11px] text-text-muted">
                    {`Page ${pageNumber}`}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-background/70 p-4 text-center text-xs text-text-muted">
              No pages to show yet.
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-[#fffaf7]/92 px-4 py-3 text-xs text-text-muted backdrop-blur">
          {/* Names the document on screen. It used to read "Custom PDF
              Review", which named nothing — reviewers took it for a mode the
              viewer had defaulted into, and reported the applicant's own file
              as a placeholder. */}
          <div className="mr-2 flex min-w-0 items-center gap-2 font-semibold text-text">
            <FileText className="size-4 shrink-0 text-primary" />
            <span className="truncate">{documentLabel(document)}</span>
          </div>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => stepZoom(-1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-text transition-all hover:border-border-strong hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="min-w-14 rounded-full border border-border bg-background px-3 py-1.5 text-center font-semibold text-text">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => stepZoom(1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-text transition-all hover:border-border-strong hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Plus className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setFitMode(true)}
            className={cn(pillCls, fitMode && activePillCls)}
          >
            Fit width
          </button>
          <button
            type="button"
            onClick={() => {
              setFitMode(false);
              setZoomIndex(2);
            }}
            className="hidden rounded-full border border-border bg-background px-3 py-1.5 font-semibold text-text transition-all hover:border-border-strong hover:bg-white active:scale-95 sm:inline-flex"
          >
            100%
          </button>
          <button
            type="button"
            onClick={() => setRotation((value) => (value + 90) % 360)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 font-semibold text-text transition-all hover:border-border-strong hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <RotateCw className="size-3.5" />
            Rotate
          </button>
          <div className="flex-1" />
          {sourceUrl && (
            <a
              href={sourceUrl}
              download
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 font-semibold text-text transition-all hover:border-border-strong hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <Download className="size-3.5" />
              Original
            </a>
          )}
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
            <div className="mx-auto flex w-fit min-w-full flex-col gap-5 pb-6">
              {pages.map((pageNumber) => (
                <div
                  key={pageNumber}
                  ref={(node) => {
                    pageRefs.current[pageNumber - 1] = node;
                  }}
                  className="group scroll-mt-5"
                >
                  <div className="mb-2 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-sidebar px-2.5 py-1 text-[11px] font-bold text-sidebar-text">
                        Page {pageNumber}
                      </span>
                      <span className="text-xs font-semibold text-text-muted">
                        {documentLabel(document)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-[#fffaf7] p-2 shadow-[0_6px_18px_rgba(46,18,64,0.10)]">
                    <PdfCanvasPage
                      pdf={pdf}
                      pageNumber={pageNumber}
                      scale={zoom}
                      rotation={rotation}
                      onVisible={setActivePage}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
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
    <div ref={wrapperRef} className="relative overflow-hidden rounded-[20px] bg-white">
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
    <div className="mx-auto max-w-4xl rounded-[28px] border border-border bg-[#fffaf7] p-3 shadow-card">
      {/* Runtime presigned URLs are not known at build time, so next/image is not a fit. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={sourceUrl} alt="Scanned document" className="w-full rounded-[20px] bg-white" />
    </div>
  );
}

function EmptyDocumentState() {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-[28px] border border-dashed border-border bg-background/82 p-8 text-center shadow-soft">
      <FileX className="size-10 text-text-muted" />
      <h3 className="mt-4 font-serif text-2xl text-text">No document attached</h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        Upload a returned scan to review the application packet here.
      </p>
    </div>
  );
}

function LoadingDocumentState() {
  return (
    <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-[28px] border border-border bg-background/88 p-8 text-center shadow-soft">
      <Loader2 className="size-8 animate-spin text-primary" />
      <h3 className="mt-4 font-serif text-2xl text-text">Preparing premium viewer</h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        Rendering each PDF page into the HeartLink review workspace.
      </p>
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
    <div className="mx-auto mt-16 flex max-w-lg flex-col items-center rounded-[28px] border border-warning/20 bg-background/88 p-8 text-center shadow-soft">
      <AlertTriangle className="size-9 text-warning" />
      <h3 className="mt-4 font-serif text-2xl text-text">
        {missing ? 'Document not in storage' : 'Custom render unavailable'}
      </h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">
        {missing
          ? 'This application has a document on record, but the file itself is not in storage. The extracted fields cannot be checked against it - upload the scan again before approving.'
          : 'The page could not be drawn into the review canvas. The original file is still readable.'}
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

/** Toolbar pill, and the same pill when its mode is the one in effect. */
const pillCls =
  'hidden rounded-full border border-border bg-background px-3 py-1.5 font-semibold text-text transition-all hover:border-border-strong hover:bg-white active:scale-95 sm:inline-flex';
const activePillCls = 'border-primary/30 bg-primary-tint text-primary';

function isImage(mime: string): boolean {
  return mime.startsWith('image/');
}

function resolveStorageUrl(url: string): string {
  return url;
}
