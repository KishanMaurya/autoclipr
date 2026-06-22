import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { PageBackground } from "@/components/ui/page-background";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <PageBackground variant="marketing" />
      {/* Green spotlight covering navbar → hero badge area */}
      <div
        className="pointer-events-none fixed left-1/2 top-0 -translate-x-1/2 z-0"
        style={{
          width: "800px",
          height: "420px",
          background: "radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.07) 50%, transparent 75%)",
          filter: "blur(36px)",
        }}
      />
      <Navbar />
      <main>{children}</main>
      <Footer />
      <AnnouncementBanner />
    </div>
  );
}
