import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Vitals",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Privacy Policy</h1>
      <p className="text-sm text-[var(--text-muted)] mb-10">Last updated October 27, 2026</p>

      <div className="space-y-8 text-[var(--text)] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">What we collect</h2>
          <p className="mb-3">What we collect depends entirely on how you use Vitals:</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li>
              <strong>Using Vitals without an account:</strong> your numbers are sent to our
              server to work out your score, and to our AI provider to write your summary and
              answer chat questions. They are used for that request only and are not saved.
            </li>
            <li>
              <strong>Creating an account:</strong> your email and password, or your
              name/email/profile photo if you sign in with Google. We save what you enter so it
              is there next time: income, expenses, debt, savings, budget cards, goals and saved
              snapshots. Chat messages are not saved.
            </li>
            <li>
              <strong>Bank statements (PDF import):</strong> the file is uploaded to our server
              and read there. The transaction lines (descriptions, amounts, and any balances or
              reference numbers printed on those lines) are sent to our AI provider to sort them
              into categories. The file itself is not saved.
            </li>
            <li>
              <strong>Usage data:</strong> a record of each visit — pages viewed, buttons
              clicked, your device type, the site that sent you, and your overall score after a
              check-up (not the numbers behind it). If you are signed in, it is linked to your
              account. We use it only to see which parts of Vitals work.
            </li>
            <li>
              <strong>Feedback form:</strong> what you write, and your email only if you add it.
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
              <strong>Railway</strong>, which runs our website and server.
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
            Without an account, your numbers are not stored. Accounts are kept until you delete
            them yourself. Usage data is kept to understand how Vitals is used; to have yours
            removed, email us.
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
