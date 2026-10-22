import { ChangesView } from "@/components/ai/changes/ChangesView";

export const metadata = {
  title: "Immigration rule changelog · Nasuru AI",
  description:
    "Every visa and immigration rule change we track, newest first, each linked to its official government source.",
};

export default function ChangesPage() {
  return <ChangesView />;
}
