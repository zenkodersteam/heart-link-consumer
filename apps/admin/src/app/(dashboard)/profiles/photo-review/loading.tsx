import { GallerySkeleton } from '../../../../components/ui/Skeleton';

/**
 * Shown while this route's data is being fetched on the server.
 *
 * Next renders it automatically, so there is no loading flag to thread through
 * the page. Shaped like the real content rather than a spinner, so the layout
 * does not jump when the data lands.
 */
export default function Loading() {
  return <GallerySkeleton />;
}
