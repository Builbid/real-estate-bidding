-- Closed auctions that were not awarded. Added in its own migration so the
-- next migration can write the new enum value after this one commits.
alter type public.project_status add value if not exists 'expired';
