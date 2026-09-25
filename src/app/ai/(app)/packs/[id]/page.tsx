import { PackView } from "@/components/ai/packs/PackView";

export const metadata = { title: "Answer pack · Nasuru AI" };

export default async function PackPage({ params }: PageProps<"/ai/packs/[id]">) {
  const { id } = await params;
  return <PackView id={id} />;
}
