import { createClient } from '@/lib/supabase/server';
import {
  DEMO_CONSTRUCTION_FIRMS,
  DEMO_LABOUR_CONTRACTORS,
  type DemoFirm,
  type DemoPartnerType,
} from '@/lib/data/demoFirms';

function mapProfileToDemoFirm(
  row: { id: string; full_name: string; role: string; avatar_url?: string | null; is_verified?: boolean },
  partnerType: DemoPartnerType,
): DemoFirm {
  const portfolioLink =
    partnerType === 'construction_firm' ? `/firm/${row.id}` : `/builder/${row.id}`;

  return {
    id: row.id,
    name: row.full_name,
    location: row.is_verified ? 'Verified on BuilBid' : 'Assam',
    rating: 4.5,
    reviewCount: 0,
    specialty: partnerType === 'construction_firm' ? 'Construction Firm' : 'Labour Contractor',
    logoUrl:
      row.avatar_url ??
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.full_name)}`,
    portfolioLink,
    partnerType,
  };
}

async function fetchPartners(role: DemoPartnerType, limit = 8): Promise<DemoFirm[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles_public')
    .select('id, full_name, role, avatar_url, is_verified')
    .eq('role', role)
    .order('is_verified', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  return data.map((row) => mapProfileToDemoFirm(row, role));
}

export async function getFeaturedPartners(): Promise<{
  labour: DemoFirm[];
  firms: DemoFirm[];
}> {
  const [labour, firms] = await Promise.all([
    fetchPartners('labour_contractor'),
    fetchPartners('construction_firm'),
  ]);

  return {
    labour: labour.length > 0 ? labour : DEMO_LABOUR_CONTRACTORS,
    firms: firms.length > 0 ? firms : DEMO_CONSTRUCTION_FIRMS,
  };
}
