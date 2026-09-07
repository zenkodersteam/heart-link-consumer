import { SignIn } from '@clerk/nextjs';
import { AuthShell } from '@/components/shell/AuthShell';

export default function AdminSignInPage() {
  return (
    <AuthShell
      eyebrow="HeartLink Admin"
      title="Sign in"
      lede="Access your workspace."
    >
      <div className="hl-auth__clerk-card">
        <SignIn
          routing="path"
          path="/sign-in"
          fallbackRedirectUrl="/dashboard"
          forceRedirectUrl="/dashboard"
          appearance={{
            variables: {
              colorPrimary: '#e91e73',
              colorForeground: '#2e1240',
              colorMutedForeground: '#6e5c80',
              colorBackground: '#ffffff',
              colorInput: '#ffffff',
              colorInputForeground: '#2e1240',
              borderRadius: '0.9rem',
              fontFamily: 'var(--font-inter)',
            },
            elements: {
              rootBox: 'w-full',
              cardBox: 'shadow-none w-full',
              card: 'shadow-none border-0 w-full bg-transparent p-0',
              header: 'hidden',
              headerTitle: 'font-serif text-[26px] text-[#2e1240]',
              headerSubtitle: 'text-[#6e5c80]',
              socialButtonsBlockButton:
                'rounded-xl border-[#e4d5eb] text-[#2e1240] hover:bg-[#fbf1eb] transition-colors',
              dividerLine: 'bg-[#eadde3]',
              dividerText: 'text-[#8c769a]',
              formFieldLabel: 'text-[11px] uppercase tracking-[0.18em] text-[#8c769a] font-semibold',
              formFieldInput:
                'rounded-xl border-[#e4d5eb] bg-white text-[#2e1240] focus:border-[#e91e73] focus:ring-[#e91e73]',
              // The verification code step needs its own sizing. Its boxes also
              // carry the generic field class, so without this they inherit the
              // full-width text field above and one wide input is drawn across
              // the row of boxes.
              otpCodeFieldInputs: 'gap-2 justify-center',
              otpCodeFieldInput:
                'aspect-square max-w-12 flex-1 min-w-0 rounded-xl border-[#e4d5eb] bg-white text-center text-lg text-[#2e1240] focus:border-[#e91e73]',
              formButtonPrimary:
                'rounded-xl bg-[#e91e73] font-semibold text-white shadow-[0_12px_26px_rgba(233,30,115,0.24)] hover:bg-[#c81860] active:translate-y-0',
              footer: 'hidden',
              footerAction: 'hidden',
              footerActionLink: 'hidden',
              formFieldAction: 'text-[#e91e73] font-semibold hover:text-[#c81860]',
            },
          }}
        />
      </div>
    </AuthShell>
  );
}
