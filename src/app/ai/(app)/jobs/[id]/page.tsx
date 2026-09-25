import { JobDetailView } from "@/components/ai/jobs/JobDetailView";

export const metadata = { title: "Job · Nasuru AI" };

export default async function JobPage({ params }: PageProps<"/ai/jobs/[id]">) {
  const { id } = await params;
  return <JobDetailView id={id} />;
}
