import { GuideView } from "@/components/ai/guides/GuideView";

export async function generateMetadata(props: PageProps<"/ai/guides/[route]">) {
  const { route } = await props.params;
  const name = route.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${name} — route guide · Nasuru AI`,
    description: `What the ${name} route requires, with every rule linked to its official source. Check for free if you qualify.`,
  };
}

export default async function RouteGuidePage(props: PageProps<"/ai/guides/[route]">) {
  const { route } = await props.params;
  return <GuideView code={route} />;
}
