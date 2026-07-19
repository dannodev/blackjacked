import Link from "next/link";

export default function PrivacyPage() {
  return <LegalPage title="Privacy policy" updated="July 18, 2026">
    <p>Blackjacked stores the profile, nutrition, training, check-in, and squad information you choose to provide so the app can work across your devices.</p>
    <h2>Health and fitness data</h2>
    <p>Body measurements, progress photos, meals, and workouts are treated as private account data. Progress photos are stored in a private bucket and delivered through expiring links. Squad members only receive the activity and goal progress you choose to share—not your measurements or private photos.</p>
    <h2>AI features</h2>
    <p>When you use AI meal analysis or menu import, the description or file you submit is sent to Google Gemini for processing. Do not submit medical records or information you do not want processed by that provider. AI nutrition values are estimates and may be wrong.</p>
    <h2>Service providers</h2>
    <p>Supabase provides authentication and database storage, Cloudinary stores public profile avatars, Google processes optional AI requests, and Vercel hosts the app and provides aggregate product analytics.</p>
    <h2>Your controls</h2>
    <p>You can export your account data, delete check-ins and photos individually, or permanently delete your account from Profile. Account deletion removes database records and uploaded assets associated with the account.</p>
    <h2>Contact</h2>
    <p>Before public launch, replace this paragraph with the company’s legal name, postal address, and monitored privacy email.</p>
  </LegalPage>;
}

function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 text-sm leading-7 text-muted-foreground">
    <Link href="/" className="text-[var(--rosso-light)]">← Blackjacked</Link>
    <h1 className="mt-6 font-heading text-3xl font-extrabold text-white">{title}</h1>
    <p className="mb-8 text-xs">Last updated: {updated}</p>
    <div className="space-y-5 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white">{children}</div>
  </main>;
}
