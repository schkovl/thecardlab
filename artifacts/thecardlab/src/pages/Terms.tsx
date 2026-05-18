export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-foreground/90">
      <h1 className="font-display text-3xl font-black mb-2">Terms of Service</h1>
      <p className="text-xs text-muted-foreground mb-8">Last updated: 2026-05-17</p>

      <Section title="1. Acceptance">
        By using TheCardLab you agree to these terms. If you don't agree, don't use the service.
      </Section>

      <Section title="2. The service">
        TheCardLab provides AI predictions for sports-card grading, comp valuation, deal scanning,
        portfolio tracking, grading-submission management, marketplace search, and off-site vault
        services. Predictions are informational only — not a guarantee of an official PSA / BGS / SGC / CGC outcome.
      </Section>

      <Section title="3. Accounts">
        You're responsible for activity on your account. Don't share credentials. Don't impersonate.
      </Section>

      <Section title="4. Payment">
        Subscriptions billed monthly or annually via Stripe. Auto-renews unless cancelled before the
        renewal date. Cancel anytime from <a className="text-primary hover:underline" href="/settings">Settings → Billing</a>.
        Refunds at our discretion.
      </Section>

      <Section title="5. Vault">
        Vault storage subject to a separate vault agreement, including insurance terms, withdrawal
        timelines and intra-vault trade rules.
      </Section>

      <Section title="6. Acceptable use">
        No scraping our APIs, no reselling predictions, no using the service for illegal activity.
      </Section>

      <Section title="7. Disclaimers">
        Service provided "as is." We disclaim warranties to the extent permitted by law.
      </Section>

      <Section title="8. Limitation of liability">
        Liability capped at amounts paid in the prior 12 months.
      </Section>

      <Section title="9. Contact">
        legal@thecardlab.app
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
