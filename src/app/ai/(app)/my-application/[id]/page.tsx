import { ApplicationDetailView } from "@/components/ai/my-application/ApplicationDetailView";

export const metadata = { title: "My application · Nasuru AI" };

export default async function ApplicationDetailPage({
  params,
}: PageProps<"/ai/my-application/[id]">) {
  const { id } = await params;
  return <ApplicationDetailView id={id} />;
}
