'use client';

import { useActionState } from 'react';
import { submitContactAction, type ContactFormState } from '@/app/actions/contact';
import { Button } from '@/components/ui/button';

const initialState: ContactFormState = { error: null, success: false };

const fieldClass =
  'flex h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-400 md:text-sm';

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContactAction, initialState);

  if (state.success) {
    return (
      <p className="rounded-xl border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
        Thank you. Your message has been received and our team will contact you.
      </p>
    );
  }

  return (
    <form action={action} className="relative mt-3 grid max-w-xl gap-4">
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Name
        <input name="full_name" required autoComplete="name" maxLength={120} className={fieldClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Email
        <input name="email" type="email" autoComplete="email" maxLength={200} className={fieldClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Mobile
        <input name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={20} className={fieldClass} />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Topic
        <select name="subject" required defaultValue="general" className={fieldClass}>
          <option value="general">General question</option>
          <option value="account">Account and login</option>
          <option value="workmanship">Site workmanship and quality</option>
          <option value="payment">Payment and billing</option>
        </select>
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-foreground">
        Message
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          className={`${fieldClass} h-auto py-3`}
        />
      </label>
      <div className="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>
          Company website
          <input name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
}
