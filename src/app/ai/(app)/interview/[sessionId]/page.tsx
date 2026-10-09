import { SessionView } from "@/components/ai/interview/SessionView";

export const metadata = { title: "Interview practice · Nasuru AI" };

export default async function InterviewSessionPage({
  params,
}: PageProps<"/ai/interview/[sessionId]">) {
  const { sessionId } = await params;
  return <SessionView sessionId={sessionId} />;
}
