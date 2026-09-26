import { CvEditorView } from "@/components/ai/cv/CvEditorView";

export const metadata = { title: "CV editor · Nasuru AI" };

export default async function CvEditorPage({ params }: PageProps<"/ai/cv/[id]">) {
  const { id } = await params;
  return <CvEditorView id={id} />;
}
