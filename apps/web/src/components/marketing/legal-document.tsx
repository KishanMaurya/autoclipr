import Link from "next/link";
import { CONTACT_EMAIL, LEGAL_LAST_UPDATED, type LegalDocumentContent } from "@/lib/legal-content";

type LegalDocumentProps = {
  document: LegalDocumentContent;
};

export function LegalDocument({ document }: LegalDocumentProps) {
  return (
    <article className="glass-panel px-6 py-8 sm:px-10 sm:py-10">
      <header className="border-b border-white/[0.06] pb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{document.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
        {document.intro.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="mt-4 leading-relaxed text-muted-foreground">
            {paragraph}
          </p>
        ))}
      </header>

      <div className="space-y-10 pt-8">
        {document.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph.slice(0, 48)} className="mt-3 leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
            {section.list && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                {section.list.map((item) => (
                  <li key={item.slice(0, 48)} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <footer className="mt-10 border-t border-white/[0.06] pt-6 text-sm text-muted-foreground">
        Questions? Contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-300 hover:underline">
          {CONTACT_EMAIL}
        </a>{" "}
        or visit our{" "}
        <Link href="/feedback" className="text-emerald-300 hover:underline">
          feedback page
        </Link>
        .
      </footer>
    </article>
  );
}
