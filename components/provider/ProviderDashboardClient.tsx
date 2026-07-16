'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarUpload } from '@/components/builder/AvatarUpload';
import { IndianCityAutocomplete, parseIndianDistrictSelection } from '@/components/shared/IndianCityAutocomplete';
import { updateCallbackStatusAction } from '@/app/actions/callbackRequest';
import { updateServiceProviderProfileAction } from '@/app/actions/serviceProvider';
import type { CallbackRequest, ServiceCategory, ServiceProvider } from '@/lib/types/hireServices';
import { cn } from '@/lib/utils';

interface ProviderDashboardClientProps {
  provider: ServiceProvider;
  categories: ServiceCategory[];
  callbacks: CallbackRequest[];
}

export function ProviderDashboardClient({
  provider,
  categories,
  callbacks,
}: ProviderDashboardClientProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(provider.full_name);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(provider.avatar_url ?? null);

  useEffect(() => {
    setAvatarUrl(provider.avatar_url ?? null);
  }, [provider.avatar_url]);
  const [district, setDistrict] = useState(provider.district);
  const [locationLabel, setLocationLabel] = useState(provider.district);
  const [bio, setBio] = useState(provider.bio ?? '');
  const [startingRate, setStartingRate] = useState(
    provider.starting_rate != null ? String(provider.starting_rate) : '',
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>(provider.categories);
  const [workPhotoUrls, setWorkPhotoUrls] = useState(provider.work_photo_urls.join('\n'));
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profilePending, startProfileTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    startProfileTransition(async () => {
      const formData = new FormData();
      formData.set('full_name', fullName);
      formData.set('district', district);
      formData.set('bio', bio);
      formData.set('starting_rate', startingRate);
      formData.set('work_photo_urls', workPhotoUrls);
      selectedCategories.forEach((id) => formData.append('category_ids', id));
      const result = await updateServiceProviderProfileAction({ error: null, success: false }, formData);
      if (result.error) setProfileError(result.error);
      else setProfileSuccess(true);
    });
  }

  function setCallbackStatus(id: string, status: CallbackRequest['status']) {
    startStatusTransition(async () => {
      await updateCallbackStatusAction(id, status);
    });
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Provider Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage callback requests and your public profile.
        </p>
      </div>

      {!provider.is_verified && (
        <div className="rounded-xl border border-border bg-card/50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-2 flex-1">
            <BadgeCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Get a Verified badge (optional)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload ID and work photos — not required to stay listed.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/provider/verify">Verify profile</Link>
          </Button>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Callback requests</h2>
        {callbacks.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border py-8 text-center">
            No callback requests yet. Keep your profile complete so clients can find you.
          </p>
        ) : (
          <ul className="space-y-3">
            {callbacks.map((cb) => (
              <li key={cb.id} className="rounded-xl border border-border p-4 bg-card/40">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{cb.client_phone}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(cb.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full',
                      cb.status === 'pending' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                      cb.status === 'contacted' && 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
                      cb.status === 'completed' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                    )}
                  >
                    {cb.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(['pending', 'contacted', 'completed'] as const).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant={cb.status === s ? 'default' : 'outline'}
                      disabled={statusPending}
                      onClick={() => setCallbackStatus(cb.id, s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Profile photo</h2>
        <div className="rounded-xl border border-border p-5 flex justify-center">
          <AvatarUpload
            fullName={fullName}
            avatarUrl={avatarUrl}
            accountType="service_provider"
            onUploaded={(url) => {
              setAvatarUrl(url);
              router.refresh();
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">Edit profile</h2>
        <form onSubmit={saveProfile} className="space-y-4 rounded-xl border border-border p-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full name</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">District</label>
            <IndianCityAutocomplete
              value={locationLabel}
              onChange={(val) => {
                setLocationLabel(val);
                const parsed = parseIndianDistrictSelection(val);
                if (parsed?.district) setDistrict(parsed.district);
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Categories</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const selected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium',
                      selected ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-border',
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Starting rate (₹)</label>
            <Input type="number" min={0} value={startingRate} onChange={(e) => setStartingRate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Bio</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Work photo URLs (one per line)</label>
            <textarea
              className="flex min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono"
              value={workPhotoUrls}
              onChange={(e) => setWorkPhotoUrls(e.target.value)}
              placeholder="https://…"
            />
          </div>
          {profileError && <p className="text-sm text-red-500">{profileError}</p>}
          {profileSuccess && <p className="text-sm text-emerald-600">Profile saved.</p>}
          <Button type="submit" disabled={profilePending}>
            {profilePending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save profile'}
          </Button>
        </form>
      </section>
    </div>
  );
}
