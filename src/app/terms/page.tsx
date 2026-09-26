import { LegalHeading, LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms · RevCode" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms" updated="26 September 2026">
      <p>
        RevCode is a free, non-commercial tool for tracking revision of the
        NeetCode 250 problem list. By signing in you agree to these terms.
      </p>

      <LegalHeading>Use</LegalHeading>
      <p>
        RevCode is for your own study. Please use it fairly: don&apos;t try to
        reach other people&apos;s data or disrupt the service for others.
      </p>

      <LegalHeading>Your content</LegalHeading>
      <p>
        Your notes and progress are yours. RevCode stores them only to show them
        back to you (see Privacy), and you can download your notes as Markdown
        at any time.
      </p>

      <LegalHeading>The service</LegalHeading>
      <p>
        RevCode is a free project, offered as is. It&apos;s looked after with
        care, but it may sometimes be unavailable, and features may change over
        time. Downloading your notes now and then is a good habit.
      </p>

      <LegalHeading>Not affiliated</LegalHeading>
      <p>
        RevCode is not affiliated with or endorsed by NeetCode or LeetCode.
        Problem names link to LeetCode, whose own terms apply there.
      </p>

      <LegalHeading>Changes</LegalHeading>
      <p>These terms may change; the date above shows the latest version.</p>
    </LegalPage>
  );
}
