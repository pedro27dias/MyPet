@AGENTS.md

# MyPet (nome provisório "PetCare")

App web mobile-first (PWA instalável) para o dono de cachorro **ou gato** saber **o que fazer e quando**, sem precisar lembrar.
Prioridade: **simplicidade e rapidez. Registrar algo = 1 toque.**
O dono **não programa**: explique em português simples, sem termos técnicos, e diga como ver o resultado no navegador.

## Etapas
| # | Etapa | Situação |
|---|---|---|
| 1 | Banco de dados, login (e-mail/Google), cadastro do cachorro (16 perguntas + agenda sugerida), aba Início com "Feito ✓" | ✅ (Supabase ligado; Google ainda não configurado) |
| 2 | Identidade visual nova (verde floresta + rosa) e aba Cuidados com Cartão de Vacina | ✅ (SQL 002 já rodado) |
| 2b | Editar perfil do pet | ✅ |
| 3 | Aba Guia (fases: filhote, adulto, idoso) | ✅ |
| 4 | Gastos (aba Pet + botão +) | ✅ (rodar `003_gastos.sql`) |
| 5 | Notificações push (no horário, para todos os tutores; aviso quando alguém conclui) + PWA instalável completa | ✅ (variáveis na Vercel e SQL 004 rodado; cron do Supabase respondendo 200 — conferir em `net._http_response`) |
| 6 | Publicar na Vercel | ✅ https://my-pet-orcin.vercel.app (conta Vercel da pedro27dias, projeto `my-pet`; publica sozinho a cada push no `main`; variáveis `NEXT_PUBLIC_SUPABASE_*` em Production; cron diário `/api/manter-ativo` em `vercel.json` mantém o Supabase acordado) |
| 7 | Suporte a gatos (ver seção "Gatos") | ✅ (SQL 005 rodado) |
| 8 | Coleira, data "Daqui a…", calendário do mês e Histórico (ver seção "Coleira, datas e histórico") | ✅ (SQL 006 rodado) |
| 9 | Nova navegação, banho e tosa, prontuário, aba Gastos nova, plano de saúde, Central de Emergência e guia de alimentação (ver seção "Etapa 9") | ✅ (SQL 006 e 007 rodados) |

## Etapa 9
- **Navegação**: Início | Cuidados | (+) | Gastos | Guia (`tab-nav.tsx`). Perfil do pet (`/pet`) abre pelo botão "Perfil" do topo; abas Perfil | Saúde (plano + contatos de emergência) | Tutores. Botão **SOS** coral no topo do Início → `/emergencia`.
- **Banho e tosa**: tipo de cuidado `banho` (título = tipo, `detalhe` = local, `cuidados.telefone`, `cuidados.valor`). Feito ✓ com valor → `AskExpenseSheet` ("Lançar R$ X em Gastos?", categoria banho, quem pagou) em `components/gastos/ask-expense.tsx`.
- **Prontuário** (aba Cuidados: Próximos | Histórico | Prontuário): tabela `prontuario` (tipo consulta/exame/teste/cirurgia/diagnostico/receita, data, título, clínica, resumo, tags, anexos jsonb, valor). Anexos (fotos comprimidas e PDFs até 10 MB) no Storage `fotos-pets/<pet>/prontuario/...` via `repo.uploadFile`; links temporários por `photoUrls`. Telas em `components/prontuario/` (lista com filtros/busca, detalhe, visualizador com baixar/compartilhar). Consulta/receita → "Criar lembretes dos remédios" (`PrescriptionSheet`); valor → pergunta se lança em Gastos (Consultas/Exames).
- **Gastos** (`/gastos`, `gastos-screen.tsx`): total do mês (setas) ou período, rosca por categoria (SVG), quem pagou, lista por dia, filtros (categoria, tutor, período), recibo (`gastos.recibo`). Categorias em `expense-meta.tsx` (`vet` = Consultas) + criadas pelos tutores (`c:Nome`, lista em `pets.categorias_gasto`).
- **Plano de saúde**: `pets.plano` (jsonb: operator, name, card, validUntil, phone, waiting, coverage, notes, pdf). Pergunta opcional no fim do cadastro (`PlanStep`). Card e formulário em `components/pet/health-plan.tsx` (campos à mão + PDF/foto guardado no Storage para "Ver PDF"). Leitura do PDF por IA foi pedida e depois descartada pelo dono (não refazer sem ele pedir).
- **Emergência**: `pets.emergencia` (jsonb: clinic {name, address, phone, whatsapp, h24}); tela `components/emergencia/emergency.tsx` (Ligar/WhatsApp/Rota Google Maps/Waze, buscar "veterinário 24 horas" pela localização, vet, plano, resumo do pet). "Comeu algo proibido?" do guia guarda o que/quanto/hora no aparelho (`mypet-comeu-<pet>`) e aparece no topo da tela.
- **Guia: Alimentação**: conteúdo em `lib/food-guide.ts` (resumo, seções, lista "Pode comer?"); resumo no fim da aba Guia e tela `/guia/alimentacao` (`components/guia/food.tsx`, Cão | Gato, busca, acordeão, rodapé fixo com aviso e fontes).

