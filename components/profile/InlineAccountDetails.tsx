'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Mail, MapPin, Pencil, Phone, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateAccountFieldAction } from '@/app/actions/profile';
import { useDashboardProfile } from '@/lib/context/ProfileProvider';
import { formatMobileDisplay, stripMobileDigits } from '@/lib/validation/mobile';
import { formatPincodeInput } from '@/lib/validation/pincode';
import type { Profile } from '@/lib/types';

type AccountDetailField = 'email' | 'mobile' | 'location';

function formatLocation(profile: Profile): string {
  if (!profile.physical_address) return 'Not provided';
  return profile.pincode
    ? `${profile.physical_address} — ${profile.pincode}`
    : profile.physical_address;
}

export function InlineAccountDetails({
  profile,
  roleLabel,
  gstNumber,
}: {
  profile: Profile;
  roleLabel: string;
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
    <div className="space-y-3">
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
        <div className="grid gap-2 sm:grid-cols-[1fr_7.5rem]">
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

      <ReadOnlyDetailRow icon={BadgeCheck} label="Account Type" value={roleLabel} />
      {gstNumber ? <ReadOnlyDetailRow icon={ShieldCheck} label="GST Number" value={gstNumber} /> : null}
    </div>
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
