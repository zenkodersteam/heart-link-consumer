import { TableSkeleton } from '../../../components/ui/Skeleton';

export default function Loading() {
  return <TableSkeleton rows={10} cols={4} />;
}
