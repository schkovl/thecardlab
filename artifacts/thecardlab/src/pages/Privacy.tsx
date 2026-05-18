export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-foreground/90">
      <h1 className="font-display text-3xl font-black mb-2">Privacy Policy</h1>
      <p className="text-xs text-muted-foreground mb-8">Last updated: 2026-05-17</p>

      <Section title="1. What we collect">
        Account data (name, email) when you sign up. Card images you upload to Grade Lab. Payment metadata
        handled by Stripe — we never see card numbers. Usage analytics (anonymized).
      </Section>

      <Section title="2. Why we collect it">
        To run your account, predict grades, sync your portfolio, track grading submissions, and improve
        our AI models. We do not sell your data.
      </Section>

      <Section title="3. How we store it">
        Encrypted in transit (TLS 1.3) and at rest. Database is region-isolated. Uploaded images are
        scoped to your account and deletable on request.
      </Section>

      <Section title="4. Third parties">
        Clerk (authentication), Stripe (billing), Cloudflare R2 (image storage), Sentry (errors),
        OpenAI / Anthropic (model inference, anonymized).
      </Section>

      <Section title="5. Your rights">
        You can export, anonymize or delete your data at any time from <a className="text-primary hover:underline" href="/settings">Settings → Privacy</a> or by emailing <a className="text-primary hover:underline" href="mailto:privacy@thecardlab.app">privacy@thecardlab.app</a>.
      </Section>

      <Section title="6. Contact">
        TheCardLab, Inc. — <a className="text-primary hover:underline" href="mailto:privacy@thecardlab.app">privacy@thecardlab.app</a>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="font-bold text-base mb-2">{title}</h2>
      <p className="text-sm leading-relaxed text-foreground/80">{children}</p>
    </div>
  );
}
