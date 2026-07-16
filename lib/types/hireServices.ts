export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  created_at: string;
}

export interface ServiceProvider {
  id: string;
  full_name: string;
  phone: string;
  district: string;
  categories: string[];
  starting_rate: number | null;
  bio: string | null;
  work_photo_urls: string[];
  rating_avg: number;
  review_count: number;
  status: 'active' | 'inactive';
  is_verified: boolean;
  verification_submitted_at: string | null;
  verification_docs_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Public listing — no phone */
export type ServiceProviderPublic = Omit<ServiceProvider, 'phone' | 'verification_docs_url'>;

export type CallbackRequestStatus = 'pending' | 'contacted' | 'completed';

export interface CallbackRequest {
  id: string;
  client_id: string;
  provider_id: string;
  client_phone: string;
  status: CallbackRequestStatus;
  created_at: string;
}
