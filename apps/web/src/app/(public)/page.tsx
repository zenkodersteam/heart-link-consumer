import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <p className="mb-4 inline-flex w-fit items-center rounded-[--radius-pill] bg-primary-faint px-3 py-1.5 text-xs font-semibold text-primary">
        Private, supported correspondence
      </p>
      <h1 className="font-[family-name:var(--font-bree)] text-5xl leading-tight text-ink">
        Thoughtful connection,{' '}
        <span className="text-primary">beyond every wall.</span>
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-soft">
        HeartLink is a calm, private place to write to people inside. Real letters, honest
        conversations, and trust that builds over time.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href="/sign-up">Create account</a>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <a href="/sign-in">Log in</a>
        </Button>
      </div>
    </main>
  );
}
