import { SharedPlanView } from "@/components/ai/share/SharedPlanView";

export const metadata = { title: "A shared plan · Nasuru AI" };

export default async function SharedPlanPage(props: PageProps<"/ai/share/[token]">) {
  const { token } = await props.params;
  return <SharedPlanView token={token} />;
}
