# Penalty Cup 2026 · RX Soccer Academy

Site do torneio de penáltis de 18 de Julho de 2026: 45 equipas, 4 escalões, 8 balizas a
jogar ao mesmo tempo, uma jornada de 10 em 10 minutos a partir das 16:30.

- **Site público** — para quem está no recinto, no telemóvel: o que está a dar em cada
  baliza, calendário, classificações e o quadro final. Actualiza-se sozinho.
- **Mesa** (`/admin`) — para quem regista os resultados, no computador: definir grupos,
  gerar o calendário e dizer quem ganhou cada jogo.

Next.js + Supabase + Vercel, tudo dentro dos planos gratuitos.

---

## Pôr a andar

### 1. Supabase

1. Cria um projeto em [supabase.com](https://supabase.com) (plano free).
2. Monta a base de dados a partir de `supabase/migrations/` — é a única fonte da
   verdade, por ordem de nome:

   ```bash
   supabase link --project-ref <o-id-do-teu-projeto>
   supabase db push
   ```

   Sem CLI, cola os ficheiros de `supabase/migrations/` por ordem no **SQL Editor**. Mas
   nesse caso o Supabase não fica a saber que já foram aplicadas — lê a secção
   "Migrações" antes de ligares o push automático.
3. Cria a conta da mesa (ver a seguir).
4. Em **Project Settings → API**, copia o `Project URL` e a `anon public key`.

### A conta da mesa

São dois passos, e o segundo não se pode saltar.

**Primeiro**, cria o utilizador: **Authentication → Users → Add user → Create new user**.
Mete o teu email e uma password à tua escolha, e liga **Auto Confirm User** (senão ficas à
espera de um email de confirmação).

**Segundo**, diz à base de dados que essa pessoa é da mesa. No **SQL Editor**:

```sql
insert into public.admins (user_id, email)
select id, email from auth.users where email = 'o-teu-email@exemplo.com';
```

Confirma com `select * from public.admins;` — tem de aparecer lá a linha.

Para juntar mais alguém à mesa (outra pessoa a registar resultados), repete os dois passos
com o email dela. Para tirar alguém: `delete from public.admins where email = '...';` — a
conta continua a existir, mas deixa de poder escrever.

> **Porquê o segundo passo?** O Supabase vem com o registo público ligado, por isso
> qualquer pessoa na internet pode criar uma conta no teu projeto. Se as permissões
> dissessem só "quem tiver sessão iniciada", essa pessoa passava a poder mudar resultados.
> Ter conta e ser da mesa são coisas diferentes, e é a tabela `admins` que as separa —
> mesmo que o registo fique aberto por esquecimento.
>
> Isto está testado: uma conta criada de fora consegue ler o placard e mais nada. Ao
> tentar gravar um resultado, adiar um jogo ou mexer na hora, leva com "Só a mesa pode…".

> A chave `anon` é pública de propósito — pode ir para o browser. Quem não estiver na
> tabela `admins` só consegue ler. Isso é garantido pelo Row Level Security do
> `supabase/migrations/`, não pelo site: mesmo quem contorne o site não passa.

### 2. Local

```bash
npm install
cp .env.example .env.local   # e mete lá o URL e a anon key
npm run dev
```

### Migrações

Há um workflow em `.github/workflows/migrations.yml` que corre `supabase db push` sempre
que entra código novo em `supabase/migrations/`. Fica adormecido até lhe dares os secrets,
em **Settings → Secrets and variables → Actions**:

| Secret | Onde | 
|---|---|
| `SUPABASE_ACCESS_TOKEN` | [Account → Tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_PROJECT_REF` | o id do projeto, está no URL do dashboard |
| `SUPABASE_DB_PASSWORD` | a password da base de dados |

> **Nunca editar uma migração já aplicada.** O `db push` só aplica as que ainda não
> foram, e sabe quais foram porque as regista. Editar uma que já lá está significa que a
> mudança **nunca chega à produção** — e o código passa a pedir colunas que não existem.
> Mudanças ao schema são sempre um ficheiro novo em `supabase/migrations/`.
>
> A primeira migração começa com `drop table ... cascade`, porque monta tudo do zero. Se
> alguma vez montares a base de dados colando SQL à mão, o Supabase não fica a saber, e o
> primeiro `db push` aplicava-a outra vez — apagando o torneio. Nesse caso, diz-lhe
> primeiro que já está feito:
> ```bash
> supabase migration repair --status applied 20260715000001
> supabase migration list   # confirma antes de qualquer db push
> ```

### 3. Vercel

1. Importa o repositório em [vercel.com](https://vercel.com).
2. Em **Environment Variables**, mete `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.

---

## No dia do torneio

### Antes de começar

1. **Grupos** — as equipas já vêm no escalão certo e nunca mudam de escalão. Arrasta-as
   entre o Grupo A e o Grupo B, ou usa as setas. Se os grupos ficarem desequilibrados o
   site avisa e diz a que horas o escalão passaria a acabar — um grupo com 8 equipas leva
   28 jogos e um com 4 leva 6, e as meias-finais esperam pelos dois.
2. **Calendário** — gera o de cada escalão. Só depois disto é que há jogos.

### O apito inicial

Estava marcado para as 16:30 e só arrancaram às 16:45? Em **Resultados**, carrega em
**Começar agora**. O calendário inteiro desloca-se, as horas voltam a bater certo e os
resultados já registados ficam. Também dá para marcar uma hora à mão, antes ou depois de
começar.

### Durante

Na página **Resultados** estão as 8 balizas, com o jogo que está a decorrer em cada uma.
O árbitro diz quem ganhou, clicas no nome da equipa, e está feito. O site público
actualiza-se em cerca de um segundo.

- **O resultado em penáltis é opcional.** Só o vencedor é obrigatório. Mas vale a pena
  registá-lo quando o souberes: sem golos não há diferença de golos, e um empate a pontos
  entre três equipas pode ficar sem critério de desempate.
- **Enganaste-te?** Clica na outra equipa. A classificação, as meias-finais e a final
  acertam-se sozinhas — e se o vencedor de uma meia deixar de fazer sentido, esse
  resultado é apagado em vez de ficar lá errado.
- **Equipa atrasada?** Carrega em "Equipa não chegou". O jogo troca de lugar com o
  seguinte daquela baliza. Se ainda não chegar, carregas outra vez.
- **"Já começou"** existe mas não é preciso. O site percebe sozinho o que está a decorrer
  (o primeiro jogo por decidir de cada baliza, passada a hora), por isso não tens de marcar
  nada — seriam duzentos cliques a mais numa noite. Só faz falta se uma baliza arrancar
  antes da hora e quiseres que ela acenda já.
- **Jogo do 3º e 4º lugar** — em Calendário, por escalão: *não há*, *à hora da final* ou
  *antes da final*. Muda-se a qualquer momento, mesmo a meio do torneio, sem regerar nem
  perder resultados. As meias ocupam as duas balizas do escalão mas a final só ocupa uma,
  por isso "à hora da final" entra na baliza livre e não custa um minuto; "antes da final"
  é o mesmo jogo com a final 10 minutos mais tarde.
- **Todos os jogos** — o torneio inteiro numa lista, para conferir e corrigir.

### Atrasos

O site **não** decide pelo relógio o que está a decorrer. Em cada baliza, o jogo a
decorrer é o primeiro que ainda não tem vencedor. Como registas os vencedores à medida
que acontecem, o site segue o campo real e absorve os atrasos sozinho. Compara depois a
jornada real com a do horário e mostra o atraso estimado.

### Empates sem desempate possível

Se três equipas ganharem uma à outra em ciclo e não houver placards, nada as separa —
nenhum critério, e inventar uma ordem seria mentir. Nesse caso o site marca-as com `=`,
congela o apuramento e pede a decisão à mesa (sorteio, penáltis extra, o que decidirem).
Regista-se a ordem em **Grupos**.

Critérios de desempate, por ordem:

1. Pontos (3 por vitória)
2. Confronto directo entre as empatadas: pontos, depois diferença de golos, depois golos
3. Diferença de golos no grupo
4. Golos marcados no grupo
5. Decisão da mesa

---

## Quanta gente aguenta ao mesmo tempo

Duas coisas diferentes, com limites diferentes.

**Servir a página.** As páginas públicas são construídas uma vez e servidas a toda a
gente durante 3 segundos (`revalidate = 3`). Não lêem cookies, de propósito: é isso que
permite partilhá-las. Com 500 telemóveis no recinto, a base de dados leva umas poucas
consultas por minuto em vez de umas centenas por segundo. Isto aguenta o recinto cheio
à vontade no plano gratuito.

**Actualizar sozinho.** O plano gratuito do Supabase permite
[200 ligações realtime em simultâneo](https://supabase.com/docs/guides/realtime/limits).
Com 500 pessoas, as primeiras 200 recebem o aviso por websocket (menos de 1 segundo) e
as restantes caem na rede de segurança: a página pede-se a si mesma de ~25 em ~25
segundos. Ninguém fica com dados errados; uns sabem mais depressa do que outros.

Se quiseres que os 500 tenham o segundo exacto, o plano Pro do Supabase (25 $/mês) sobe
o limite para 500 ligações. Para um torneio de um dia, provavelmente não vale a pena —
25 segundos de atraso num jogo de 10 minutos não se nota.

Há ainda um cuidado no cliente: quando as 8 balizas fecham quase ao mesmo tempo, os
avisos que chegam seguidos contam como um só, e cada telemóvel espera um bocado à sorte
antes de pedir a página. Sem isso, seriam centenas de pedidos no mesmo instante.

> O plano Hobby da Vercel é para uso não comercial. Um torneio de um clube cai lá dentro,
> mas se houver patrocínios pagos convém confirmar.

## Regras do torneio, tal como estão no código

- Cada escalão joga em dois grupos, um por baliza. Dentro do grupo é todos contra todos.
- Cada vitória vale 3 pontos. Não há empates: o penálti resolve-se em morte súbita,
  seguindo a ordem que iniciou o jogo.
- Apuram-se os dois primeiros de cada grupo. O 1º de um grupo joga contra o 2º do outro.
- Os vencedores das meias-finais fazem a final.
- As meias-finais só arrancam quando os dois grupos do escalão acabam, por isso ficam na
  jornada a seguir à do grupo mais longo.

## Testes

```bash
npm run check         # 196 verificações: as regras, e o ensaio geral
npm run check:ensaio  # só o ensaio geral
npm run typecheck
npm run build
```

O `check:ensaio` é o mais valioso: pega nas 45 equipas a sério, monta os 4 escalões
como estão no seed e joga o dia 18 inteiro, jornada a jornada, a verificar que em nenhum
instante o site mente — nunca duas bolas na mesma baliza, nunca uma equipa em dois sítios
à mesma hora, os atrasos absorvidos, os apuramentos certos e os quatro campeões a sair.

O `npm run check` confirma, entre outras coisas, que o calendário gerado bate certo com a
simulação `PENALTY_CUP_2026_v3` (meias do 2011/12 às 19:00, do 2015/16 às 20:00, do
2017/18/19/20 às 17:30), que os atrasos não fazem o site mentir, e que corrigir um erro
na mesa reconstrói o quadro final.

## Como está organizado

```
app/(site)/      site público
app/admin/       mesa (protegida por login)
lib/tournament.ts  o motor: calendário, classificação, apuramentos
supabase/        schema e seed
scripts/         verificações do motor
```

O `lib/tournament.ts` não sabe o que é uma base de dados nem um ecrã: recebe equipas e
jogos e devolve calendário, classificação e apuramentos. É por isso que dá para o testar
todo sem levantar nada.
