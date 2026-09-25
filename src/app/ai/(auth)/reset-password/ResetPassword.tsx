"use client";

import { useState } from "react";
import { Button, InlineAlert, TextField, TextLink } from "@/components/ai";
import { AuthFrame } from "@/components/ai/auth/AuthFrame";
import { ApiError } from "@/lib/api";
import { confirmPasswordReset } from "@/lib/auth/client";

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [errors, setErrors] = useState<{ password?: string; again?: string; alert?: string }>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const problems: typeof errors = {};
    if (password.length < 10) problems.password = "Use at least 10 characters.";
    if (again !== password) problems.again = "The two passwords don't match.";
    setErrors(problems);
    if (Object.keys(problems).length) return;
    // Read at submit time, not with useSearchParams: the page stays static.
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    setBusy(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const field = err.fieldErrors.new_password?.[0];
        setErrors(field ? { password: field } : { alert: err.message });
      } else {
        setErrors({ alert: "We couldn't reach Nasuru AI. Check your connection and try again." });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Choose a new password">
      {done ? (
        <div className="space-y-5">
          <InlineAlert tone="success" title="Password updated">
            You can sign in with it now.
          </InlineAlert>
          <TextLink href="/ai/login" standalone>
            Sign in
          </TextLink>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-5">
          {errors.alert && (
            <InlineAlert
              tone="danger"
              title={errors.alert}
              action={<TextLink href="/ai/forgot-password">Ask for a new link</TextLink>}
            />
          )}
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            helper="At least 10 characters. Not a common password."
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
          />
          <TextField
            label="Type it again"
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(event) => setAgain(event.target.value)}
            error={errors.again}
          />
          <Button type="submit" className="w-full" loading={busy}>
            Save password
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
