'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { updateAccountDetailsAction } from '@/app/actions/profile';
import { useDashboardProfile } from '@/lib/context/ProfileProvider';
import { formatMobileDisplay, stripMobileDigits } from '@/lib/validation/mobile';
import { formatPincodeInput } from '@/lib/validation/pincode';
import type { Profile } from '@/lib/types';

interface EditAccountDetailsDialogProps {
  profile: Profile;
}

export function EditAccountDetailsDialog({ profile }: EditAccountDetailsDialogProps) {
  const { patchProfile, refreshProfile } = useDashboardProfile();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(profile.email);
  const [mobile, setMobile] = useState(formatMobileDisplay(profile.mobile ?? ''));
  const [address, setAddress] = useState(profile.physical_address ?? '');
  const [pincode, setPincode] = useState(profile.pincode ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function resetFromProfile() {
    setEmail(profile.email);
    setMobile(formatMobileDisplay(profile.mobile ?? ''));
    setAddress(profile.physical_address ?? '');
    setPincode(profile.pincode ?? '');
    setError(null);
    setNotice(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);
    const result = await updateAccountDetailsAction({
      email,
      mobile,
      physical_address: address,
      pincode,
    });
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    patchProfile({
      email: email.trim().toLowerCase(),
      mobile: stripMobileDigits(mobile),
      physical_address: address.trim() || null,
      pincode: formatPincodeInput(pincode) || null,
    });
    if (result.warning) setNotice(result.warning);
    setOpen(false);
    void refreshProfile();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          resetFromProfile();
          setOpen(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit account details</DialogTitle>
            <DialogDescription>
              Update the email, mobile number, and location on your own BuilBid profile. These details stay private to you and platform admins.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Mobile number"
              type="tel"
              autoComplete="tel"
              value={mobile}
              onChange={(e) => setMobile(formatMobileDisplay(e.target.value))}
            />
            <Input
              label="Location"
              type="text"
              autoComplete="street-address"
              placeholder="Address / area"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <Input
              label="Pincode"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="6-digit pincode"
              value={pincode}
              onChange={(e) => setPincode(formatPincodeInput(e.target.value))}
            />

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            {notice && <p className="text-sm text-amber-700 dark:text-amber-400">{notice}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
