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
      <AnnouncementBanner />
      {/* pt-10 offsets the fixed announcement banner (~40px) */}
      <div className="pt-10">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
