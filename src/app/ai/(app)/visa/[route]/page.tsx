import { VisaGuideView } from "@/components/ai/guidance/VisaGuideView";

export const metadata = { title: "Visa guide · Nasuru AI" };

export default async function VisaRoutePage({ params }: PageProps<"/ai/visa/[route]">) {
  const { route } = await params;
  return <VisaGuideView code={route} />;
}
