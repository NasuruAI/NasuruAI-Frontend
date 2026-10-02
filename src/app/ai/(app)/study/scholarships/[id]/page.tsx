import { ScholarshipDetailView } from "@/components/ai/study/ScholarshipDetailView";

export const metadata = { title: "Scholarship · Nasuru AI" };

export default async function ScholarshipPage({
  params,
  searchParams,
}: PageProps<"/ai/study/scholarships/[id]">) {
  const { id } = await params;
  const { country, level } = await searchParams;
  return (
    <ScholarshipDetailView
      id={id}
      country={typeof country === "string" ? country : undefined}
      level={typeof level === "string" ? level : undefined}
    />
  );
}
