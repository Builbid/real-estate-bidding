import { HomePageContent } from '@/components/home/HomePageContent';
import { loadHomePublicData } from '@/lib/home/loadHomePublicData';

export const revalidate = 60;

export default async function HomePage() {
  const publicData = await loadHomePublicData();

  return (
    <HomePageContent
      showcaseProjects={publicData.showcaseProjects}
      frozenProjects={publicData.frozenProjects}
      statValues={publicData.statValues}
      featuredFirms={publicData.featuredFirms}
    />
  );
}
