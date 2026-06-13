import Link from "next/link";
import { Clock, Mail, MessageSquare, HelpCircle } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/legal-content";
import { SITE_URL } from "@/lib/seo";

const CONTACT_OPTIONS = [
  {
    icon: Mail,
    title: "Email us",
    description: "Best for account, billing, or partnership questions.",
    href: `mailto:${CONTACT_EMAIL}`,
    label: CONTACT_EMAIL,
    external: true,
  },
  {
    icon: Clock,
    title: "Response time",
    description: "We aim to reply within 1–2 business days.",
  },
  {
    icon: MessageSquare,
    title: "Product feedback",
    description: "Share bugs, ideas, and improvement suggestions.",
    href: "/feedback",
    label: "Go to feedback page",
  },
  {
    icon: HelpCircle,
    title: "Help center",
    description: "Quick answers about features, pricing, and getting started.",
    href: "/#faq",
    label: "View FAQ",
  },
] as const;

export function ContactInfo() {
  return (
    <div className="space-y-4">
      {CONTACT_OPTIONS.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="glass-panel p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                <Icon className="h-5 w-5 text-emerald-400" />
              </span>
              <div>
                <h2 className="font-semibold">{item.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
                {"href" in item && item.href && (
                  <p className="mt-2">
                    {"external" in item && item.external ? (
                      <a
                        href={item.href}
                        className="text-sm text-emerald-300 hover:underline"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link href={item.href} className="text-sm text-emerald-300 hover:underline">
                        {item.label}
                      </Link>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <p className="px-1 text-xs text-muted-foreground">
        AutoClipr · {SITE_URL.replace(/^https?:\/\//, "")}
      </p>
    </div>
  );
}
