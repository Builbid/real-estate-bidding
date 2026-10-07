'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatMobileDisplay } from '@/lib/validation/mobile';

const MESSAGE =
  'ধন্যবাদ! আপুনি সপোনৰ ঘৰ সাজিবলৈ বিল্ডাৰ বাছনি কৰিলে। আমাৰ কোম্পানীৰ মেনেজমেন্টৰ ফালৰ পৰা আপোনাৰ সৈতে অতি সোনকালে ফোনত যোগাযোগ কৰা হ’ব। অনুগ্ৰহ কৰি আপোনাৰ বৰ্তমান সক্ৰিয় ফোন নম্বৰটো নিশ্চিত কৰক।';

export function OwnerPhoneConfirmModal({
  open,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (phone: string) => void;
}) {
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id;
      if (!userId || cancelled) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('mobile')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      const registered = typeof profile?.mobile === 'string' ? profile.mobile : '';
      setPhone(registered ? formatMobileDisplay(registered) : '');
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="presentation"
      onClick={loading ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-phone-confirm-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="owner-phone-confirm-title" className="text-base font-bold text-slate-900">
          Confirm your active phone number
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{MESSAGE}</p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="owner-callback-phone">
          Active phone number
        </label>
        <input
          id="owner-callback-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-emerald-600 focus:ring-2"
        />
        {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(phone)}
            disabled={loading || !phone.trim()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Confirm number'}
          </button>
        </div>
      </div>
    </div>
  );
}
