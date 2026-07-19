import Link from "next/link";

export default function TermsPage() {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-sm leading-7 text-muted-foreground">
    <Link href="/" className="text-[var(--rosso-light)]">← Blackjacked</Link>
    <h1 className="mt-6 font-heading text-3xl font-extrabold text-white">Terms of use</h1>
    <p className="mb-8 text-xs">Last updated: July 18, 2026</p>
    <div className="space-y-5 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white">
      <p>Blackjacked is a general fitness tracking tool for adults. It is not medical care, diagnosis, treatment, or an emergency service.</p>
      <h2>Use safely</h2><p>Consult a qualified professional before making major nutrition or exercise changes, particularly if you are pregnant, have an eating disorder history, take medication, or have a medical condition. Stop exercising and seek help if you experience concerning symptoms.</p>
      <h2>Estimates</h2><p>Calories, expenditure, macros, AI results, and coaching recommendations are estimates. Review entries and use your judgment. Do not use the app as the sole basis for a medical decision.</p>
      <h2>Community conduct</h2><p>Do not harass others, share another person’s private information, or upload unlawful content. Squad features are for supportive accountability.</p>
      <h2>Your account</h2><p>You are responsible for account security and the information you submit. You can export or delete your data from Profile.</p>
      <h2>Launch requirement</h2><p>These product terms must be reviewed and completed by qualified counsel, including the operating company, governing law, contact details, and jurisdiction, before public launch.</p>
    </div>
  </main>;
}
