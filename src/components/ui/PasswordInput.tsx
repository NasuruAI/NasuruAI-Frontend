"use client";

import { forwardRef, useState } from "react";
import { PasswordVisibilityToggle } from "./PasswordVisibilityToggle";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "className" | "type"
> & { className: string };

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          className={`${className} pr-12`}
        />
        <PasswordVisibilityToggle
          visible={visible}
          onToggle={() => setVisible((current) => !current)}
        />
      </div>
    );
  },
);
