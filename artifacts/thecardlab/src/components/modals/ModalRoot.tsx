import { useEffect, useState } from "react";
import { PricingModal } from "./PricingModal";
import { InstallModal } from "./InstallModal";
import { onOpenModal } from "@/lib/modal-bus";

export function ModalRoot() {
  const [pricingOpen, setPricingOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  useEffect(() => {
    const offPricing = onOpenModal("pricing", () => setPricingOpen(true));
    const offInstall = onOpenModal("install", () => setInstallOpen(true));
    return () => {
      offPricing();
      offInstall();
    };
  }, []);

  return (
    <>
      <PricingModal open={pricingOpen} onOpenChange={setPricingOpen} />
      <InstallModal open={installOpen} onOpenChange={setInstallOpen} />
    </>
  );
}
