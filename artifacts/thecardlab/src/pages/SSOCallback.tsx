import { AuthenticateWithRedirectCallback } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SSOCallback() {
  return (
    <AuthenticateWithRedirectCallback
      continueSignUpUrl={`${basePath}/sso-continue`}
    />
  );
}
