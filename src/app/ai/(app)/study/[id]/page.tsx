import { ProgrammeDetailView } from "@/components/ai/study/ProgrammeDetailView";

export const metadata = { title: "Programme · Nasuru AI" };

export default async function ProgrammePage({ params }: PageProps<"/ai/study/[id]">) {
  const { id } = await params;
  return <ProgrammeDetailView id={id} />;
}
