import { createFileRoute } from "@tanstack/react-router";
import { Check, Circle, Loader2 } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { roadmap, roadmapProgress, type TaskStatus } from "@/lib/roadmap";

export const Route = createFileRoute("/_authenticated/roadmap")({
  head: () => ({
    meta: [
      { title: "Roadmap · Reviva Moz" },
      {
        name: "description",
        content:
          "Plano de acção e roadmap do sistema de gestão financeira Reviva Moz, com fases, tarefas e progresso.",
      },
      { property: "og:title", content: "Roadmap · Reviva Moz" },
      {
        property: "og:description",
        content: "Acompanhe a evolução do sistema Reviva Moz por fases e tarefas.",
      },
    ],
  }),
  component: RoadmapPage,
});

const statusMeta: Record<TaskStatus, { label: string; className: string }> = {
  done: { label: "Concluído", className: "bg-success/15 text-success border-success/30" },
  "in-progress": {
    label: "Em curso",
    className: "bg-warning/15 text-warning border-warning/30",
  },
  todo: { label: "Pendente", className: "bg-muted text-muted-foreground border-border" },
};

function StatusIcon({ status }: { status: TaskStatus }) {
  if (status === "done")
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success text-success-foreground">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  if (status === "in-progress")
    return (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-warning/20 text-warning">
        <Loader2 className="h-3 w-3 animate-spin" />
      </span>
    );
  return (
    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground">
      <Circle className="h-2 w-2" />
    </span>
  );
}

function RoadmapPage() {
  const overall = roadmapProgress();

  return (
    <DashboardLayout title="Roadmap">
      <div className="space-y-6">
        <header className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Plano de acção Reviva Moz
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Roadmap dividido em fases: visão global, multi-tenant por projeto, IA e operação.
                Vamos marcando como concluído à medida que evoluímos.
              </p>
            </div>
            <div className="min-w-[180px] sm:text-right">
              <div className="text-3xl font-bold text-primary">{overall.pct}%</div>
              <div className="text-xs text-muted-foreground">
                {overall.done} de {overall.total} tarefas concluídas
              </div>
            </div>
          </div>
          <Progress value={overall.pct} className="mt-4 h-2" />
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {roadmap.map((phase) => {
            const p = roadmapProgress([phase]);
            return (
              <section
                key={phase.id}
                className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-card"
              >
                <header className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground">{phase.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{phase.goal}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/10 text-primary">
                    {p.done}/{p.total}
                  </Badge>
                </header>

                <Progress value={p.pct} className="mb-4 h-1.5" />

                <ul className="space-y-2">
                  {phase.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2"
                    >
                      <StatusIcon status={task.status} />
                      <div className="min-w-0 flex-1">
                        <div
                          className={
                            "text-sm leading-snug " +
                            (task.status === "done"
                              ? "text-muted-foreground line-through"
                              : "text-foreground")
                          }
                        >
                          {task.title}
                        </div>
                      </div>
                      <span
                        className={
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium " +
                          statusMeta[task.status].className
                        }
                      >
                        {statusMeta[task.status].label}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
