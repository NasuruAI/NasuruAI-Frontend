import { notFound } from "next/navigation";
import { KitGallery } from "./KitGallery";

/**
 * Every Nasuru AI component in its states, for review and for the visual
 * regression screenshots (web-build checklist F17). Development only.
 */
export default function KitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitGallery />;
}
