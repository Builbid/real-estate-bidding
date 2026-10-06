'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Mail, MapPin, Pencil, Phone, ShieldCheck } from 'lucide-react';
import { formatBuilbidPublicId } from '@/lib/contract/builbidPublicId';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateAccountFieldAction } from '@/app/actions/profile';
import { useDashboardProfile } from '@/lib/context/ProfileProvider';
import { DocumentsSection } from '@/components/profile/DocumentsSection';
import { formatMobileDisplay, stripMobileDigits } from '@/lib/validation/mobile';
import { formatPincodeInput } from '@/lib/validation/pincode';
import type { Profile, ProjectDocument } from '@/lib/types';

type AccountDetailField = 'email' | 'mobile' | 'location';

function formatLocation(profile: Profile): string {
  if (!profile.physical_address) return 'Not provided';
  return profile.pincode
    ? `${profile.physical_address} — ${profile.pincode}`
    : profile.physical_address;
}

export function InlineAccountDetails({
  profile,
  gstNumber,
}: {
  profile: Profile;
  gstNumber?: string | null;
}) {
  const router = useRouter();
  const { profile: liveProfile, patchProfile, refreshProfile } = useDashboardProfile();
  const current = liveProfile ?? profile;

  const [editing, setEditing] = useState<AccountDetailField | null>(null);
  const [email, setEmail] = useState(current.email);
  const [mobile, setMobile] = useState(formatMobileDisplay(current.mobile ?? ''));
  const [address, setAddress] = useState(current.physical_address ?? '');
  const [pincode, setPincode] = useState(current.pincode ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastNoticeField, setLastNoticeField] = useState<AccountDetailField | null>(null);

  useEffect(() => {
    if (editing) return;
    setEmail(current.email);
    setMobile(formatMobileDisplay(current.mobile ?? ''));
    setAddress(current.physical_address ?? '');
    setPincode(current.pincode ?? '');
  }, [current.email, current.mobile, current.physical_address, current.pincode, editing]);

  function startEdit(field: AccountDetailField) {
    setError(null);
    setNotice(null);
    setLastNoticeField(null);
    setEmail(current.email);
    setMobile(formatMobileDisplay(current.mobile ?? ''));
    setAddress(current.physical_address ?? '');
    setPincode(current.pincode ?? '');
    setEditing(field);
  }

  function cancelEdit() {
    setEditing(null);
    setError(null);
    setNotice(null);
    setLastNoticeField(null);
    setEmail(current.email);
    setMobile(formatMobileDisplay(current.mobile ?? ''));
    setAddress(current.physical_address ?? '');
    setPincode(current.pincode ?? '');
  }

  async function saveField(field: AccountDetailField) {
    setSaving(true);
    setError(null);
    setNotice(null);

    const result = await updateAccountFieldAction(
      field,
      field === 'email'
        ? { email }
        : field === 'mobile'
          ? { mobile }
          : { physical_address: address, pincode },
    );

    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    if (field === 'email') {
      patchProfile({ email: email.trim().toLowerCase() });
    } else if (field === 'mobile') {
      patchProfile({ mobile: stripMobileDigits(mobile) });
    } else {
      patchProfile({
        physical_address: address.trim() || null,
        pincode: formatPincodeInput(pincode) || null,
      });
    }

    if (result.warning) {
      setNotice(result.warning);
      setLastNoticeField(field);
    } else {
      setNotice(null);
      setLastNoticeField(null);
    }
    setEditing(null);
    void refreshProfile();
    router.refresh();
  }

  return (
    <div className="w-full min-w-0 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-4 dark:divide-slate-700/80 dark:border-slate-700/80 dark:bg-slate-900">
      <EditableDetailRow
        icon={Mail}
        label="Email"
        value={current.email}
        editing={editing === 'email'}
        saving={saving && editing === 'email'}
        error={editing === 'email' ? error : null}
        notice={editing !== 'email' && lastNoticeField === 'email' ? notice : editing === 'email' ? notice : null}
        onEdit={() => startEdit('email')}
        onCancel={cancelEdit}
        onSave={() => void saveField('email')}
      >
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9"
        />
      </EditableDetailRow>

      <EditableDetailRow
        icon={Phone}
        label="Mobile"
        value={current.mobile ? formatMobileDisplay(current.mobile) : 'Not provided'}
        editing={editing === 'mobile'}
        saving={saving && editing === 'mobile'}
        error={editing === 'mobile' ? error : null}
        notice={editing !== 'mobile' && lastNoticeField === 'mobile' ? notice : editing === 'mobile' ? notice : null}
        onEdit={() => startEdit('mobile')}
        onCancel={cancelEdit}
        onSave={() => void saveField('mobile')}
      >
        <Input
          type="tel"
          autoComplete="tel"
          value={mobile}
          onChange={(e) => setMobile(formatMobileDisplay(e.target.value))}
          className="h-9"
        />
      </EditableDetailRow>

      <EditableDetailRow
        icon={MapPin}
        label="Location"
        value={formatLocation(current)}
        editing={editing === 'location'}
        saving={saving && editing === 'location'}
        error={editing === 'location' ? error : null}
        notice={editing !== 'location' && lastNoticeField === 'location' ? notice : editing === 'location' ? notice : null}
        onEdit={() => startEdit('location')}
        onCancel={cancelEdit}
        onSave={() => void saveField('location')}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
          <Input
            type="text"
            autoComplete="street-address"
            placeholder="Address / area"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="h-9"
          />
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="Pincode"
            value={pincode}
            onChange={(e) => setPincode(formatPincodeInput(e.target.value))}
            className="h-9"
          />
        </div>
      </EditableDetailRow>

      {gstNumber ? <ReadOnlyDetailRow icon={ShieldCheck} label="GST Number" value={gstNumber} /> : null}
      <BuilbidIdRow profileId={current.id} />
    </div>
  );
}

/** Single-line, read-only account ID. No edit control. */
function BuilbidIdRow({ profileId }: { profileId: string }) {
  const builbidId = formatBuilbidPublicId(profileId);
  return (
    <div className="py-3">
      <p
        className="overflow-x-auto whitespace-nowrap text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100"
        title={`BUILBID ID: ${builbidId}`}
      >
        BUILBID ID: <span className="font-mono">{builbidId}</span>
      </p>
    </div>
  );
}

/** Documents folder under the BuilBid ID. Opens the agreement and invoice hub on this page. */
export function ProfileDocumentsCard({ documents }: { documents: ProjectDocument[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash === '#documents') setOpen(true);
  }, []);

  return (
    <section id="documents">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 text-left text-sm font-semibold uppercase tracking-wide text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 dark:text-slate-100"
      >
        <Folder className="h-5 w-5 shrink-0 text-brand" aria-hidden />
        Documents
      </button>

      {open ? (
        <div className="pt-3">
          <DocumentsSection documents={documents} showIntro={false} />
        </div>
      ) : null}
    </section>
  );
}

function EditableDetailRow({
  icon: Icon,
  label,
  value,
  editing,
  saving,
  error,
  notice,
  onEdit,
  onCancel,
  onSave,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  editing: boolean;
  saving: boolean;
  error: string | null;
  notice: string | null;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-none border-0 bg-transparent px-0 py-3">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          {editing ? (
            <div className="mt-2 space-y-2">
              {children}
              {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
              {notice ? <p className="text-xs text-amber-700 dark:text-amber-400">{notice}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={onSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-0.5 break-words text-sm text-foreground">{value}</p>
              {notice ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{notice}</p> : null}
            </>
          )}
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-brand hover:bg-brand/10 hover:text-brand-hover"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ReadOnlyDetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}
