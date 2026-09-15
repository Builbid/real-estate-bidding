import { revalidatePath, revalidateTag } from 'next/cache';
import { HOME_PUBLIC_CACHE_TAG } from '@/lib/home/projectStats';

/** Bust homepage ISR + unstable_cache after project create / award / delete. */
export function revalidateHomePublic(): void {
  revalidateTag(HOME_PUBLIC_CACHE_TAG, 'max');
  revalidatePath('/');
}
