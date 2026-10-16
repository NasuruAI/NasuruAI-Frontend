import { GradeToolView } from "@/components/ai/tools/GradeToolView";

export const metadata = {
  title: "Grade converter (Nigeria → UK, Germany) · Nasuru AI",
  description:
    "Convert your Nigerian degree class or CGPA to UK and German scales for free, with the exact method shown. No sign-up.",
};

export default function GradeConverterToolPage() {
  return <GradeToolView />;
}
