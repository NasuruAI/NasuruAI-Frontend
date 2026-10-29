/** Keyboard/screen-reader skip to the page's <main id="main"> landmark (web.md §15). */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-r-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-e2"
    >
      Skip to content
    </a>
  );
}