## Coleira, datas e histórico
- Coleira = tipo de cuidado `coleira` (`freq` meses, `intervalo` = duração, `detalhe` = marca, `antecedencia_min` = aviso antes da troca). Colunas novas (SQL 006): `cuidados.protege` (text[]: `leish`/`pulgas`/`carrapatos`), `cuidados.foto` (embalagem), `cuidados.idade_min_semanas`. Cadastrar grava um registro `feito` (a colocação); "Troquei a coleira ✓" = `repo.complete` (próxima = hoje + duração). Regras e marcas em `lib/collar.ts`; telas em `components/coleira/` (`CollarForm`, `CollarCard` com anel, `CollarMini` no Início). `careToRow` só manda as colunas do 006 quando usadas.
- Segurança da coleira: gato não pode marcar leishmaniose; marca/princípio de cão (Scalibor, Leevre, EctoFend, deltametrina, permetrina) em gato bloqueia o salvar; cão com coleira assim numa casa com gato avisa; coleira ativa + outro antipulgas avisa (`OVERLAP_TEXT`); idade mínima da marca avisa.
- Datas: `components/ui/date-input.tsx` → `DateInput` ("Escolher data" | "Daqui a…" com atalhos; `kind="por"` para o fim de remédio) e `RepeatPicker` (atalhos + "A cada N dias/semanas/meses/anos" → `dias`/`semanal`/`meses`/`anos`). Sempre grava a data real.
- Calendário: `components/home/week-strip.tsx` abre do mês (alça "Ver mês" ou arrastar); bolinhas por tipo (máx. 3 + "+"), check nos dias passados resolvidos, coral nos atrasados; hoje = círculo verde, escolhido = rosa. Mês antigo busca registros (`loadFrom` no Início).
- Histórico: aba Cuidados tem "Próximos | Histórico" (`components/cuidados/history-timeline.tsx`): por mês, filtros, busca, gastos juntos, detalhe com correção de horário/observação (`repo.updateRecord` grava `registros.observacao`, `editado_por`, `editado_em`), PDF pela impressão (`#historico-impressao`).

