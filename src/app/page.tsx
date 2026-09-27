import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { CONFIDENCES, DEFAULT_GAPS, type Confidence } from "@/domain/gaps";
import dashboardShot from "../../public/landing/dashboard.png";
import notesShot from "../../public/landing/notes.png";
import problemsShot from "../../public/landing/problems.png";

export const metadata = {
  title: "RevCode · Revise, don't Relearn",
  description:
    "A NeetCode 250 tracker that schedules three spaced revisions for every problem you solve, with Markdown notes for each one.",
};

// The landing page (DESIGN-BRIEF.md §9), from designs/landing_mockup.html. Public and
// static: proxy.ts sends signed-in visitors straight to /dashboard. Always dark: the
// `force-dark` class switches the whole document to the dark tokens (globals.css).

/** Same words as ConfidencePicker's; that module is client-only, so its values can't be imported here. */
const CONFIDENCE_NAMES: Record<Confidence, string> = {
  1: "Shaky",
  2: "Okay",
  3: "Solid",
};

const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-8";

export default function LandingPage() {
  return (
    <div className="force-dark flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-header-bg backdrop-blur">
        <div className={`${WRAP} flex h-14 items-center justify-between`}>
          <span className="flex items-center gap-2 font-mono text-base font-semibold text-ink-strong">
            <span className="flex size-6 items-center justify-center rounded-md bg-accent text-xs font-bold text-on-accent">
              R
            </span>
            RevCode
          </span>
          <Link
            href="/sign-in"
            className="text-[13px] font-medium text-ink-soft hover:text-ink-strong"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className={`${WRAP} pt-20 pb-14 text-center sm:pt-24`}>
          <p className="font-mono text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
            NeetCode 250 · spaced revision
          </p>
          <h1 className="mt-4 text-[clamp(40px,7vw,64px)] leading-[1.05] font-bold tracking-[-0.035em] text-ink-strong">
            Revise, don&apos;t Relearn.
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[17px] text-ink-soft">
            Mark a problem solved and rate how well you know it. RevCode brings
            it back three times, spaced by that confidence, before you forget
            it.
          </p>
          <div className="mt-8">
            <GoogleSignInButton primary />
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Free · sign in with Google, no password
          </p>
        </section>

        <div className={WRAP}>
          <Shot
            src={dashboardShot}
            alt="The RevCode dashboard: stats, the next problem to solve, revisions due now and revisions coming up"
            sizes="(max-width: 1120px) 100vw, 1056px"
            preload
          />
        </div>

        <section className={`${WRAP} pt-24 pb-6`}>
          <h2 className="font-mono text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">
            How it works
          </h2>
          <Step
            number="01"
            title="Solve"
            visual={
              <Shot
                src={problemsShot}
                alt="The Problems page: problems by topic with solve dates, confidence and revision dates"
                sizes="(max-width: 860px) 100vw, 600px"
                short
              />
            }
          >
            All 250 problems in NeetCode order, grouped by topic. Tick one when
            you&apos;ve solved it and rate your confidence from 1 to 3. Every
            problem links straight to LeetCode.
          </Step>
          <Step number="02" title="Revise" visual={<GapsTable />} flip>
            Each solve gets three revisions. Shaky problems come back sooner,
            solid ones later, and each gap counts from the day you actually did
            the last one. The dashboard shows what&apos;s due today and
            what&apos;s coming up.
          </Step>
          <Step
            number="03"
            title="Note"
            visual={
              <Shot
                src={notesShot}
                alt="The Notes page: Markdown notes for each problem, grouped by topic"
                sizes="(max-width: 860px) 100vw, 600px"
                short
              />
            }
          >
            Keep a Markdown note for each problem: the approach, the edge cases,
            the code. Open it next to a revision, browse notes by topic, or
            download them all.
          </Step>
        </section>

        <section
          className={`${WRAP} flex flex-col items-center border-t border-line-soft pt-18 pb-24 text-center`}
        >
          <h2 className="text-[32px] font-bold tracking-[-0.02em] text-ink-strong">
            Your next revision is waiting.
          </h2>
          <div className="mt-8">
            <GoogleSignInButton primary />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div
          className={`${WRAP} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pt-6 pb-8 text-xs text-ink-faint`}
        >
          <span>RevCode · not affiliated with NeetCode or LeetCode</span>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:text-ink-strong">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink-strong">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** A screenshot in a card frame. `short` crops it to 16:10 from the top. */
function Shot({
  src,
  alt,
  sizes,
  short = false,
  preload = false,
}: {
  src: StaticImageData;
  alt: string;
  sizes: string;
  short?: boolean;
  preload?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-card border border-line-strong bg-bg ${
        short ? "aspect-[16/10]" : ""
      }`}
    >
      <Image
        src={src}
        alt={alt}
        sizes={sizes}
        preload={preload}
        className="block h-auto w-full"
      />
    </div>
  );
}

/** One "How it works" step: text on one side, a picture on the other (stacked on phones). */
function Step({
  number,
  title,
  visual,
  flip = false,
  children,
}: {
  number: string;
  title: string;
  visual: ReactNode;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid items-center gap-6 border-t border-line-soft py-12 first-of-type:mt-6 md:grid-cols-[5fr_7fr] md:gap-12">
      <div className={flip ? "md:order-2" : ""}>
        <p className="font-mono text-[13px] font-semibold text-accent-hover">
          {number}
        </p>
        <h3 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-ink-strong">
          {title}
        </h3>
        <p className="mt-3 text-ink-soft">{children}</p>
      </div>
      {visual}
    </div>
  );
}

/** The default revision gaps, drawn in the app's own card and table style. */
function GapsTable() {
  return (
    <div className="overflow-hidden rounded-card border border-line-strong bg-surface text-[13px]">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line bg-surface-head font-mono text-[11px] font-semibold tracking-[0.08em] text-ink-faint uppercase">
            <th className="px-4 py-2.5 text-left">Confidence</th>
            <th className="px-4 py-2.5 text-left">R1</th>
            <th className="px-4 py-2.5 text-left">R2</th>
            <th className="px-4 py-2.5 text-left">R3</th>
          </tr>
        </thead>
        <tbody>
          {CONFIDENCES.map((confidence) => (
            <tr
              key={confidence}
              className="border-t border-line-soft first:border-t-0"
            >
              <td className="px-4 py-3 font-medium">
                <span className="inline-block w-[18px] font-mono text-ink-faint">
                  {confidence}
                </span>
                {CONFIDENCE_NAMES[confidence]}
              </td>
              {DEFAULT_GAPS[confidence].map((days, index) => (
                <td key={index} className="px-4 py-3 font-mono">
                  {index > 0 && "+"}
                  {days}{" "}
                  <span className="text-ink-faint">
                    {days === 1 ? "day" : "days"}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line bg-surface-head px-4 py-2.5 text-xs text-ink-faint">
        The default gaps. Change them in Settings.
      </p>
    </div>
  );
}
