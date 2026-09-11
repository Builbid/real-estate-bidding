export function DashboardStatTiles({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-6 lg:grid-cols-4">
      {items.map(({ label, value }) => (
        <div key={label}>
          <p className="text-2xl font-bold tabular-nums text-foreground">{value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
