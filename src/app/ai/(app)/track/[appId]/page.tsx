import { ApplicationDetailView } from "@/components/ai/track/ApplicationDetailView";

export const metadata = { title: "Application · Nasuru AI" };

export default async function ApplicationPage({ params }: PageProps<"/ai/track/[appId]">) {
  const { appId } = await params;
  return <ApplicationDetailView applicationId={appId} />;
}
