import { PointsToolView } from "@/components/ai/tools/PointsToolView";
import { POINTS_TOOLS } from "@/lib/ai/tools";

export const metadata = {
  title: "Germany Opportunity Card points calculator · Nasuru AI",
  description:
    "Check if you clear the Chancenkarte six-point line for free, with the blocked-account amount in naira. No sign-up.",
};

export default function OpportunityCardToolPage() {
  return <PointsToolView tool={POINTS_TOOLS["opportunity-card"]} />;
}
