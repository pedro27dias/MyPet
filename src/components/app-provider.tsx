"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { pickRepo, type Repo } from "@/lib/repo";
import { registerServiceWorker } from "@/lib/push";
import type { AppUser, Care, CareRecord, Pet, Tutor } from "@/lib/types";
import { addDays, startOfWeek } from "@/lib/dates";
import { ToastProvider } from "./ui/toast";
import { LoginScreen } from "./auth/login-screen";
import { Splash } from "./shell/splash";
import { Welcome } from "./shell/welcome";

/*
 * Estado do app inteiro: quem entrou, os cachorros, o cachorro escolhido e os cuidados dele.
 * As telas pegam tudo com useApp(). Quando outro tutor muda algo, recarrega sozinho.
 */

interface AppCtx {
  repo: Repo;
  user: AppUser;
  pets: Pet[];
  pet: Pet | null;
  selectPet: (id: string) => void;
  cares: Care[];
  records: CareRecord[];
  tutors: Tutor[];
  dataReady: boolean;
  reloadPets: (selectId?: string) => Promise<void>;
  reloadData: () => Promise<void>;
  /** Nome de quem fez ("Você" para a própria pessoa). */
  nameOf: (userId: string | null) => string;
  /** Muda toda vez que os dados do pet são recarregados (para telas que buscam outras coisas, como os gastos). */
  tick: number;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp fora do AppProvider");
  return c;
}

const PET_KEY = "mypet-pet";

/** Registros que a tela Início precisa: da semana passada para cá. */
function recordsSince() {
  return addDays(startOfWeek(new Date()), -7).toISOString();
}

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <Gate>{children}</Gate>
    </ToastProvider>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const [repo, setRepo] = useState<Repo | null>(null);
  const [user, setUser] = useState<AppUser | null | undefined>(undefined);

  // Escolhe nuvem ou demonstração (só existe no navegador).
  useEffect(() => {
    const r = pickRepo();
    registerServiceWorker(); // deixa o app pronto para notificações e instalação
    let alive = true;
    r.currentUser().then((u) => {
      if (!alive) return;
      setRepo(r);
      setUser(u);
    });
    const off = r.onAuthChange((u) => setUser((prev) => (prev?.id === u?.id ? prev : u)));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const switchRepo = useCallback(() => {
    const r = pickRepo();
    r.currentUser().then((u) => {
      setRepo(r);
      setUser(u);
    });
  }, []);

  if (!repo || user === undefined) return <Splash />;
  if (!user) return <LoginScreen repo={repo} onModeChange={switchRepo} />;
  return (
    <Session key={`${repo.mode}-${user.id}`} repo={repo} user={user}>
      {children}
    </Session>
  );
}

function Session({ repo, user, children }: { repo: Repo; user: AppUser; children: ReactNode }) {
  const pathname = usePathname();
  const [pets, setPets] = useState<Pet[] | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [cares, setCares] = useState<Care[]>([]);
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const reloadPets = useCallback(
    async (selectId?: string) => {
      const list = await repo.listPets();
      setPets(list);
      let saved: string | null = null;
      try {
        saved = selectId ?? localStorage.getItem(PET_KEY);
      } catch {
        /* ignora */
      }
      const chosen = list.find((p) => p.id === saved)?.id ?? list[0]?.id ?? null;
      setPetId(chosen);
      if (selectId) {
        try {
          localStorage.setItem(PET_KEY, selectId);
        } catch {
          /* ignora */
        }
      }
    },
    [repo],
  );

  useEffect(() => {
    repo.listPets().then(
      (list) => {
        setPets(list);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(PET_KEY);
        } catch {
          /* ignora */
        }
        setPetId(list.find((p) => p.id === saved)?.id ?? list[0]?.id ?? null);
      },
      (e: Error) => setError(e.message),
    );
  }, [repo]);

  const loadData = useCallback(
    async (id: string) => {
      const [c, r, t] = await Promise.all([repo.listCares(id), repo.listRecords(id, recordsSince()), repo.listTutors(id)]);
      setCares(c);
      setRecords(r);
      setTutors(t);
      setLoadedFor(id);
      setTick((t) => t + 1);
    },
    [repo],
  );

  const reloadData = useCallback(async () => {
    if (petId) await loadData(petId);
  }, [petId, loadData]);

  // Carrega o cachorro escolhido, escuta mudanças de outros tutores e recarrega ao voltar ao app.
  useEffect(() => {
    if (!petId) return;
    let alive = true;
    const load = () =>
      loadData(petId).catch((e: Error) => {
        if (alive) setError(e.message);
      });
    load();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = repo.subscribe(petId, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(load, 300);
    });
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      off();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [petId, repo, loadData]);

  const selectPet = useCallback((id: string) => {
    setPetId(id);
    try {
      localStorage.setItem(PET_KEY, id);
    } catch {
      /* ignora */
    }
  }, []);

  const nameOf = useCallback(
    (id: string | null) => {
      if (!id) return "alguém";
      if (id === user.id) return "Você";
      return tutors.find((t) => t.userId === id)?.name ?? "outro tutor";
    },
    [tutors, user.id],
  );

  const pet = pets?.find((p) => p.id === petId) ?? null;

  const value = useMemo<AppCtx>(
    () => ({
      repo,
      user,
      pets: pets ?? [],
      pet,
      selectPet,
      cares: loadedFor === petId ? cares : [],
      records: loadedFor === petId ? records : [],
      tutors: loadedFor === petId ? tutors : [],
      dataReady: loadedFor === petId && petId !== null,
      reloadPets,
      reloadData,
      nameOf,
      tick,
    }),
    [repo, user, pets, pet, selectPet, cares, records, tutors, loadedFor, petId, reloadPets, reloadData, nameOf, tick],
  );

  if (error && !pets) {
    return (
      <div className="grid min-h-dvh place-items-center p-8 text-center">
        <div>
          <p className="text-lg font-bold">Não foi possível carregar</p>
          <p className="mt-1 text-muted">{error}</p>
          <button type="button" className="mt-4 font-bold text-primary" onClick={() => window.location.reload()}>
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }
  if (!pets) return <Splash />;

  const free = pathname.startsWith("/novo-pet") || pathname.startsWith("/convite");
  return <Ctx.Provider value={value}>{pets.length === 0 && !free ? <Welcome /> : children}</Ctx.Provider>;
}
