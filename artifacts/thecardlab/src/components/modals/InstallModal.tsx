import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Apple, Smartphone, Monitor, Download, Share, Plus, Check } from "lucide-react";
import { usePwaInstall, type Platform } from "@/hooks/use-pwa-install";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const PLATFORM_META: Record<Platform, { label: string; icon: typeof Monitor }> = {
  ios: { label: "iPhone or iPad", icon: Apple },
  android: { label: "Android", icon: Smartphone },
  "desktop-chrome": { label: "Desktop", icon: Monitor },
  "desktop-safari": { label: "Mac (Safari)", icon: Monitor },
  "desktop-firefox": { label: "Desktop (Firefox)", icon: Monitor },
  other: { label: "This Device", icon: Monitor },
};

export function InstallModal({ open, onOpenChange }: Props) {
  const { canPromptInstall, installed, platform, promptInstall } = usePwaInstall();
  const meta = PLATFORM_META[platform];

  const onPrompt = async () => {
    const result = await promptInstall();
    if (result.ok) {
      toast.success("TheCardLab installed", { description: "Launch from your home screen anytime." });
      onOpenChange(false);
    } else if (result.reason === "no-prompt") {
      toast.info("Use the manual instructions below for your device.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg p-0 border-border bg-gradient-to-br from-[#101f3add] to-[#071225] overflow-hidden"
        data-testid="modal-install"
      >
        <div className="p-6 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary">
              <Download size={22} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">Install TheCardLab</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                Native-feel experience on {meta.label}
              </DialogDescription>
            </div>
          </div>
        </div>

        {installed ? (
          <div className="px-6 pb-6 pt-2">
            <div className="rounded-2xl border border-secondary/40 bg-secondary/10 p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center text-secondary">
                <Check size={18} />
              </div>
              <div>
                <div className="font-bold text-sm">You're already installed</div>
                <div className="text-xs text-muted-foreground">Launch TheCardLab from your home screen or app launcher.</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {(platform === "android" || platform === "desktop-chrome") && canPromptInstall && (
              <div className="px-6 pb-3">
                <button
                  onClick={onPrompt}
                  data-testid="button-prompt-install"
                  className="w-full py-3.5 rounded-2xl font-black text-sm bg-gradient-to-br from-primary to-secondary text-[#03111c] shadow-[0_14px_36px_rgba(0,229,255,0.3)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Install Now
                </button>
              </div>
            )}

            <div className="px-6 pb-6 pt-3">
              <div className="text-[10px] font-black text-muted-foreground tracking-widest mb-2">
                {canPromptInstall ? "OR INSTALL MANUALLY" : "INSTALL ON " + meta.label.toUpperCase()}
              </div>

              {platform === "ios" && (
                <ol className="space-y-2.5 text-sm">
                  <Step num={1} icon={<Share size={15} className="text-primary" />} text="Tap the Share button in Safari" />
                  <Step num={2} icon={<Plus size={15} className="text-primary" />} text="Choose Add to Home Screen" />
                  <Step num={3} icon={<Check size={15} className="text-secondary" />} text="Tap Add — TheCardLab launches like a real app" />
                </ol>
              )}

              {platform === "android" && !canPromptInstall && (
                <ol className="space-y-2.5 text-sm">
                  <Step num={1} text="Tap the three-dot menu in Chrome" />
                  <Step num={2} text="Choose Install app or Add to Home screen" />
                  <Step num={3} text="Confirm — opens fullscreen with no browser bar" />
                </ol>
              )}

              {(platform === "desktop-chrome" || platform === "desktop-safari" || platform === "desktop-firefox") && !canPromptInstall && (
                <ol className="space-y-2.5 text-sm">
                  {platform === "desktop-chrome" && (
                    <>
                      <Step num={1} text="Click the install icon in the address bar (right side)" />
                      <Step num={2} text="Or open the menu → Cast, save, and share → Install TheCardLab" />
                      <Step num={3} text="Launches in its own window with native feel" />
                    </>
                  )}
                  {platform === "desktop-safari" && (
                    <>
                      <Step num={1} text="Open the File menu in Safari" />
                      <Step num={2} text="Choose Add to Dock" />
                      <Step num={3} text="Pin to your dock for one-click access" />
                    </>
                  )}
                  {platform === "desktop-firefox" && (
                    <>
                      <Step num={1} text="Firefox does not support PWA install on desktop" />
                      <Step num={2} text="Bookmark the page, or open in Chrome / Edge / Safari to install" />
                    </>
                  )}
                </ol>
              )}

              {platform === "other" && (
                <p className="text-sm text-muted-foreground">
                  Add TheCardLab to your home screen or dock from your browser's menu for the best experience.
                </p>
              )}
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-2xl border border-border bg-white/[0.02] p-4 grid grid-cols-3 gap-3 text-center">
                <Capability icon={Monitor} label="Desktop" />
                <Capability icon={Apple} label="iOS" />
                <Capability icon={Smartphone} label="Android" />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Step({ num, icon, text }: { num: number; icon?: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center text-[11px] font-black text-primary flex-shrink-0">
        {num}
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        {icon}
        <span>{text}</span>
      </div>
    </li>
  );
}

function Capability({ icon: Icon, label }: { icon: typeof Monitor; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-border flex items-center justify-center text-primary">
        <Icon size={16} />
      </div>
      <div className="text-[10px] font-bold text-muted-foreground">{label}</div>
    </div>
  );
}
