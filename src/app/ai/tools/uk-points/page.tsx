import { PointsToolView } from "@/components/ai/tools/PointsToolView";
import { POINTS_TOOLS } from "@/lib/ai/tools";

export const metadata = {
  title: "UK Skilled Worker points calculator · Nasuru AI",
  description:
    "Check your UK Skilled Worker visa points for free — the 70-point test with salary, skill level and English. No sign-up.",
};

export default function UkPointsToolPage() {
  return <PointsToolView tool={POINTS_TOOLS["uk-points"]} />;
}
