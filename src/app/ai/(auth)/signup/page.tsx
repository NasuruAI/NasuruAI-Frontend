import type { Metadata } from "next";
import { SignUp } from "./SignUp";

export const metadata: Metadata = {
  title: "Create your account · Nasuru AI",
  robots: { index: false },
};

export default function SignUpPage() {
  return <SignUp />;
}
