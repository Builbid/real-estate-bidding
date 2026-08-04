-- Firms can now create and name as many construction packages as they want
-- (previously fixed to premium/standard/basic keys). The column stays jsonb —
-- shape moves from { premium, standard, basic } to an array of package
-- objects: [{ id, name, structure, flooring, doors_windows, bathroom_fittings,
-- kitchen, painting, electrical, design_and_pm, exclusions }, ...].
-- No schema change needed for jsonb; this migration just documents the shape
-- and clears any legacy-shaped test data so the UI doesn't need to guess.

comment on column public.profiles.construction_class_packages is
  'Firm-defined construction packages (array): custom name + structured category descriptions per package';

comment on view public.firms_public is
  'Public firm profile — company name, logo, years, firm-defined construction packages';
