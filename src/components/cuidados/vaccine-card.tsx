"use client";

/* eslint-disable @next/next/no-img-element -- fotos vêm de links temporários do Storage */
import { AnimatePresence, motion } from "motion/react";
import { Camera, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Plus, Share2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ageText, fmtDate } from "@/lib/dates";
import { cardImage, cardPages, cardRows, CARD_SECTIONS, type CardPage, type CardRow } from "@/lib/vaccine-card";
import type { Care, CareRecord, Pet } from "@/lib/types";
import { useApp } from "../app-provider";
import { LogoMark } from "../shell/logo-mark";
import { PetAvatar } from "../shared/pet-avatar";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";
import { AddRecordSheet } from "./add-record-sheet";

/*
 * Cartão de Vacina: card fechado (capa verde) → amplia até ocupar a tela → a capa abre como um
 * livreto (vira em 3D) e mostra as páginas de papel. Fechar faz o caminho de volta.
 */

type Phase = "fechado" | "abrindo" | "aberto" | "fechando";

export function VaccineCard({ pet, cares, records }: { pet: Pet; cares: Care[]; records: CareRecord[] }) {
  const [phase, setPhase] = useState<Phase>("fechado");
  const count = useMemo(() => CARD_SECTIONS.reduce((t, s) => t + cardRows(cares, records, s.key).filter((r) => r.appliedAt).length, 0), [cares, records]);

  return (
    <>
      {phase === "fechado" ? (
        <motion.button
          type="button"
          layoutId="cartao-vacina"
          onClick={() => setPhase("abrindo")}
          className="relative block aspect-[1.6] w-full overflow-hidden rounded-[24px] bg-forest text-left shadow-float"
          whileTap={{ scale: 0.98 }}
          aria-label="Abrir Cartão de Vacina"
        >
          <Cover pet={pet} count={count} />
        </motion.button>
      ) : (
        // guarda o espaço do card enquanto ele está aberto
        <div className="aspect-[1.6] w-full rounded-[24px] bg-line/50" />
      )}
      <AnimatePresence>
        {phase !== "fechado" && <Booklet pet={pet} cares={cares} records={records} phase={phase} setPhase={setPhase} />}
      </AnimatePresence>
    </>
  );
}

