import { PointsToolView } from "@/components/ai/tools/PointsToolView";
import { POINTS_TOOLS } from "@/lib/ai/tools";

export const metadata = {
  title: "Canada CRS calculator · Nasuru AI",
  description:
    "Work out your Canada Express Entry CRS score for free — with the latest draw cut-off and its official source. No sign-up.",
};

export default function CrsToolPage() {
  return <PointsToolView tool={POINTS_TOOLS.crs} />;
}
