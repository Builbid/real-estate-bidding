const GUIDANCE_NOTES = [
  '• Optional Inputs: Fill only the items you need for your project; leave unnecessary fields empty.',
  '• Estimated Scope: Quantities are approximate. Final billing will be calculated based on joint site measurement during execution.',
  '• Fixed Bid Rates: Contractor bid rates remain fixed and transparent.',
] as const;

export function WizardContinueGuidance({
  plumberPipingNote = false,
}: {
  plumberPipingNote?: boolean;
}) {
  return (
    <div className="space-y-1 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
      {GUIDANCE_NOTES.map((note) => (
        <p key={note}>{note}</p>
      ))}
      {plumberPipingNote ? (
        <p>
          ℹ️ Note: Includes waste piping up to 30ft. Piping beyond 30ft is charged extra at ₹35/ft during final site measurement.
        </p>
      ) : null}
    </div>
  );
}
