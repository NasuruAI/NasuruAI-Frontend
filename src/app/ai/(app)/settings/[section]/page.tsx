import { SettingsShell } from "@/components/ai/account/SettingsShell";

export const metadata = { title: "Settings · Nasuru AI" };

export default async function SettingsPage(props: PageProps<"/ai/settings/[section]">) {
  const { section } = await props.params;
  return <SettingsShell section={section} />;
}
