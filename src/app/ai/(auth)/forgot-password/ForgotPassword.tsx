"use client";

import { useState } from "react";
import { Button, InlineAlert, TextField, TextLink } from "@/components/ai";
import { AuthFrame } from "@/components/ai/auth/AuthFrame";
import { ApiError } from "@/lib/api";
import { requestPasswordReset } from "@/lib/auth/client";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // The same answer whether or not the address has an account.
      setSent((await requestPasswordReset(email.trim())).detail);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "We couldn't reach Nasuru AI. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title="Reset your password"
      lead="We'll email you a link to choose a new one."
      footer={
        <p>
          Signed up with your phone number? You don&apos;t have a password:{" "}
          <TextLink href="/ai/login">sign in with a code</TextLink>.
        </p>
      }
    >
      {sent ? (
        <div className="space-y-5">
          <InlineAlert tone="success" title="Check your email">
            {sent} The link works for an hour. Check your spam folder if it doesn&apos;t arrive.
          </InlineAlert>
          <TextLink href="/ai/login" standalone>
            Back to sign in
          </TextLink>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-5">
          <TextField
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={error ?? undefined}
          />
          <Button type="submit" className="w-full" loading={busy}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
