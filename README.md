# Batalha de Guarda-Redes · RX Soccer Academy

Site do torneio de guarda-redes: **guarda-redes individuais**, agrupados por escalão de ano
de nascimento. São 5 escalões, cada um no seu campo, e **cada campo tem uma baliza** — por
isso joga-se um jogo de cada vez em cada escalão. Cada escalão tem o seu formato.

- **Site público** — para quem está no recinto, no telemóvel: o que está a dar em cada
  campo, calendário, classificações e o quadro final. Actualiza-se sozinho.
- **Mesa** (`/admin`) — para quem regista os resultados, no computador: gerir os
  guarda-redes, escolher o formato, gerar o calendário e dizer quem ganhou cada jogo.

Next.js + Supabase + Vercel, tudo dentro dos planos gratuitos.

## O formato, escalão a escalão

Cada guarda-redes está no escalão do seu ano de nascimento e nunca muda de escalão. O
formato de cada escalão escolhe-se na mesa, em **Formato**, com três decisões
independentes:

- **Grupos** — poule única, ou dois grupos.
- **Voltas** — cada par joga uma ou duas vezes.
- **Eliminatória** — campeonato (sem eliminatória), só final, ou meias-finais e final.

Dentro de cada grupo é todos contra todos. Cada vitória vale **3 pontos**; não há empates —
o penálti resolve-se em morte súbita. Onde há eliminatória, apuram-se os primeiros de cada
grupo; onde é campeonato, o 1º da tabela é o campeão.

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

   > O `supabase/seed.sql` só corre no `supabase db reset` **local** — sobe os limites de
   > tempo das consultas numa máquina de dev carregada. Não vai para produção.
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

Para juntar mais alguém à mesa, repete os dois passos com o email dela. Para tirar alguém:
`delete from public.admins where email = '...';` — a conta continua a existir, mas deixa de
poder escrever.

> **Porquê o segundo passo?** O Supabase vem com o registo público ligado, por isso
> qualquer pessoa na internet pode criar uma conta no teu projeto. Se as permissões
> dissessem só "quem tiver sessão iniciada", essa pessoa passava a poder mudar resultados.
> Ter conta e ser da mesa são coisas diferentes, e é a tabela `admins` que as separa. Ao
> tentar gravar sem lá estar, a conta lê o placard e mais nada.

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
> A primeira migração monta tudo do zero. Se alguma vez montares a base de dados colando
> SQL à mão, o Supabase não fica a saber — diz-lhe primeiro que já está feito:
> ```bash
> supabase migration repair --status applied 20260722000001
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

1. **Guarda-redes** — já vêm no escalão certo, pelo ano de nascimento, e nunca mudam de
   escalão. Inscreve quem faltar e, nos escalões com dois grupos, reparte-os pelo Grupo A e
   o Grupo B (arrastar, ou setas).
2. **Formato** — confirma o formato de cada escalão (grupos, voltas, eliminatória) e gera o
   calendário. Só depois disto é que há jogos.

### O apito inicial

Estava marcado para uma hora e só arrancaram mais tarde? Em **Resultados**, carrega em
**Começar agora**. O calendário inteiro desloca-se, as horas voltam a bater certo e os
resultados já registados ficam. Também dá para marcar uma hora à mão.

### Durante

Na página **Resultados** está a baliza de cada campo, com o jogo que está a decorrer. O
árbitro diz quem ganhou, clicas no nome, e está feito. O site público actualiza-se em cerca
de um segundo.

- **O resultado em penáltis é opcional.** Só o vencedor é obrigatório. Mas vale a pena
  registá-lo quando o souberes: sem golos não há diferença de golos, e um empate a pontos
  entre três guarda-redes pode ficar sem critério de desempate.
- **Enganaste-te?** Clica no outro nome. A classificação e a eliminatória acertam-se
  sozinhas — e se o vencedor de uma meia deixar de fazer sentido, esse resultado é apagado
  em vez de ficar lá errado.
- **Guarda-redes atrasado?** Carrega em "Não chegou". O jogo troca de lugar com o seguinte
  daquela baliza. Se ainda não chegar, carregas outra vez.
- **"Já começou"** existe mas não é preciso. O site percebe sozinho o que está a decorrer
  (o primeiro jogo por decidir de cada baliza, passada a hora), por isso não tens de marcar
  nada. Só faz falta se um campo arrancar antes da hora e quiseres que ele acenda já.
- **Todos os jogos** — o torneio inteiro numa lista, para conferir e corrigir.

### Atrasos

O site **não** decide pelo relógio o que está a decorrer. Em cada baliza, o jogo a
decorrer é o primeiro que ainda não tem vencedor. Como registas os vencedores à medida
que acontecem, o site segue o campo real e absorve os atrasos sozinho. Compara depois a
jornada real com a do horário e mostra o atraso estimado.

### Empates sem desempate possível

Se três guarda-redes ganharem um ao outro em ciclo e não houver penáltis, nada os separa —
nenhum critério, e inventar uma ordem seria mentir. Nesse caso o site marca-os com `=`,
congela o apuramento e pede a decisão à mesa (sorteio, penáltis extra, o que decidirem).
Regista-se a ordem em **Guarda-redes**.

Critérios de desempate, por ordem:

1. Pontos (3 por vitória)
2. Confronto directo entre os empatados: pontos, depois diferença de golos, depois golos
3. Diferença de golos no grupo
4. Golos marcados no grupo
5. Decisão da mesa

---

## Quanta gente aguenta ao mesmo tempo

Duas coisas diferentes, com limites diferentes.

**Servir a página.** As páginas públicas são construídas uma vez e servidas a toda a
gente durante 3 segundos (`revalidate = 3`). Não lêem cookies, de propósito: é isso que
permite partilhá-las. Com centenas de telemóveis no recinto, a base de dados leva umas
poucas consultas por minuto em vez de umas centenas por segundo. Aguenta o recinto cheio à
vontade no plano gratuito.

**Actualizar sozinho.** O plano gratuito do Supabase permite
[200 ligações realtime em simultâneo](https://supabase.com/docs/guides/realtime/limits).
Acima disso, as pessoas caem na rede de segurança: a página pede-se a si mesma de ~25 em
~25 segundos. Ninguém fica com dados errados; uns sabem mais depressa do que outros.

> O plano Hobby da Vercel é para uso não comercial. Um torneio de um clube cai lá dentro,
> mas se houver patrocínios pagos convém confirmar.

## Testes

```bash
npm run check       # o motor: calendário, classificação, apuramentos, todos os formatos
npm run typecheck
npm run build
```

O `npm run check` monta escalões com cada combinação de formato (poule única e dois grupos,
uma e duas voltas, campeonato / só final / meias + final) e verifica que em nenhum instante
o site mente — nunca duas bolas na mesma baliza, nunca um guarda-redes em dois sítios à
mesma hora, os atrasos absorvidos, os apuramentos certos e os campeões a sair.

## Como está organizado

```
app/(site)/        site público
app/admin/         mesa (protegida por login)
lib/tournament.ts  o motor: calendário, classificação, apuramentos
supabase/          schema e seed
scripts/           verificações do motor
```

O `lib/tournament.ts` não sabe o que é uma base de dados nem um ecrã: recebe guarda-redes e
jogos e devolve calendário, classificação e apuramentos. É por isso que dá para o testar
todo sem levantar nada.