/** Capa: verde, logo e "Cartão de Vacina" em rosa, foto e nome do pet. */
function Cover({ pet, count, big = false }: { pet: Pet; count?: number; big?: boolean }) {
  return (
    <div className={`flex h-full flex-col justify-between text-pink ${big ? "p-7" : "p-5"}`}>
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-2">
          <LogoMark plain size={big ? 64 : 48} className="text-pink" />
        </span>
        <span className="rounded-full border border-pink/40 px-3 py-1 text-xs font-bold tracking-wide text-pink/90">MyPet</span>
      </div>
      <div>
        <p className={`titulo !text-pink leading-none ${big ? "text-5xl" : "text-[2.1rem]"}`}>Cartão de Vacina</p>
        <div className="mt-4 flex items-center gap-3">
          <PetAvatar url={pet.photoUrl} size={big ? 56 : 44} />
          <span className="min-w-0">
            <span className="block truncate text-lg font-bold text-pink-soft">{pet.name}</span>
            <span className="block truncate text-sm text-pink/70">
              {[pet.breed, count !== undefined ? `${count} ${count === 1 ? "registro" : "registros"}` : null].filter(Boolean).join(" · ")}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function Booklet({
  pet,
  cares,
  records,
  phase,
  setPhase,
}: {
  pet: Pet;
  cares: Care[];
  records: CareRecord[];
  phase: Phase;
  setPhase: (p: Phase) => void;
}) {
  const { repo } = useApp();
  const toast = useToast();
  const pages = useMemo(() => cardPages(cares, records), [cares, records]);
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const [adding, setAdding] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<string | null>(null);
  const coverOpen = phase === "aberto";
  const current = Math.min(page, pages.length - 1);

  // Links das fotos das etiquetas
  useEffect(() => {
    const paths = records.map((r) => r.labelPhoto).filter((p): p is string => !!p);
    if (!paths.length) return;
    repo.photoUrls(paths).then(setPhotos, () => {});
  }, [repo, records]);

  // Abre a capa depois que o card terminou de ampliar; fecha o livreto depois que a capa voltou.
  // (tempo fixo: funciona mesmo com "Reduzir movimento" ligado)
  useEffect(() => {
    if (phase === "abrindo") {
      const t = setTimeout(() => setPhase("aberto"), 550);
      return () => clearTimeout(t);
    }
    if (phase === "fechando") {
      const t = setTimeout(() => setPhase("fechado"), 800);
      return () => clearTimeout(t);
    }
  }, [phase, setPhase]);

  // Esc fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPhase("fechando");
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPhase]);

  const go = (to: number) => {
    if (to < 0 || to >= pages.length) return;
    setDir(to > current ? 1 : -1);
    setPage(to);
  };

  async function shareImage() {
    setShareOpen(false);
    try {
      const blob = await cardImage(pet, cares, records);
      const file = new File([blob], `cartao-vacina-${pet.name.toLowerCase().replace(/\s+/g, "-")}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Cartão de Vacina · ${pet.name}` });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        toast("Imagem do cartão salva.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast((e as Error).message, { tone: "erro" });
    }
  }

  function sharePdf() {
    setShareOpen(false);
    // Abre a impressão do navegador: escolha "Salvar como PDF".
    setTimeout(() => window.print(), 200);
  }

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        className="absolute inset-0 bg-forest/40 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "fechando" ? 0 : 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setPhase("fechando")}
      />
      <motion.div
        layoutId="cartao-vacina"
        className="pt-safe absolute inset-x-3 bottom-3 top-3 mx-auto flex max-w-md flex-col overflow-hidden rounded-[28px] bg-forest shadow-float"
        style={{ perspective: 1800 }}
        transition={{ type: "spring", damping: 30, stiffness: 260 }}
      >
        {/* Barra de cima */}
        <div className="flex items-center gap-2 px-4 pb-2 pt-3 text-pink">
          <LogoMark plain size={34} className="text-pink" />
          <span className="titulo !text-pink flex-1 truncate text-xl">{pet.name}</span>
          <button type="button" aria-label="Compartilhar" onClick={() => setShareOpen(true)} className="grid size-10 place-items-center rounded-full bg-pink/15">
            <Share2 size={18} />
          </button>
          <button type="button" aria-label="Fechar" onClick={() => setPhase("fechando")} className="grid size-10 place-items-center rounded-full bg-pink text-forest">
            <X size={20} />
          </button>
        </div>

        {/* Páginas */}
        <div className="relative mx-3 mb-3 flex-1 overflow-hidden rounded-[20px]">
          <AnimatePresence custom={dir} initial={false} mode="popLayout">
            <motion.div
              key={current}
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d * 80, opacity: 0, rotateY: d * -8 }),
                center: { x: 0, opacity: 1, rotateY: 0 },
                exit: (d: number) => ({ x: d * -80, opacity: 0, rotateY: d * 8 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(current + 1);
                else if (info.offset.x > 60) go(current - 1);
              }}
              className="papel absolute inset-0 overflow-y-auto px-5 pb-6 pt-5"
            >
              <PageContent page={pages[current]} pet={pet} photos={photos} onZoom={setZoom} />
              <p className="absolute bottom-2 right-4 text-xs font-semibold text-paper-ink/50">
                {current + 1} / {pages.length}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Capa que abre como livreto */}
          <motion.div
            className="absolute inset-0 z-10 rounded-[20px] bg-forest"
            style={{ transformOrigin: "left center", backfaceVisibility: "hidden" }}
            initial={{ rotateY: 0 }}
            animate={{ rotateY: coverOpen ? -178 : 0 }}
            transition={{ duration: 0.75, ease: [0.45, 0.05, 0.25, 1] }}
          >
            <div className="h-full rounded-[20px] border border-pink/20">
              <Cover pet={pet} big />
            </div>
          </motion.div>
        </div>

        {/* Navegação e adicionar */}
        <div className="pb-safe flex items-center gap-2 px-4 pt-1">
          <button type="button" aria-label="Página anterior" onClick={() => go(current - 1)} disabled={current === 0} className="grid size-11 place-items-center rounded-full bg-pink/15 text-pink disabled:opacity-30">
            <ChevronLeft size={22} />
          </button>
          <div className="flex flex-1 justify-center gap-1.5">
            {pages.map((p, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Página ${i + 1}`}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-pink" : "w-2 bg-pink/35"}`}
              />
            ))}
          </div>
          <button type="button" aria-label="Próxima página" onClick={() => go(current + 1)} disabled={current === pages.length - 1} className="grid size-11 place-items-center rounded-full bg-pink/15 text-pink disabled:opacity-30">
            <ChevronRight size={22} />
          </button>
        </div>
        <div className="px-4 pb-4 pt-3">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-pink font-bold text-forest transition active:scale-[0.97]"
          >
            <Plus size={20} strokeWidth={2.75} /> Adicionar registro
          </button>
        </div>
      </motion.div>

      <AddRecordSheet open={adding} onClose={() => setAdding(false)} pet={pet} section={pages[current]?.section?.key ?? "vacina"} />

      <Sheet open={shareOpen} onClose={() => setShareOpen(false)} title="Compartilhar cartão">
        <p className="mb-4 text-muted">Para mostrar ao veterinário ou guardar.</p>
        <div className="grid grid-cols-2 gap-3 pb-2">
          <button type="button" onClick={shareImage} className="flex flex-col items-start gap-3 rounded-3xl bg-pink-soft p-4 text-left font-bold text-forest active:scale-[0.97]">
            <ImageIcon size={28} /> Imagem
          </button>
          <button type="button" onClick={sharePdf} className="flex flex-col items-start gap-3 rounded-3xl bg-olive-soft p-4 text-left font-bold text-forest active:scale-[0.97]">
            <FileText size={28} /> PDF
          </button>
        </div>
      </Sheet>

      <AnimatePresence>
        {zoom && (
          <motion.button
            type="button"
            className="fixed inset-0 z-[70] grid place-items-center bg-forest/80 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoom(null)}
            aria-label="Fechar foto"
          >
            <img src={zoom} alt="Etiqueta da vacina" className="max-h-full max-w-full rounded-2xl" />
          </motion.button>
        )}
      </AnimatePresence>

      <PrintCard pet={pet} cares={cares} records={records} />
    </div>
  );
}