## Gatos
- `pets.especie` (`cachorro`/`gato`, padrão cachorro) + só gato: `estilo_vida` (`dentro`/`as_vezes`/`sempre`), `outros_animais` (text[]), `teste_felv_fiv`, `racao_tipo`. Tipo de cuidado novo `exame` (testes; `registros.resultado`). SQL `005_gatos.sql` (refaz `criar_pet`). Sem o 005, `cloud.ts` avisa "rode o arquivo 005".
- Cadastro: 1ª pergunta "Seu pet é…" (`SpeciesStep`); `stepsFor(species)` em `steps.tsx` = 16 de cachorro ou 18 de gato (sem porte; com rotina, outros animais, FeLV/FIV, alimentação seca/úmida/mista). Pular = cachorro.
- Agenda de gato: `suggestCatCares` em `lib/onboarding.ts` (polivalente V3/V4/V5 e antirrábica sempre, FeLV se já fez, "Conversar com o vet sobre teste FeLV/FIV" se não fez/não sabe, vermífugo filhote/dentro de casa 6 meses/sai 3 meses, antipulgas com "Use apenas produto indicado para gatos", check-up anual e a cada 6 meses a partir de 10 anos). Teste já feito vira registro `exame` com resultado (`felvTestRecord`).
- Guia: `guideFor(species)` em `lib/guide.ts`; gato tem 4 fases (`filhote`, `jovem` 1–6, `maduro` 7–10, `senior` 10+), cartões fixos de segurança (`CAT_SAFETY`) e aviso com WSAVA/AAHA/AAFP/ESCCAP (`DISCLAIMER_CAT`).
- Cartão: `cardSections(species)` em `lib/vaccine-card.ts` (gato: Polivalente, Antirrábica, FeLV, Testes com resultado, Vermífugo, Antipulgas; seção por `match`).
- Segurança: `FleaSafetyNote` (`components/care/flea-safety.tsx`) no cadastro, no + e no cartão: gato → "Use apenas produto indicado para gatos"; cachorro numa conta com gato → alerta de permetrina.
- Ícones: `PetAvatar species`, `PetMark` (silhueta de gato desenhada em `components/shared/species.tsx`) na capa do cartão e no Início; aba Pet mostra gato.

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
- **Pet** (`components/pet/pet-screen.tsx`): foto e nome no topo + abas em pílula **Perfil** (dados, ligar pro vet, **Editar perfil** = `edit-pet-sheet.tsx` com Básico/Saúde/Rotina, mesmos campos do cadastro, raça com busca por `datalist`; idade aproximada só é recalculada se mexer nos anos/meses; `repo.updatePet` + `reloadPets`; outro cachorro, sair), **Gastos** e **Tutores** (lista + convidar).
- **Gastos** (`components/gastos/`, SQL `003_gastos.sql`, tabela `gastos`: valor, categoria `racao|vet|remedio|banho|outros`, data, `pago_por`, descrição; RLS por tutor, realtime): painel do mês com setas (não passa do mês atual), total, barras por categoria, "quem pagou" quando há mais de um, lista (tocar corrige ou apaga, com confirmação). Lançar pelo painel ou pelo **+ → Gasto**. Valor digitado em centavos ("8990" = R$ 89,90). Dinheiro sempre por `fmtMoney`/`sumMoney` (`lib/money.ts`). O app recarrega os gastos pelo `tick` do `useApp()`.
- **Guia** (`components/guia/guia-screen.tsx`, conteúdo em `lib/guide.ts`): aviso fixo no topo ("Informações gerais. Siga sempre a orientação do seu veterinário.", acompanha a rolagem), seletor Filhote/Adulto/Idoso (abre na fase do pet, com bolinha nela), cartão da fase (verde, "Fifu está nesta fase"), cards curtos por assunto (vacinas, vermífugo, pulgas, alimentação, cuidados gerais) e "Quando correr para o veterinário". Fase: filhote < 1 ano; idoso a partir de 7 anos (6 se porte gigante) — `petPhase()`. Texto sempre simples e geral, sem marcas nem doses.
- **Topo de todas as abas** (`TopBar` em `tab-shell.tsx`): pílula do pet à esquerda (nome cortado com …; abre só a troca de pets, com ✓ e "+ Adicionar pet") e botão "Perfil" à direita (borda rosa) → `/pet`; no perfil vira "Voltar". A foto do Início não abre mais o perfil. O perfil termina com "Minha conta" (nome, notificações, sair).
- **Teclado**: nunca usar `autoFocus`. `KeyboardHelper` (`components/shell/keyboard.tsx`, no `AppProvider`): rola o campo tocado para cima do teclado, fecha ao tocar fora ou arrastar para baixo, e expõe `--teclado` (as `Sheet` sobem junto).
- `/convite/CODIGO`: aceitar convite (depois do login).

## Visual (identidade aprovada em 16/11/2026)
- Cores **só** pelos nomes em `src/app/globals.css` (nunca `#hex` nas telas): **forest** `#2B4321` = principal (textos importantes, barra de navegação, botões principais; `primary` aponta para ela), **pink** `#FEB6C6` = destaque (botão +, checks, texto sobre o verde; `on-primary`), **olive** `#7B8450` = secundária (fundo da logo, tags, ícones), fundo `#FFF8F9`, cards brancos, atraso = coral suave (`danger`). Uma cor suave por tipo de cuidado (`t-remedio`...; ícone e cor em `components/care/care-meta.tsx`).
- Fontes: títulos **Fraunces itálica** (classe `titulo`), textos e números **DM Sans**. Misturar: `Olá, <span className="titulo">Fifu</span>`.
- Logo: cachorro correndo. `LogoMark` (quadrado oliva + cachorro rosa) ou `LogoMark plain` (só a silhueta, na cor do texto: `text-pink`, `text-forest`; a classe `logo-silhueta` usa `public/brand/silhueta.png` como máscara). Ícones do app em `public/icons/` e `src/app/icon.png` / `apple-icon.png`, gerados de `public/brand/logo-quadrada.png` por `node scripts/gerar-imagens.cjs`. Foto de exemplo: Canela (`public/exemplo/`, na tela de boas-vindas).
- Cards `rounded-3xl bg-card shadow-card`, muito respiro. Botões em pílula (`components/ui/button.tsx`). Janelas de baixo: `Sheet`. Avisos: `useToast()`.
- Barra de navegação: `components/shell/tab-nav.tsx`, no layout `app/(abas)/layout.tsx` (fica fixa entre as abas). Pílula verde flutuante, ícones rosa, bolha rosa que desliza para a aba ativa, botão + rosa no meio (gira ao abrir).
- Animações com `motion` (curtas): troca de tela, perguntas deslizando, check que se desenha (`AnimatedCheck`), cartão de vacina. "Reduzir movimento" desliga.
- Testar sempre em 375 px sem rolagem lateral.
- **Datas e horas**: NUNCA usar `<input type="date">`/`"time"` visível (no iPhone ignora a largura e a fonte). Usar `CampoData` (pílula 📅 "Hoje"/"18 nov"/"18 nov 26", com `time` vira "Hoje · 08:30"; painel com atalhos, "Daqui a…" (`ahead`), "Por…" (`kind="por"`), calendário e horário) e `CampoHora` em `components/ui/campo-data.tsx`. O painel vai por portal no `<body>` (z-90), por cima de outras janelas.
- **Campos**: todos com 52 px (`h-13`), borda 2, `rounded-2xl`, texto 16 px, `min-w-0`. Dois lado a lado = classe `campos-2` (`globals.css`: 2 colunas iguais, 12 px; abaixo de 360 px vira uma coluna).

