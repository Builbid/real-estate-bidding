const FILL_IN_NOTE =
  'Fill only the work details required for your project. You can leave fields empty if that work is not needed.';
const SELECT_NOTE =
  'Select only the work details required for your project. You can leave options unchecked if that work is not needed.';

export function StepGuidanceNotes({
  fillInWorkDetails = false,
  showWastePiping = false,
}: {
  fillInWorkDetails?: boolean;
  showWastePiping?: boolean;
}) {
  return (
    <div className="space-y-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
      <p className="text-sm font-semibold leading-5 text-slate-700 dark:text-slate-200">
        Important Notes:
      </p>
      <p>• {fillInWorkDetails ? FILL_IN_NOTE : SELECT_NOTE}</p>
      <p>• Project quantities and calculated total values are considered estimates based on your input. Final billing will be calculated after actual joint site measurement during worker site visit.</p>
      <p>• Once bidding closes and you select an estimated total value, the underlying unit rates for that offer remain fixed and non-negotiable for final billing.</p>
      {showWastePiping && (
        <div>
          <p>
            • Waste Piping Terms: Includes waste piping up to 30ft free of charge. For piping beyond 30ft, extra charges apply based on actual site measurement:
          </p>
          <ul className="ml-4 space-y-0.5 pl-4">
            <li>- Normal Waste Pipeline: ₹30/ft</li>
            <li>- Toilet Waste Pipeline: ₹70/ft</li>
          </ul>
        </div>
      )}
    </div>
  );
}
