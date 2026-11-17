"use client";

import { motion } from "motion/react";
import { ChevronRight, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fmtDate, fmtRelativeDay, fmtTimeShort } from "@/lib/dates";
import { freqText, isAnchored, nextDue } from "@/lib/schedule";
import type { Care, CareRecord, CareType } from "@/lib/types";
import { useApp } from "../app-provider";
import { CARE_META, CareIcon } from "../care/care-meta";
import { CareFormSheet } from "../care/care-form";
import { History } from "../home/task-sheets";
import { TabShell } from "../shell/tab-shell";
import { Button } from "../ui/button";
import { Sheet } from "../ui/sheet";
import { VaccineCard } from "./vaccine-card";

const ORDER: CareType[] = ["remedio", "vacina", "vermifugo", "antipulgas", "consulta", "exame", "outro"];

/** Aba Cuidados: Cartão de Vacina no topo + todos os lembretes agrupados por tipo. */
export function CuidadosScreen() {
  const { pet, cares, records, repo, dataReady } = useApp();
  const [all, setAll] = useState<CareRecord[] | null>(null);
  const [detail, setDetail] = useState<Care | null>(null);
  const [editing, setEditing] = useState<Care | null>(null);
  const [now] = useState(() => Date.now());

  // Histórico completo (o Início só carrega as últimas semanas). Recarrega quando algo muda.
  useEffect(() => {
    if (!pet) return;
    let alive = true;
    repo.listRecords(pet.id, "1990-01-01T00:00:00Z").then(
      (r) => alive && setAll(r),
      () => alive && setAll([]),
    );
    return () => {
      alive = false;
    };
  }, [repo, pet, records]);

  const groups = useMemo(
    () =>
      ORDER.map((type) => ({
        type,
        list: cares
          .filter((c) => c.type === type)
          .sort((a, b) => Number(b.active) - Number(a.active) || a.title.localeCompare(b.title)),
      })).filter((g) => g.list.length),
    [cares],
  );

  if (!pet) return null;
  const history = all ?? records;

  return (
    <TabShell title={<h1 className="titulo pb-5 pt-6 text-4xl">Cuidados</h1>}>
      <VaccineCard pet={pet} cares={cares} records={history} />

      {!dataReady ? (
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-3xl bg-card" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="mt-8 rounded-3xl bg-card p-5 text-center text-muted shadow-card">
          Nenhum lembrete ainda. Toque no <b className="text-forest">+</b> para adicionar.
        </p>
      ) : (
        <div className="mt-8 space-y-7">
          {groups.map((g, gi) => (
            <section key={g.type}>
              <h2 className="titulo mb-3 px-1 text-2xl">{CARE_META[g.type].plural}</h2>
              <ul className="space-y-2">
                {g.list.map((c, i) => (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * (gi * 2 + i) }}
                  >
                    <CareRow care={c} records={history} now={now} onOpen={() => setDetail(c)} />
                  </motion.li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={
          detail && (
            <span className="flex items-center gap-3">
              <CareIcon type={detail.type} size={36} />
              <span className="truncate">{detail.title}</span>
            </span>
          )
        }
      >
        {detail && (
          <div className="pb-2">
            <dl className="mb-4 space-y-1 rounded-2xl bg-bg p-4 text-sm">
              <Line k="Frequência" v={freqText(detail)} />
              {detail.detail && <Line k={detail.type === "consulta" ? "Local" : detail.type === "remedio" ? "Dose" : "Produto"} v={detail.detail} />}
              <Line k="Próxima" v={nextText(detail, history)} />
              {detail.end && <Line k="Termina" v={fmtDate(detail.end)} />}
              {detail.note && <Line k="Observação" v={detail.note} />}
              {!detail.active && <Line k="Situação" v="Parado" />}
            </dl>
            <Button variant="soft" className="mb-5 w-full" onClick={() => (setEditing(detail), setDetail(null))}>
              <Pencil size={16} /> Editar lembrete
            </Button>
            <h3 className="titulo mb-2 text-xl">Histórico</h3>
            <History careId={detail.id} />
          </div>
        )}
      </Sheet>
      <CareFormSheet care={editing} open={!!editing} onClose={() => setEditing(null)} />
    </TabShell>
  );
}

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-semibold text-ink">{v}</dd>
    </div>
  );
}

function nextText(care: Care, records: CareRecord[]) {
  const d = nextDue(care, records);
  if (!care.active) return "Parado";
  if (!d) return "Concluído";
  const rel = fmtRelativeDay(d);
  return `${rel === fmtDate(d) ? rel : `${rel} (${fmtDate(d)})`}${isAnchored(care) || care.type === "consulta" ? ` às ${fmtTimeShort(d)}` : ""}`;
}

function CareRow({ care, records, now, onOpen }: { care: Care; records: CareRecord[]; now: number; onOpen: () => void }) {
  const d = nextDue(care, records);
  const late = d && d.getTime() < now - 30 * 60_000;
  const last = records
    .filter((r) => r.careId === care.id && r.status === "feito")
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""))[0];
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-3 rounded-3xl bg-card p-3 text-left shadow-card transition active:scale-[0.98] ${care.active ? "" : "opacity-50"}`}
    >
      <CareIcon type={care.type} size={48} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-forest">{care.title}</span>
        <span className="block truncate text-sm text-muted">{freqText(care)}</span>
        <span className={`block truncate text-sm font-semibold ${late ? "text-danger" : "text-olive"}`}>
          {!care.active ? "Parado" : d ? `${late ? "Atrasado · " : "Próxima: "}${fmtRelativeDay(d)}` : "Concluído"}
          {last?.doneAt ? <span className="font-normal text-muted"> · última {fmtDate(last.doneAt)}</span> : null}
        </span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-faint" />
    </button>
  );
}
