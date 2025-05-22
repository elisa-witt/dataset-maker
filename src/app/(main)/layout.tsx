import { UserRegistrationModal } from "@/components/functional/user-registration-modal";
import React from "react";

export default function MainLayout({ children }: React.PropsWithChildren) {
  return (
    <>
      {children}
      <UserRegistrationModal />
    </>
  );
}
