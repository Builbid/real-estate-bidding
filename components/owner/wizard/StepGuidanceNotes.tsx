export function StepGuidanceNotes({
  showPlumberPipingNote = false,
}: {
  showPlumberPipingNote?: boolean;
}) {
  return (
    <div className="space-y-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
      <p>• Optional Inputs: Fill only the items you need for your project; leave unnecessary fields empty.</p>
      <p>• Estimated Scope: Quantities are approximate. Final billing will be calculated based on joint site measurement during execution.</p>
      <p>• Fixed Bid Rates: Contractor bid rates remain fixed and transparent.</p>
      {showPlumberPipingNote ? (
        <p>
          ℹ️ Note: Includes waste piping up to 30ft. Piping beyond 30ft is charged extra at ₹35/ft during final site measurement.
        </p>
      ) : null}
    </div>
  );
}
