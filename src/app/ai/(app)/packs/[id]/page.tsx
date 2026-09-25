import { PagePlaceholder } from "@/components/ai/shell/PagePlaceholder";

export const metadata = { title: "Answer pack · Nasuru AI" };

/** "Prepare answers" lands here; the pack itself is web-build F9. */
export default function PackPage() {
  return (
    <PagePlaceholder
      title="Your answer pack"
      what="Every field of the job's form, answered from your confirmed facts, with where each answer came from."
      module="F9"
    />
  );
}
