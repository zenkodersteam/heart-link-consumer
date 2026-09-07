import { Card } from '../ui/card';

export function LinkedProfileCard() {
  return (
    <Card>
      <div className="flex flex-col gap-2 px-5 py-4">
        <h3 className="font-serif text-base leading-[22px] text-text">
          Linked Profile
        </h3>
        <p className="text-[13px] leading-[18px] text-text-muted">
          No profile linked yet - profile is created after verification (M3).
        </p>
      </div>
    </Card>
  );
}
