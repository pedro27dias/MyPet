"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarClock, PartyPopper } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { daysBetween, fmtDate, fmtRelativeDay, fmtTimeShort, greeting, sameDay, weekdayLong } from "@/lib/dates";
import { dayOccurrences, nextAppointment, overdueOccurrences, type Occurrence } from "@/lib/schedule";
import type { Care } from "@/lib/types";
import { useApp } from "../app-provider";
import { CareIcon } from "../care/care-meta";
import { CareFormSheet } from "../care/care-form";
import { PetAvatar } from "../shared/pet-avatar";
import { TabShell } from "../shell/tab-shell";
import { PetMark } from "../shared/species";
import { TaskRow } from "./task-row";
import { AlreadyDoneSheet, EditTimeSheet, TaskMenuSheet } from "./task-sheets";
import { useTaskActions } from "./use-task-actions";
import { WeekStrip } from "./week-strip";
import { NotificationsCard } from "../shared/notifications";

/** Aba Início: saudação, atrasados, semana, tarefas do dia e próximo compromisso. */
export function HomeScreen() {
  const { pet, user, cares, records, dataReady } = useApp();
  const actions = useTaskActions();
  const [selected, setSelected] = useState(() => new Date());
  const [menu, setMenu] = useState<Occurrence | null>(null);
  const [editing, setEditing] = useState<Care | null>(null);
  const now = useNow();

  const isToday = sameDay(selected, now);
  const overdue = useMemo(() => overdueOccurrences(cares, records, now), [cares, records, now]);
  const overdueIds = useMemo(() => new Set(overdue.map((o) => o.id)), [overdue]);
  const day = useMemo(
    () => dayOccurrences(cares, records, selected, now).filter((o) => !isToday || !overdueIds.has(o.id)),
    [cares, records, selected, now, isToday, overdueIds],
  );
  const next = useMemo(() => nextAppointment(cares, records, now), [cares, records, now]);
  const pending = day.filter((o) => o.state === "pendente").length;

  if (!pet) return null;
  const first = user.name.split(" ")[0];

  const row = (o: Occurrence, showDate = false) => (
    <TaskRow
      key={o.id}
      occ={o}
      busy={actions.busyId === o.id}
      onDone={() => actions.complete(o)}
      onMenu={() => setMenu(o)}
      showDate={showDate}
    />
  );

  return (
    <TabShell
      title={
        <header className="pb-6 pt-4">
          <div className="flex items-center gap-2 text-forest">
            <PetMark species={pet.species} size={40} />
            <span className="titulo text-xl">MyPet</span>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-muted">
                {greeting(now)}
                {first && first !== "Você" ? `, ${first}` : ""}
              </p>
              <h1 className="truncate text-[2rem] font-bold leading-tight text-forest">
                Olá, <span className="titulo">{pet.name}</span>
              </h1>
              <p className={`mt-0.5 font-semibold ${overdue.length ? "text-danger" : "text-olive"}`}>
                {!dataReady
                  ? " "
                  : overdue.length
                    ? `${overdue.length} ${overdue.length === 1 ? "coisa atrasada" : "coisas atrasadas"}`
                    : pending
                      ? `${pending} ${pending === 1 ? "cuidado" : "cuidados"} ${isToday ? "para hoje" : "neste dia"}`
                      : "Tudo em dia por aqui"}
              </p>
            </div>
            <PetAvatar url={pet.photoUrl} species={pet.species} size={72} ring />
          </div>
        </header>
      }
    >
      {!dataReady ? (
        <Skeleton />
      ) : (
        <div className="space-y-6">
          <NotificationsCard />
          {overdue.length > 0 && (
            <section>
              <h2 className="mb-2 px-1 titulo text-xl !text-danger">Atrasados</h2>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>{overdue.map((o) => row(o, true))}</AnimatePresence>
              </ul>
            </section>
          )}

          <WeekStrip cares={cares} records={records} selected={selected} onSelect={setSelected} />

          <section>
            <h2 className="mb-2 px-1 titulo text-xl">
              {isToday ? "Hoje" : `${weekdayLong(selected)}, ${fmtDate(selected)}`}
            </h2>
            {day.length ? (
              <ul className="space-y-2">
                <AnimatePresence initial={false}>{day.map((o) => row(o))}</AnimatePresence>
              </ul>
            ) : (
              <EmptyDay today={isToday} petName={pet.name} hadOverdue={overdue.length > 0} />
            )}
          </section>

          {next && <NextAppointment occ={next} onOpen={() => setMenu(next)} />}
        </div>
      )}

      <TaskMenuSheet
        occ={menu}
        onClose={() => setMenu(null)}
        onSnooze={actions.snooze}
        onSkip={actions.skip}
        onEdit={(o) => setEditing(o.care)}
        onEditTime={actions.setEditTime}
        onUndo={actions.undo}
      />
      <AlreadyDoneSheet
        info={actions.already}
        onClose={() => actions.setAlready(null)}
        onForce={() => {
          const info = actions.already;
          actions.setAlready(null);
          if (info) actions.complete(info.occ, true);
        }}
      />
      <EditTimeSheet record={actions.editTime} onClose={() => actions.setEditTime(null)} onSave={actions.saveTime} />
      <CareFormSheet care={editing} open={!!editing} onClose={() => setEditing(null)} />
    </TabShell>
  );
}

/** Hora atual, atualizada a cada minuto (para "atrasado" aparecer sozinho). */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function NextAppointment({ occ, onOpen }: { occ: Occurrence; onOpen: () => void }) {
  const d = daysBetween(new Date(), occ.due);
  return (
    <section>
      <h2 className="mb-2 px-1 titulo text-xl">Próximo compromisso</h2>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 rounded-3xl bg-forest p-4 text-left text-pink-soft shadow-float active:scale-[0.98]">
        <CareIcon type={occ.care.type} size={52} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-extrabold">{occ.care.title}</span>
          <span className="block truncate text-sm text-pink-soft/70">
            {fmtDate(occ.due)} às {fmtTimeShort(occ.due)}
            {occ.care.detail ? ` · ${occ.care.detail}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <CalendarClock size={18} className="ml-auto text-peach" />
          <span className="block text-sm font-extrabold">{d <= 1 ? fmtRelativeDay(occ.due) : `em ${d} dias`}</span>
        </span>
      </button>
    </section>
  );
}

function EmptyDay({ today, petName, hadOverdue }: { today: boolean; petName: string; hadOverdue: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-4 rounded-3xl bg-success-soft p-5"
    >
      <PartyPopper size={32} className="shrink-0 text-success" />
      <p className="font-bold">
        {today
          ? hadOverdue
            ? "Nada mais marcado para hoje."
            : `Nada para hoje. ${petName} agradece o descanso!`
          : "Nada marcado neste dia."}
      </p>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      <div className="h-24 animate-pulse rounded-3xl bg-card" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[74px] animate-pulse rounded-3xl bg-card" />
      ))}
    </div>
  );
}
