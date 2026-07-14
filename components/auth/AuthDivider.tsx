interface AuthDividerProps {
  label?: string;
}

export function AuthDivider({ label = 'or continue with email' }: AuthDividerProps) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card/80 dark:bg-card/60 px-3 text-muted-foreground tracking-wide">
          {label}
        </span>
      </div>
    </div>
  );
}
