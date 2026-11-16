"use client";

import { AlarmClock, Clock, Pencil, SkipForward, Undo2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { addDays, atTime, fmtDate, fmtTime, fmtTimeShort, toDateStr } from "@/lib/dates";
import { freqText, type Occurrence } from "@/lib/schedule";
import type { CareRecord } from "@/lib/types";
import { useApp } from "../app-provider";
import { CareIcon } from "../care/care-meta";
import { Button } from "../ui/button";
import { Pills, TextField } from "../ui/fields";
import { Sheet } from "../ui/sheet";
import type { AlreadyDone } from "./use-task-actions";

/** Opções de uma tarefa: adiar, pular (motivo), editar, mudar horário, desfazer e histórico. */
export function TaskMenuSheet({
  occ,
  onClose,
  onSnooze,
  onSkip,
  onEdit,
  onEditTime,
  onUndo,
}: {
  occ: Occurrence | null;
  onClose: () => void;
  onSnooze: (o: Occurrence, until: Date) => void;
  onSkip: (o: Occurrence, reason: string) => void;
  onEdit: (o: Occurrence) => void;
  onEditTime: (r: CareRecord) => void;
  onUndo: (recordId: string) => void;
}) {
  return (
    <Sheet
      open={!!occ}
      onClose={onClose}
      title={
        occ && (
          <span className="flex items-center gap-3">
            <CareIcon type={occ.care.type} size={36} />
            <span className="truncate">{occ.care.title}</span>
          </span>
        )
      }
    >
      {occ && (
        <TaskMenuBody
          key={occ.id}
          o={occ}
          onClose={onClose}
          onSnooze={onSnooze}
          onSkip={onSkip}
          onEdit={onEdit}
          onEditTime={onEditTime}
          onUndo={onUndo}
        />
      )}
    </Sheet>
  );
}

function TaskMenuBody({
  o,
  onClose,
  onSnooze,
  onSkip,
  onEdit,
  onEditTime,
  onUndo,
}: {
  o: Occurrence;
  onClose: () => void;
  onSnooze: (o: Occurrence, until: Date) => void;
  onSkip: (o: Occurrence, reason: string) => void;
  onEdit: (o: Occurrence) => void;
  onEditTime: (r: CareRecord) => void;
  onUndo: (recordId: string) => void;
}) {
  const [view, setView] = useState<"menu" | "adiar" | "pular" | "historico">("menu");
  const [reason, setReason] = useState("");
  const [custom, setCustom] = useState("");
  const [openedAt] = useState(() => Date.now());
  const resolved = o.state === "feito" || o.state === "pulado";
  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <>
      {view === "menu" && (
        <div className="space-y-2 pb-2">
          <p className="mb-3 text-sm text-muted">
            {freqText(o.care)}
            {o.care.detail ? ` · ${o.care.detail}` : ""}
            {o.care.note ? ` · ${o.care.note}` : ""}
          </p>
          {resolved && o.record ? (
            <>
              {o.state === "feito" && (
                <MenuItem icon={<Clock size={20} />} label="Mudar horário" hint={`Agora: ${fmtTimeShort(o.record.doneAt ?? o.key)}`} onClick={() => run(() => onEditTime(o.record!))} />
              )}
              <MenuItem icon={<Undo2 size={20} />} label={o.state === "feito" ? "Desfazer (não foi feito)" : "Desfazer o pulo"} onClick={() => run(() => onUndo(o.record!.id))} />
            </>
          ) : (
            <>
              <MenuItem icon={<AlarmClock size={20} />} label="Adiar" onClick={() => setView("adiar")} />
              <MenuItem icon={<SkipForward size={20} />} label="Pular desta vez" onClick={() => setView("pular")} />
            </>
          )}
          <MenuItem icon={<Pencil size={20} />} label="Editar lembrete" onClick={() => run(() => onEdit(o))} />
          <MenuItem icon={<Users size={20} />} label="Histórico" onClick={() => setView("historico")} />
        </div>
      )}

      {view === "adiar" && (
        <div className="space-y-2 pb-2">
          {[
            { label: "Daqui a 1 hora", until: new Date(openedAt + 3_600_000) },
            { label: "Daqui a 3 horas", until: new Date(openedAt + 3 * 3_600_000) },
            { label: "Amanhã, mesmo horário", until: atTime(toDateStr(addDays(new Date(openedAt), 1)), fmtTime(new Date(o.key))) },
          ].map((x) => (
            <MenuItem key={x.label} icon={<AlarmClock size={20} />} label={x.label} hint={fmtTimeShort(x.until)} onClick={() => run(() => onSnooze(o, x.until))} />
          ))}
          <div className="flex items-end gap-2 pt-2">
            <TextField label="Outro horário" type="datetime-local" value={custom} onChange={setCustom} className="flex-1" />
            <Button disabled={!custom} onClick={() => run(() => onSnooze(o, new Date(custom)))}>
              Adiar
            </Button>
          </div>
        </div>
      )}

      {view === "pular" && (
        <div className="space-y-4 pb-2">
          <Pills
            options={["Veterinário mandou", "Acabou o remédio", "Pet não estava", "Já tinha feito"].map((v) => ({ value: v, label: v }))}
            value={reason}
            onChange={setReason}
          />
          <TextField label="Motivo (opcional)" value={reason} onChange={setReason} />
          <Button size="lg" className="w-full" onClick={() => run(() => onSkip(o, reason))}>
            Pular
          </Button>
        </div>
      )}

      {view === "historico" && <History careId={o.care.id} />}
    </>
  );
}

