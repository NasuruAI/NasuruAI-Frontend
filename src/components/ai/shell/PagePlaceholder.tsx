import { Construction } from "lucide-react";
import { EmptyState } from "../feedback";

/**
 * A section the frame links to before its module is built (web build
 * checklist). Says plainly what is coming, instead of a 404.
 */
export function PagePlaceholder({
  title,
  what,
  module,
}: {
  title: string;
  what: string;
  module: string;
}) {
  return (
    <div className="mx-auto max-w-[720px]">
      <h1 className="font-display text-h1 text-balance">{title}</h1>
      <EmptyState icon={<Construction />} title="Being built">
        {what} <span className="text-subtle">({module})</span>
      </EmptyState>
    </div>
  );
}
