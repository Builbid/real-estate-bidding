/** Primary marketing navigation — shared by Navbar and Footer. */
export const PUBLIC_NAV_LINKS = [
  { href: '/#live-auctions', labelKey: 'nav.liveProjects' as const },
  { href: '/projects', labelKey: 'nav.allProjects' as const },
  { href: '/about', labelKey: 'nav.about' as const },
] as const;

export const PUBLIC_FOOTER_PLATFORM_LINKS = [
  { href: '/workers', labelKey: 'footer.mistriWorkers' as const },
  { href: '/dashboard/owner/new-project', labelKey: 'footer.postAProject' as const },
] as const;
