export function StepGuidanceNotes({ showWastePiping = false }: { showWastePiping?: boolean }) {
  return (
    <div className="space-y-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
      <p className="text-sm font-semibold leading-5 text-slate-700 dark:text-slate-200">
        Important Notes:
      </p>
      <p>• Fill only the items required for your project. You can leave fields empty if they are not needed for your work.</p>
      <p>• Quantities provided are estimated. Final billing will be calculated based on actual joint site measurement during site visit.</p>
      <p>• Contractor bid rates remain fixed and transparent once finalized.</p>
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
