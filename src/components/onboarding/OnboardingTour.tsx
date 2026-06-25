import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Compass, LayoutDashboard, BarChart3, Languages, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "revivamoz.onboarding.v1";

type Ctx = { open: () => void };
const OnboardingCtx = createContext<Ctx | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingCtx);
  if (!ctx) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return ctx;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Slight delay so the dashboard renders first
        const id = setTimeout(() => setOpen(true), 400);
        return () => clearTimeout(id);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    setStep(0);
  }, []);

  const openTour = useCallback(() => {
    setStep(0);
    setOpen(true);
  }, []);

  const steps = [
    {
      icon: Compass,
      title: t("onb.s1.title"),
      desc: t("onb.s1.desc"),
    },
    {
      icon: LayoutDashboard,
      title: t("onb.s2.title"),
      desc: t("onb.s2.desc"),
    },
    {
      icon: BarChart3,
      title: t("onb.s3.title"),
      desc: t("onb.s3.desc"),
    },
    {
      icon: Languages,
      title: t("onb.s4.title"),
      desc: t("onb.s4.desc"),
    },
    {
      icon: CheckCircle2,
      title: t("onb.s5.title"),
      desc: t("onb.s5.desc"),
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <OnboardingCtx.Provider value={{ open: openTour }}>
      {children}
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : finish())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">{current.title}</DialogTitle>
            <DialogDescription className="text-center leading-relaxed">
              {current.desc}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          <DialogFooter className="mt-4 flex-row justify-between gap-2 sm:justify-between">
            <button
              type="button"
              onClick={finish}
              className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {t("onb.skip")}
            </button>
            <div className="flex gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
                >
                  {t("onb.back")}
                </button>
              )}
              <button
                type="button"
                onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {isLast ? t("onb.finish") : t("onb.next")}
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OnboardingCtx.Provider>
  );
}
