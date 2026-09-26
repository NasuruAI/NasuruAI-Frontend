"use client";

import type { CoverLetterContent, CvContent, SectionKey } from "@/lib/ai/cv";
import { cx } from "../cx";

/** US and Canada use Letter; every other format (per apps.answerpacks.documents.FORMATS) is A4. */
const LETTER_FORMATS = new Set(["us", "ca"]);
const paperFor = (format: string) => (LETTER_FORMATS.has(format) ? "letter" : "A4");
/** Height : width, so the page's proportions are right even though it just grows downward. */
const ASPECT: Record<string, number> = { A4: 1.4142, letter: 1.2941 };

const HEADING =
  "mb-0.5 border-b border-line-strong pb-0.5 text-[0.85em] font-bold uppercase tracking-wide";

function Bullets({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="mt-1 list-disc space-y-0.5 pl-4">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function CvSection({ section, content }: { section: SectionKey; content: CvContent }) {
  const heading = content.headings[section === "summary" ? "profile" : section];
  switch (section) {
    case "summary":
      return content.summary ? (
        <section>
          <h3 className={HEADING}>{heading}</h3>
          <p>{content.summary}</p>
        </section>
      ) : null;
    case "experience":
      return content.experience.length ? (
        <section>
          <h3 className={HEADING}>{heading}</h3>
          <div className="space-y-2.5">
            {content.experience.map((role, index) => (
              <div key={index} className={content.tabular ? "flex gap-3" : undefined}>
                {content.tabular && (
                  <p className="w-20 shrink-0 text-[0.65em] text-muted">{role.dates}</p>
                )}
                <div className="flex-1">
                  <div
                    className={
                      content.tabular ? undefined : "flex items-baseline justify-between gap-3"
                    }
                  >
                    <p className="font-semibold">
                      {role.title}, {role.employer}
                    </p>
                    {!content.tabular && (
                      <p className="shrink-0 text-[0.85em] text-muted">{role.dates}</p>
                    )}
                  </div>
                  {role.place && <p className="text-[0.85em] text-muted">{role.place}</p>}
                  <Bullets items={role.bullets.filter((b) => b.included).map((b) => b.text)} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null;
    case "education":
      return content.education.length ? (
        <section>
          <h3 className={HEADING}>{heading}</h3>
          <div className="space-y-1.5">
            {content.education.map((item, index) => (
              <div key={index} className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.qualification}</p>
                  <p className="text-[0.85em] text-muted">
                    {[item.institution, item.detail].filter(Boolean).join(", ")}
                  </p>
                </div>
                <p className="shrink-0 text-[0.85em] text-muted">{item.dates}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null;
    case "skills":
      return content.skills.length ? (
        <section>
          <h3 className={HEADING}>{heading}</h3>
          <p>{content.skills.join(", ")}</p>
        </section>
      ) : null;
    case "certifications":
      return content.certifications.length ? (
        <section>
          <h3 className={HEADING}>{heading}</h3>
          <Bullets items={content.certifications} />
        </section>
      ) : null;
    case "languages":
      return content.languages.length ? (
        <section>
          <h3 className={HEADING}>{heading}</h3>
          <p>{content.languages.join(", ")}</p>
        </section>
      ) : null;
    default:
      return null;
  }
}

function Page({ paper, children }: { paper: string; children: React.ReactNode }) {
  return (
    <div
      className="mx-auto w-full max-w-[46rem] space-y-3 rounded-sm border border-line bg-white p-[6%] text-[0.8rem] leading-snug text-[#111827] shadow-e2"
      style={{ minHeight: `${(ASPECT[paper] ?? ASPECT.A4) * 100}%` }}
    >
      {children}
    </div>
  );
}

export function CvPagePreview({ content }: { content: CvContent }) {
  return (
    <Page paper={paperFor(content.format)}>
      <header>
        {content.format === "de" && (
          <p className="text-[0.75em] font-semibold tracking-wide text-muted uppercase">
            {content.title}
          </p>
        )}
        <p className="text-[1.4em] font-bold">{content.name}</p>
        <p className="text-[0.85em] text-muted">{content.contact.join("  ·  ")}</p>
      </header>
      {content.personal.length > 0 && (
        <section>
          <h3 className={HEADING}>{content.headings.personal}</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {content.personal.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {content.section_order.map((section) => (
        <CvSection key={section} section={section} content={content} />
      ))}
      {content.place_and_date && (
        <p className="pt-4 text-[0.85em]">
          {content.place_and_date}
          <br />
          <br />
          {content.name}
        </p>
      )}
    </Page>
  );
}

export function LetterPagePreview({ content }: { content: CoverLetterContent }) {
  return (
    <Page paper={paperFor(content.format)}>
      <p className="text-[1.2em] font-bold">{content.name}</p>
      <p className="text-[0.85em] text-muted">{content.contact.join("  ·  ")}</p>
      <p className="pt-3 text-[0.85em]">{content.date}</p>
      <p>{content.recipient}</p>
      <p className="font-semibold">{content.subject}</p>
      <p>{content.salutation}</p>
      {content.paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      <p className="pt-2">
        {content.closing}
        <br />
        <br />
        {content.name}
      </p>
    </Page>
  );
}

/**
 * The live A4/Letter preview (web.md §9): true page width, grows with the
 * content. Page breaks aren't simulated — the exported PDF is the one place
 * pagination is exact, so `pages`/`overLength` (the same figures the PDF was
 * fitted against) carry that signal instead.
 */
export function CvPreview({
  content,
  pages,
  overLength,
}: {
  content: CvContent | CoverLetterContent;
  pages: number | null;
  overLength: boolean;
}) {
  return (
    <div className="sticky top-4">
      <p
        className={cx(
          "mb-3 text-center text-body-s",
          overLength ? "font-semibold text-warning" : "text-muted",
        )}
      >
        {pages ? `${pages} page${pages === 1 ? "" : "s"}` : "Preview"}
        {overLength && " — longer than usual for this format"}
      </p>
      <div className="rounded-r-lg bg-sunken p-4">
        {content.kind === "cv" ? (
          <CvPagePreview content={content} />
        ) : (
          <LetterPagePreview content={content} />
        )}
      </div>
    </div>
  );
}
