import { Card, CardBody } from "@/components/ui/Card";

export function Give() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl text-brand-700">Give</h1>
      <p className="mt-3 text-ink-muted">
        Online giving is coming in Phase 1.5 (Stripe Checkout). Until then, you can give in person
        on Sunday or reach out on the About page for mail-in details.
      </p>

      <Card className="mt-6">
        <CardBody>
          <p className="text-sm text-brand-700 font-medium">Coming soon</p>
          <p className="mt-1 text-ink-muted text-sm">
            One-time and recurring gifts · cover-the-fee option · emailed tax receipts.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
