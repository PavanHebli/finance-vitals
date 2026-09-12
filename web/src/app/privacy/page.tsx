import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Vitals",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Privacy Policy</h1>
      <p className="text-sm text-[var(--text-muted)] mb-10">Last updated September 12, 2026</p>

      <div className="space-y-8 text-[var(--text)] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">What we collect</h2>
          <p className="mb-3">What we collect depends entirely on how you use Vitals:</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              <strong>Using Vitals without an account (Guest):</strong> nothing at all. Your
              numbers stay in your browser&apos;s memory for that session only — nothing is sent
              to or stored on our servers, not even locally on your device.
            </li>
            <li>
              <strong>Creating an account (Free or Pro):</strong> your email and password, or
              your name/email/profile photo if you sign in with Google. Anything you enter into
              the app — income, expenses, debt, savings, budget cards, goals, and the questions
              you ask in chat.
            </li>
            <li>
              <strong>Optional profile details:</strong> date of birth, gender, and country, if
              you choose to provide them on the Profile screen. All of these are skippable and
              can be left blank or updated anytime.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">How we use it</h2>
          <p className="text-sm">
            Solely to calculate your financial health score, generate your AI narrative and chat
            responses, and make the app work as described. We don&apos;t use your data for
            advertising, and we don&apos;t sell it to anyone.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Who we share it with</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              <strong>Supabase</strong>, which hosts our database and handles authentication.
            </li>
            <li>
              <strong>The AI provider that powers chat and your narrative</strong> (currently
              Anthropic, OpenAI, Groq, or Google, depending on configuration) — your financial
              figures and questions are sent there to generate a response. If you provide your
              own API key, it&apos;s used only for that request and is never stored on our
              servers.
            </li>
            <li>
              <strong>Google</strong>, only if you choose to sign in with Google — this is
              standard OAuth sign-in; we never see or store your Google password.
            </li>
          </ul>
          <p className="text-sm mt-3">
            We do not connect to your bank, and we never ask for banking credentials.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">How long we keep it</h2>
          <p className="text-sm">
            Guest sessions: never stored anywhere — gone the moment you close the tab. Free and
            Pro accounts: kept until you delete it yourself.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Your controls</h2>
          <p className="text-sm">
            From <strong>Settings</strong>, you can <strong>clear all your financial data</strong>{" "}
            while keeping your account, or <strong>permanently delete your account</strong>{" "}
            entirely — both take effect immediately, with no request or waiting period.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Security</h2>
          <p className="text-sm">
            Every account&apos;s data is protected by row-level security, meaning our own
            database rules enforce that a user can only ever access their own records. Passwords
            are never stored in plain text, and all traffic is encrypted in transit.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Children&apos;s privacy</h2>
          <p className="text-sm">
            Vitals is not intended for use by anyone under the age of 18, and we do not knowingly
            collect information from children.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Changes to this policy</h2>
          <p className="text-sm">
            If this policy changes, we&apos;ll update the date at the top of this page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Contact</h2>
          <p className="text-sm">
            Questions about this policy or your data? Reach out at{" "}
            <a href="mailto:pavanhebli@gmail.com" className="text-[var(--brand)] hover:underline">
              pavanhebli@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <Link href="/" className="inline-block mt-10 text-sm text-[var(--brand)] hover:underline">
        ← Back to Vitals
      </Link>
    </div>
  );
}