function PageContent({ page, pet, photos, onZoom }: { page: CardPage; pet: Pet; photos: Record<string, string>; onZoom: (u: string) => void }) {
  if (page.kind === "id") {
    const rows: [string, string | null][] = [
      ["Nome", pet.name],
      ["Raça", pet.breed],
      ["Sexo", pet.sex === "femea" ? "Fêmea" : pet.sex === "macho" ? "Macho" : null],
      ["Nascimento", pet.birth ? `${fmtDate(pet.birth)}${pet.birthApprox ? " (aprox.)" : ""}` : null],
      ["Idade", ageText(pet.birth)],
      ["Castrado(a)", pet.neutered === null ? null : pet.neutered ? "Sim" : "Não"],
      ["Alergias", pet.allergies],
      ["Veterinário", [pet.vetName, pet.vetPhone].filter(Boolean).join(" · ") || null],
    ];
    return (
      <div>
        <p className="titulo text-3xl">Identificação</p>
        <div className="mt-4 flex justify-center">
          <PetAvatar url={pet.photoUrl} size={96} ring />
        </div>
        <dl className="pautado mt-4">
          {rows.map(([k, v]) => (
            <div key={k} className="flex h-8 items-end justify-between gap-3 text-[15px]">
              <dt className="font-semibold">{k}</dt>
              <dd className="truncate text-right">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-center text-xs opacity-60">Deslize para o lado para ver as páginas →</p>
      </div>
    );
  }
  const s = page.section!;
  const rows = page.rows ?? [];
  return (
    <div>
      <p className="titulo text-3xl">
        {s.title}
        {page.part && <span className="ml-2 text-base not-italic opacity-60">{page.part}</span>}
      </p>
      <div className="mt-3 grid grid-cols-[1.3fr_1fr_1fr] gap-x-2 border-b border-paper-ink/25 pb-1 text-[11px] font-bold uppercase tracking-wide opacity-70">
        <span>{s.key === "vacina" ? "Vacina" : "Produto"}</span>
        <span>Aplicação</span>
        <span>Próxima</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-6 text-center text-sm opacity-70">{s.empty}</p>
      ) : (
        <ul>
          {rows.map((r) => (
            <RowLine key={r.id} r={r} photo={r.labelPhoto ? photos[r.labelPhoto] : undefined} onZoom={onZoom} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RowLine({ r, photo, onZoom }: { r: CardRow; photo?: string; onZoom: (u: string) => void }) {
  return (
    <li className="grid grid-cols-[1.3fr_1fr_1fr] items-center gap-x-2 border-b border-paper-line py-2.5 text-[14px]">
      <span className="min-w-0">
        <span className="block truncate font-bold">{r.name}</span>
        <span className="flex items-center gap-1 truncate text-xs opacity-70">
          {r.clinic ?? (r.appliedAt ? "—" : "a aplicar")}
          {photo && (
            <button type="button" onClick={() => onZoom(photo)} aria-label="Ver foto da etiqueta" className="ml-1 inline-grid size-6 place-items-center rounded-full bg-paper-line">
              <Camera size={12} />
            </button>
          )}
        </span>
      </span>
      <span className="font-semibold">{r.appliedAt ? fmtDate(r.appliedAt) : "—"}</span>
      <span className={r.nextAt ? "font-semibold text-forest" : "opacity-50"}>{r.nextAt ? fmtDate(r.nextAt) : "—"}</span>
    </li>
  );
}

/** Versão para imprimir/salvar como PDF (fica escondida na tela). */
function PrintCard({ pet, cares, records }: { pet: Pet; cares: Care[]; records: CareRecord[] }) {
  return (
    <div id="cartao-impressao" className="hidden bg-white p-8 text-black">
      <h1 style={{ fontFamily: "var(--font-titulo)", fontStyle: "italic", fontSize: 32 }}>Cartão de Vacina · {pet.name}</h1>
      <p>{[pet.breed, pet.birth ? `nascimento ${fmtDate(pet.birth)}` : null].filter(Boolean).join(" · ")}</p>
      {CARD_SECTIONS.map((s) => {
        const rows = cardRows(cares, records, s.key);
        return (
          <section key={s.key} style={{ marginTop: 24 }}>
            <h2 style={{ fontFamily: "var(--font-titulo)", fontStyle: "italic", fontSize: 22 }}>{s.title}</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Nome", "Aplicação", "Próxima", "Clínica / veterinário"].map((h) => (
                    <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #999", padding: "6px 4px" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: "6px 4px" }}>
                      {s.empty}
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ borderBottom: "1px solid #ddd", padding: "6px 4px" }}>{r.name}</td>
                    <td style={{ borderBottom: "1px solid #ddd", padding: "6px 4px" }}>{r.appliedAt ? fmtDate(r.appliedAt) : "—"}</td>
                    <td style={{ borderBottom: "1px solid #ddd", padding: "6px 4px" }}>{r.nextAt ? fmtDate(r.nextAt) : "—"}</td>
                    <td style={{ borderBottom: "1px solid #ddd", padding: "6px 4px" }}>{r.clinic ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}
      <p style={{ marginTop: 24, fontSize: 11 }}>Gerado pelo MyPet em {fmtDate(new Date())}. Confira sempre com o veterinário.</p>
    </div>
  );
}