function MenuItem({ icon, label, hint, onClick }: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl bg-bg p-4 text-left font-bold active:scale-[0.98]">
      <span className="text-muted">{icon}</span>
      <span className="flex-1">{label}</span>
      {hint && <span className="text-sm font-semibold text-muted">{hint}</span>}
    </button>
  );
}

/** Últimos registros deste cuidado (data, hora e quem fez). */
function History({ careId }: { careId: string }) {
  const { repo, pet, nameOf } = useApp();
  const [list, setList] = useState<CareRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pet) return;
    repo
      .listRecords(pet.id, addDays(new Date(), -400).toISOString())
      .then((r) => setList(r.filter((x) => x.careId === careId).sort((a, b) => (b.doneAt ?? b.createdAt).localeCompare(a.doneAt ?? a.createdAt))))
      .catch((e: Error) => setError(e.message));
  }, [repo, pet, careId]);

  if (error) return <p className="pb-4 text-danger">{error}</p>;
  if (!list)
    return (
      <div className="space-y-2 pb-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-bg" />
        ))}
      </div>
    );
  if (!list.length) return <p className="pb-4 text-muted">Ainda não há registros.</p>;
  return (
    <ul className="space-y-2 pb-4">
      {list.slice(0, 30).map((r) => (
        <li key={r.id} className="flex items-center justify-between rounded-2xl bg-bg px-4 py-3">
          <span>
            <span className="block font-bold">
              {r.status === "feito" ? "Feito" : r.status === "pulado" ? "Pulado" : "Adiado"} · {fmtDate(r.doneAt ?? r.snoozedTo ?? r.occurrence)}
            </span>
            <span className="text-sm text-muted">
              {r.status === "adiado" && r.snoozedTo ? `para ${fmtTimeShort(r.snoozedTo)} · ` : ""}
              {r.reason ? `${r.reason} · ` : ""}
              {nameOf(r.by)}
            </span>
          </span>
          <span className="font-extrabold text-muted">{fmtTimeShort(r.doneAt ?? r.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Feito por Ana às 8h05. Registrar de novo?" */
export function AlreadyDoneSheet({ info, onClose, onForce }: { info: AlreadyDone | null; onClose: () => void; onForce: () => void }) {
  return (
    <Sheet open={!!info} onClose={onClose} title="Já foi feito">
      {info && (
        <div className="space-y-4 pb-2">
          <p className="text-lg">
            <b>{info.occ.care.title}</b> já foi {info.status === "pulado" ? "pulado" : "feito"} por <b>{info.byName}</b> às{" "}
            <b>{fmtTimeShort(info.at)}</b>.
          </p>
          <p className="text-muted">Registrar de novo pode significar uma dose a mais. Quer registrar mesmo assim?</p>
          <Button size="lg" className="w-full" onClick={onClose}>
            Ok, não registrar
          </Button>
          <Button variant="danger" className="w-full" onClick={onForce}>
            Registrar de novo
          </Button>
        </div>
      )}
    </Sheet>
  );
}

/** "Dei às 7h40" */
export function EditTimeSheet({ record, onClose, onSave }: { record: CareRecord | null; onClose: () => void; onSave: (r: CareRecord, at: Date) => void }) {
  return (
    <Sheet open={!!record} onClose={onClose} title="Que horas foi feito?">
      {record && <EditTimeForm key={record.id} record={record} onSave={onSave} />}
    </Sheet>
  );
}

function EditTimeForm({ record, onSave }: { record: CareRecord; onSave: (r: CareRecord, at: Date) => void }) {
  const base = new Date(record.doneAt ?? record.createdAt);
  const [time, setTime] = useState(fmtTime(base));
  const [day, setDay] = useState(toDateStr(base));
  return (
    <div className="space-y-4 pb-2">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Dia" type="date" value={day} onChange={(v) => v && setDay(v)} max={toDateStr(new Date())} />
        <TextField label="Hora" type="time" value={time} onChange={(v) => v && setTime(v)} className="[&_input]:text-xl [&_input]:font-extrabold" />
      </div>
      <Button size="lg" className="w-full" onClick={() => onSave(record, atTime(day, time))}>
        Salvar horário
      </Button>
    </div>
  );
}
