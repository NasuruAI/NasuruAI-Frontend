import { ToastProvider } from "@/components/ai/Toast";
import { AiShell } from "@/components/ai/shell/AiShell";

/** Every signed-in Nasuru AI page, inside the app frame (web.md §1). */
export default function AiAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AiShell>{children}</AiShell>
    </ToastProvider>
  );
}
