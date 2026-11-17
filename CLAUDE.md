@AGENTS.md

# MyPet (nome provisório "PetCare")

App web mobile-first (vai virar PWA instalável) para o dono de cachorro saber **o que fazer e quando**, sem precisar lembrar.
Prioridade: **simplicidade e rapidez. Registrar algo = 1 toque.**
O dono **não programa**: explique em português simples, sem termos técnicos, e diga como ver o resultado no navegador.

## Etapas
| # | Etapa | Situação |
|---|---|---|
| 1 | Banco de dados, login (e-mail/Google), cadastro do cachorro (16 perguntas + agenda sugerida), aba Início com "Feito ✓" | ✅ (Supabase ligado; Google ainda não configurado) |
| 2 | Identidade visual nova (verde floresta + rosa) e aba Cuidados com Cartão de Vacina | ✅ (SQL 002 já rodado) |
| 2b | Editar perfil do pet | ⬜ |
| 3 | Aba Guia (fases: filhote, adulto, idoso) | ✅ |
| 4 | Gastos (aba Pet + botão +) | ⬜ |
| 5 | Notificações push (no horário, para todos os tutores; aviso quando alguém conclui) + PWA instalável completa | ⬜ |
| 6 | Publicar na Vercel | ⬜ |

## Comandos
```bash
npm.cmd run dev     # abre em http://localhost:3002 (3000 = FitFlow, 3001 = MyFinance)
npm.cmd run build   # testa se compila
npm.cmd run lint
```
No PowerShell deste Windows use `npm.cmd`/`npx.cmd`.

## Modo demonstração x nuvem
- Sem `.env.local` (Supabase), o app abre em **modo demonstração**: tudo guardado só no aparelho (`lib/repo/demo.ts`, localStorage), mesmas regras do banco.
- Com Supabase configurado, a tela de login tem "Só quero testar (modo demonstração)".
- Telas usam **só** `useApp()` (`components/app-provider.tsx`) → `repo` (`lib/repo/types.ts`). Duas versões com a mesma interface: `cloud.ts` (Supabase) e `demo.ts`. Nova leitura/gravação → adicionar nas duas.

## Ligar o banco (Supabase)
1. Criar projeto "MyPet" no Supabase (região São Paulo). ⚠️ Plano grátis = 2 projetos ativos (já há FitFlow e MyFinance): pausar um ou usar outra conta.
2. SQL Editor → rodar `supabase/migrations/001_inicio.sql` e depois `002_cartao_vacina.sql` (cada um uma vez).
3. Copiar `.env.example` para `.env.local` e colar URL + chave anon (Project Settings → API Keys).
4. Authentication → URL Configuration: Site URL `http://localhost:3002` (depois o endereço da Vercel) e Redirect URLs com `http://localhost:3002/**`.
5. Google: Authentication → Providers → Google (precisa de um "OAuth client" no Google Cloud; redirect = `https://<projeto>.supabase.co/auth/v1/callback`).

## Banco de dados (`supabase/migrations/`)
- Tabelas em português: `perfis` (nome; criado sozinho no cadastro), `pets`, `tutores` (pet ↔ pessoa, papel `principal`/`tutor`), `convites` (código 6 letras, 7 dias, uso único), `cuidados` (lembretes), `registros` (feito/pulado/adiado), `notificacoes_inscricoes` (etapa 5).
- RLS: tudo por `eh_tutor(pet_id)`. Foto no Storage **privado** `fotos-pets/<pet_id>/...`, mostrada com link temporário.
- Funções (fazem tudo de uma vez): `criar_pet` (pet + tutor principal + cuidados + histórico da anamnese), `concluir_cuidado` (feito/pulado; **se outro tutor já resolveu aquele horário, não grava e devolve quem e quando**; `p_forcar` grava mesmo assim), `desfazer_registro`, `criar_convite` (só principal), `aceitar_convite`, `ver_convite`.
- Realtime ligado em `registros` e `cuidados`: o "Feito" de um tutor aparece sozinho no celular do outro. O app também recarrega ao voltar para a tela.
- Gravações: `.select()` + erro em português se não voltar linha (`expectRows` em `cloud.ts`). A tela só muda depois que o banco confirma.

## Regras da agenda (`lib/schedule.ts`, tudo calculado, nada guardado)
- **Horários fixos** (`freq` horas/diaria/semanal/dias, remédios): cada horário é uma "ocorrência" (`registros.ocorrencia` = horário original). Dose esquecida de dias anteriores não vira atraso; horário anterior ao cadastro do lembrete não conta.
- **Contados da última vez** (`meses`/`anos`: vacina, vermífugo, antipulgas, check-up): `cuidados.proxima_em` guarda a próxima data (editável). Feito → próxima = dia feito + intervalo (`nextAfter`). Pulado → a partir da data marcada.
- **Uma vez** (`unica`): `proxima_em` é a data.
- Atrasada = passou 30 min (`LATE_AFTER_MIN`). Adiar = registro `adiado` com `adiado_para` (a tarefa mostra o novo horário).
- Feito grava quem e a hora; "Mudar horário" corrige (`feito_em`); "Desfazer" apaga o registro e devolve a data.

## Cadastro (`components/onboarding/`, regras em `lib/onboarding.ts`)
- 16 perguntas (`steps.tsx`), uma por tela, "Pular" em todas; escolha única avança sozinha. Raças em `lib/breeds.ts` (com porte típico → já sugere o porte).
- Fim: resumo + agenda sugerida (`suggestCares`): V8/V10 e antirrábica sempre (filhote com datas da série), outras vacinas se já feitas, vermífugo (mensal até 6 meses, depois 3 meses), antipulgas pelo método (coleira 6 meses, comprimido/pipeta 1 mês), remédio contínuo, check-up (anual; idoso 7+ a cada 6 meses). Data vencida vira hoje com "Já venceu". Tudo editável/desmarcável. Aviso fixo "Informações gerais. Siga sempre a orientação do seu veterinário."
- Última dose informada vira histórico (`registros` feito).

