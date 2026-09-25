import { notFound } from "next/navigation";
import { PagePlaceholder } from "@/components/ai/shell/PagePlaceholder";

const SECTIONS: Record<string, string> = {
  notifications: "Notifications",
  devices: "Devices",
  extension: "Extension",
  connections: "Connections",
  data: "Your data",
};

export default async function SettingsPage(props: PageProps<"/ai/settings/[section]">) {
  const { section } = await props.params;
  const title = SECTIONS[section];
  if (!title) notFound();
  return (
    <PagePlaceholder title={title} what="Settings for this part of your account." module="F14" />
  );
}
