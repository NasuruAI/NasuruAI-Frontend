import type { Metadata } from "next";
import { ResetPassword } from "./ResetPassword";

export const metadata: Metadata = {
  title: "Choose a new password · Nasuru AI",
  robots: { index: false },
};

export default function Page() {
  return <ResetPassword />;
}
