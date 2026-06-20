import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AnnouncementBanner } from "@/components/layout/announcement-banner";
import { CreatorWinTicker } from "@/components/layout/creator-win-ticker";
import { PageBackground } from "@/components/ui/page-background";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <PageBackground variant="marketing" />
      <Navbar />
      <CreatorWinTicker />
      <main>{children}</main>
      <Footer />
      <AnnouncementBanner />
    </div>
  );
}
