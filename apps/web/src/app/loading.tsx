import { PageSpinner } from '@/components/ui/spinner';

/**
 * Shown while a route segment streams in. Without it Next holds the previous
 * page until the new one is ready, so a slow navigation looks like a dead tap.
 */
export default function Loading() {
  return <PageSpinner fullScreen />;
}
