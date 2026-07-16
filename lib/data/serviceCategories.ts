/** Display catalog — kept in sync with supabase/migrations/017_hire_services.sql seed */
export const SERVICE_CATEGORIES_CATALOG = [
  { name: 'Painter', slug: 'painter', icon: '🎨' },
  { name: 'Plumber', slug: 'plumber', icon: '🔧' },
  { name: 'Electrician', slug: 'electrician', icon: '⚡' },
  { name: 'Carpenter', slug: 'carpenter', icon: '🪚' },
  { name: 'False Ceiling Work', slug: 'false-ceiling-work', icon: '🏠' },
  { name: 'Earthwork', slug: 'earthwork', icon: '🚜' },
] as const;

export type ServiceCategorySlug = (typeof SERVICE_CATEGORIES_CATALOG)[number]['slug'];
