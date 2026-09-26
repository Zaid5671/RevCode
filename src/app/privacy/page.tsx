import { LegalHeading, LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy · RevCode" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="26 September 2026">
      <p>
        RevCode is a personal NeetCode 250 revision tracker. This page says what
        it stores about you and why.
      </p>

      <LegalHeading>What RevCode stores</LegalHeading>
      <ul className="list-disc pl-6">
        <li>
          From your Google account, when you sign in: your name, email address,
          profile photo link and Google account id, plus the sign-in tokens
          Google returns.
        </li>
        <li>
          Your sign-in sessions, with the IP address and browser they came from,
          so you stay signed in and old sessions can expire.
        </li>
        <li>
          What you enter: solved problems, confidence, revision dates, your
          revision gaps, your time zone and your notes.
        </li>
      </ul>
      <p>
        RevCode asks Google only for your name, email and profile photo. It
        can&apos;t read your Gmail, Drive or anything else in your Google
        account.
      </p>

      <LegalHeading>How it is used</LegalHeading>
      <p>
        Only to run the app for you: to sign you in, show your progress and
        reminders, and keep your notes. Your data is never sold, shared with
        anyone, or used for advertising. RevCode has no analytics or tracking.
      </p>

      <LegalHeading>Where it is kept</LegalHeading>
      <p>
        The app runs on Vercel and the data is stored in a Postgres database on
        Neon, both in Singapore. RevCode&apos;s cookies are used only for
        signing in and keeping you signed in; your theme choice is kept in your
        browser.
      </p>

      <LegalHeading>Deleting your data</LegalHeading>
      <p>
        Settings → Delete account removes your account and everything in it:
        progress, gaps, notes and sessions. It can&apos;t be undone. You can
        download your notes as Markdown first, from the Notes section.
      </p>
    </LegalPage>
  );
}
