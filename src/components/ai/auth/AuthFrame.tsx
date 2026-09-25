/**
 * The frame every sign-in and sign-up page shares: the mark, one card, and
 * the links under it. No app chrome: a signed-out visitor has no plan yet.
 */
export function AuthFrame({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main
      id="main"
      className="flex min-h-screen flex-col items-center px-4 py-10 sm:justify-center sm:py-16"
    >
      <p className="mb-6 flex items-center gap-2">
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-r-sm bg-accent font-display text-body font-bold text-on-accent"
        >
          N
        </span>
        <span className="font-display text-h4 font-semibold text-ink">Nasuru AI</span>
      </p>
      <div className="w-full max-w-md rounded-r-lg border border-line bg-surface p-5 shadow-e1 sm:p-8">
        <h1 className="font-display text-h2 text-balance text-ink">{title}</h1>
        {lead && <p className="mt-1 text-body text-muted">{lead}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && (
        <div className="mt-6 max-w-md space-y-2 text-center text-body-s text-muted">{footer}</div>
      )}
    </main>
  );
}
