import { SignUp } from '@clerk/nextjs';
import { ShieldCheck } from 'lucide-react';

export default function AdminSignUpPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-sidebar text-sidebar-text">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(233,30,115,0.24),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(201,145,46,0.18),transparent_30%),linear-gradient(135deg,#210834_0%,#2a0f4d_48%,#16051f_100%)]" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8">
        <section className="rounded-[32px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.28)] backdrop-blur sm:p-8 lg:p-10">
          <h1 className="max-w-xl font-serif text-4xl leading-[0.98] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
            Join the HeartLink operations console.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-sidebar-muted sm:text-lg">
            Admin access is reserved for approved operators managing sensitive review, correspondence, and payment workflows.
          </p>
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-sm leading-6 text-sidebar-muted">
            <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-accent-gold" />
            Use the email invited by the HeartLink team. Unauthorized accounts will not receive operator permissions.
          </div>
        </section>

        <section className="flex justify-center lg:justify-end">
          <div className="w-full max-w-[430px] rounded-[28px] border border-white/15 bg-white p-3 shadow-[0_26px_70px_rgba(0,0,0,0.35)]">
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  cardBox: 'shadow-none w-full',
                  card: 'shadow-none border-0 w-full',
                  headerTitle: 'font-serif text-[26px] text-[#2e1240]',
                  headerSubtitle: 'text-[#6e5c80]',
                  formButtonPrimary: 'bg-[#e91e73] hover:bg-[#c81860] rounded-full shadow-[0_12px_26px_rgba(233,30,115,0.28)]',
                  formFieldInput: 'rounded-xl border-[#e2d5cc] focus:border-[#e91e73] focus:ring-[#e91e73]',
                  footerActionLink: 'text-[#e91e73] font-semibold',
                },
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
