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
        Use RevCode for your own study. Don&apos;t try to access other
        people&apos;s data, disrupt the service, or use it for anything
        unlawful.
      </p>

      <LegalHeading>Your content</LegalHeading>
      <p>
        Your notes and progress are yours. RevCode stores them only to show them
        back to you (see Privacy). Keep your own copy of anything important: you
        can download your notes as Markdown at any time.
      </p>

      <LegalHeading>No warranty</LegalHeading>
      <p>
        RevCode is provided as is, without any warranty. It may be unavailable,
        change, or shut down, and data may be lost. It is not liable for any
        loss that comes from using it.
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
