import { Outlet, useLocation } from "react-router-dom";
import HomeNavbar from "@/components/home/HomeNavbar";
import AtleitaOrganizerHeader from "@/components/layouts/AtleitaOrganizerHeader";
import SiteFooter from "@/components/SiteFooter";
import { shouldHidePublicSiteNavbar } from "@/utils/mobileTabBar";
import { cn } from "@/lib/utils";

function isOrganizerOnboardingPath(pathname: string): boolean {
  return pathname.startsWith("/organizers/") || pathname === "/organizers";
}

export default function PublicSiteLayout() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const organizerFlow = isOrganizerOnboardingPath(pathname);
  const hideSiteNavbar = shouldHidePublicSiteNavbar(pathname);

  // Atleita marketing home owns its own pace-site chrome.
  if (isHome) {
    return <Outlet />;
  }

  // Organizer signup/start: same pace shell as home.
  if (organizerFlow) {
    return (
      <div className="pace-site atleita-organizer-page flex flex-col overflow-x-clip w-full max-w-full min-h-screen min-w-0">
        <AtleitaOrganizerHeader />
        <main className="flex-1 w-full min-w-0 overflow-x-clip">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="pace-site flex flex-col overflow-x-clip w-full max-w-full min-h-screen min-w-0">
      {hideSiteNavbar ? null : <HomeNavbar />}
      <main
        className={cn(
          "flex-1 w-full min-w-0 overflow-x-clip",
          !hideSiteNavbar && "pt-[4.5rem]",
        )}
      >
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
