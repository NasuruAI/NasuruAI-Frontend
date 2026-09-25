import { QueryProvider } from "@/lib/ai/QueryProvider";

/**
 * Every Nasuru AI page, under `/ai` until the product has its own domain
 * (web.md). Light only (design-system §2): the attribute carries the light
 * token set whatever the viewer's OS prefers, while the agency pages around
 * it keep following the OS.
 */
export default function AiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="light" className="min-h-screen bg-canvas font-sans text-ink">
      <QueryProvider>{children}</QueryProvider>
    </div>
  );
}