## Cuidados e Cartão de Vacina
- Aba Cuidados (`components/cuidados/`): Cartão de Vacina no topo + lembretes agrupados por tipo (próxima data, frequência, última vez). Tocar abre detalhes, editar e histórico. Carrega o histórico inteiro do pet.
- Cartão (`vaccine-card.tsx`, dados em `lib/vaccine-card.ts`): card fechado (capa verde) → amplia (layoutId `cartao-vacina`) → capa vira em 3D e mostra páginas de papel: Identificação, Vacinas, Vermífugo, Pulgas e carrapatos (6 linhas por página; deslizar ou setas). Fechar faz o caminho de volta (fases `abrindo/aberto/fechando` por tempo fixo).
- Entra sozinho no cartão todo registro `feito` de vacina/vermífugo/antipulgas (cadastro, botão +, "Feito ✓" ou "Adicionar registro"). Próxima dose = `proxima_em` do lembrete, na aplicação mais recente. Lembrete sem aplicação aparece como "a aplicar".
- "Adicionar registro" (`add-record-sheet.tsx`, `repo.addRecord`): tipo, qual (ou nova), data, próxima dose (só anda para a frente), clínica (`registros.clinica`), foto da etiqueta (`registros.lote_foto`, Storage `fotos-pets/<pet>/etiqueta-...`).
- Compartilhar: imagem PNG desenhada em canvas (`cardImage`) ou PDF pela impressão do navegador (`#cartao-impressao`, regras `@media print`).

## Notificações (Web Push)
- Celular: `public/sw.js` (recebe e abre o app ao tocar; ícone pequeno = silhueta), registrado em `AppProvider` (`lib/push.ts`). Ligar/desligar: `components/shared/notifications.tsx` (cartão no Início que some ao ativar/fechar; linha em Pet → Perfil). iPhone só com o app instalado na Tela de Início. Inscrição salva por `salvar_inscricao` (passa o aparelho para quem entrou nele).
- Na hora: o **Supabase (pg_cron + pg_net, SQL 004) chama `/api/notificacoes/enviar` a cada 5 min** com `Authorization: Bearer CRON_SECRET` (o cron da Vercel grátis só roda 1x por dia). A rotina usa a chave secreta do Supabase (`lib/server/notify.ts`, `server-only`), calcula as tarefas com `lib/schedule.ts` no **relógio de Brasília** (desloca as datas; NUNCA mudar `process.env.TZ`: o servidor de teste entra em recarregamento sem fim), manda o que venceu nos últimos 15 min e o aviso antes de consultas (`antecedencia_min`). Cada aviso sai uma vez (`notificacoes_enviadas`).
- Feito: o app chama `/api/notificacoes/concluido` com o login; os OUTROS tutores recebem "Feito por X às 8h05".
- Variáveis (Vercel, Production): `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (Secret), `CRON_SECRET` (Secret; o mesmo valor vai no SQL 004), `SUPABASE_SERVICE_ROLE_KEY` (Secret). Valores locais em `.env.local`.
- O navegador embutido do Claude não aceita service worker: testar notificações num celular de verdade.

## Organização
- Datas em texto `AAAA-MM-DD` com `parseDate()`; horários locais do celular (`lib/dates.ts`).
- Textos do app em português do Brasil; código em inglês/kebab-case.
- Páginas (`app/**/page.tsx`) finas: só montam o componente da tela.
