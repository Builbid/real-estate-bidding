export function StepGuidanceNotes({
  showPlumberPipingNote = false,
}: {
  showPlumberPipingNote?: boolean;
}) {
  return (
    <div className="space-y-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
      <p className="text-sm font-semibold leading-5 text-slate-700 dark:text-slate-200">
        Important Notes
      </p>
      <p>• Optional Inputs: Fill only the items you need for your project. You can leave the remaining fields empty.</p>
      <p>• Approximate Quantities: Quantities provided are estimated. Final billing will be calculated based on actual site measurement during execution.</p>
      <p>• Fixed Rates: Contractor bid rates remain fixed and transparent throughout project execution.</p>
      {showPlumberPipingNote ? (
        <div className="space-y-0.5">
          <p>
            • Waste Piping Terms: Includes waste piping up to 30ft free of charge. For piping beyond 30ft, extra charges apply based on actual site measurement:
          </p>
          <p className="pl-4">- Normal Waste Pipeline: ₹30/ft (beyond 30ft)</p>
          <p className="pl-4">- Toilet Waste Pipeline: ₹70/ft (beyond 30ft)</p>
        </div>
      ) : null}
    </div>
  );
}