## Telas
- **Início** (`components/home/`): saudação + foto, Atrasados (vermelho suave), faixa da semana (seg–dom, bolinhas), lista do dia com botão grande "Feito ✓", Próximo compromisso (consulta/vacina). Menu de cada tarefa: adiar, pular (motivo), editar, mudar horário, desfazer, histórico.
- **Botão +** (`components/care/add-menu.tsx` + `care-form.tsx`): remédio, vacina, vermífugo, antipulgas, consulta/cirurgia/exame, lembrete livre. Gasto = etapa 4. "Parar este lembrete" desliga (`ativo = false`), nunca apaga.
- **Pet** (provisória): perfil, trocar foto, tutores, convidar, outro cachorro, sair.
- **Guia** (`components/guia/guia-screen.tsx`, conteúdo em `lib/guide.ts`): aviso fixo no topo ("Informações gerais. Siga sempre a orientação do seu veterinário.", acompanha a rolagem), seletor Filhote/Adulto/Idoso (abre na fase do pet, com bolinha nela), cartão da fase (verde, "Fifu está nesta fase"), cards curtos por assunto (vacinas, vermífugo, pulgas, alimentação, cuidados gerais) e "Quando correr para o veterinário". Fase: filhote < 1 ano; idoso a partir de 7 anos (6 se porte gigante) — `petPhase()`. Texto sempre simples e geral, sem marcas nem doses.
- Seletor de pet no topo só aparece com 2+ cachorros.
- `/convite/CODIGO`: aceitar convite (depois do login).

## Visual (identidade aprovada em 16/11/2026)
- Cores **só** pelos nomes em `src/app/globals.css` (nunca `#hex` nas telas): **forest** `#2B4321` = principal (textos importantes, barra de navegação, botões principais; `primary` aponta para ela), **pink** `#FEB6C6` = destaque (botão +, checks, texto sobre o verde; `on-primary`), **olive** `#7B8450` = secundária (fundo da logo, tags, ícones), fundo `#FFF8F9`, cards brancos, atraso = coral suave (`danger`). Uma cor suave por tipo de cuidado (`t-remedio`...; ícone e cor em `components/care/care-meta.tsx`).
- Fontes: títulos **Fraunces itálica** (classe `titulo`), textos e números **DM Sans**. Misturar: `Olá, <span className="titulo">Fifu</span>`.
- Logo: cachorro correndo. `LogoMark` (quadrado oliva + cachorro rosa) ou `LogoMark plain` (só a silhueta, na cor do texto: `text-pink`, `text-forest`; a classe `logo-silhueta` usa `public/brand/silhueta.png` como máscara). Ícones do app em `public/icons/` e `src/app/icon.png` / `apple-icon.png`, gerados de `public/brand/logo-quadrada.png` por `node scripts/gerar-imagens.cjs`. Foto de exemplo: Canela (`public/exemplo/`, na tela de boas-vindas).
- Cards `rounded-3xl bg-card shadow-card`, muito respiro. Botões em pílula (`components/ui/button.tsx`). Janelas de baixo: `Sheet`. Avisos: `useToast()`.
- Barra de navegação: `components/shell/tab-nav.tsx`, no layout `app/(abas)/layout.tsx` (fica fixa entre as abas). Pílula verde flutuante, ícones rosa, bolha rosa que desliza para a aba ativa, botão + rosa no meio (gira ao abrir).
- Animações com `motion` (curtas): troca de tela, perguntas deslizando, check que se desenha (`AnimatedCheck`), cartão de vacina. "Reduzir movimento" desliga.
- Testar sempre em 375 px sem rolagem lateral.

## Cuidados e Cartão de Vacina
- Aba Cuidados (`components/cuidados/`): Cartão de Vacina no topo + lembretes agrupados por tipo (próxima data, frequência, última vez). Tocar abre detalhes, editar e histórico. Carrega o histórico inteiro do pet.
- Cartão (`vaccine-card.tsx`, dados em `lib/vaccine-card.ts`): card fechado (capa verde) → amplia (layoutId `cartao-vacina`) → capa vira em 3D e mostra páginas de papel: Identificação, Vacinas, Vermífugo, Pulgas e carrapatos (6 linhas por página; deslizar ou setas). Fechar faz o caminho de volta (fases `abrindo/aberto/fechando` por tempo fixo).
- Entra sozinho no cartão todo registro `feito` de vacina/vermífugo/antipulgas (cadastro, botão +, "Feito ✓" ou "Adicionar registro"). Próxima dose = `proxima_em` do lembrete, na aplicação mais recente. Lembrete sem aplicação aparece como "a aplicar".
- "Adicionar registro" (`add-record-sheet.tsx`, `repo.addRecord`): tipo, qual (ou nova), data, próxima dose (só anda para a frente), clínica (`registros.clinica`), foto da etiqueta (`registros.lote_foto`, Storage `fotos-pets/<pet>/etiqueta-...`).
- Compartilhar: imagem PNG desenhada em canvas (`cardImage`) ou PDF pela impressão do navegador (`#cartao-impressao`, regras `@media print`).

## Organização
- Datas em texto `AAAA-MM-DD` com `parseDate()`; horários locais do celular (`lib/dates.ts`).
- Textos do app em português do Brasil; código em inglês/kebab-case.
- Páginas (`app/**/page.tsx`) finas: só montam o componente da tela.
