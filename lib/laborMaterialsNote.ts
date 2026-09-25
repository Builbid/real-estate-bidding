export function laborOnlyMaterialsNote(serviceName: string): string {
  const name = serviceName.trim() || 'service';
  return `Bids cover ${name} labor and service charges only. Materials will be arranged by the property owner.`;
}
