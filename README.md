# School Breaktime Battle — Canteen Rush

A multiplayer, school-themed browser game. The host creates a room, students join with a
4-digit code, pick a character, and race out of class when the break bell rings: grab snacks
in the canteen, dodge the prefects, and get back to class before the final bell.

Version 1 contains one mode, **Canteen Rush**. No free chat — only preset reactions.

## Student Life (shared school world)

A second mode at `/life`, run entirely by students. Anyone can **start a school** (give it a
name, then pick their own name and 4-digit PIN) and gets a 6-character school code to share;
friends **join a school** with that code, a name and a PIN (no email or personal data).
Everyone in the school lives in the same world at the same time and can see each other.

**The school** (tap 🗺️ Map in the game to see it all, with "you are here"):

| Area | Places and what to do there |
| --- | --- |
| Outside, north | **School Farm** (water crops — job, pick oranges) · **Assembly Ground** (morning assembly) · **Sports Field** (penalty shootout, cheer from the stands) · **Basketball Court** (free throws) |
| Main Corridor | Lockers, notice board, water tap, chin-chin stall (job) |
| Middle row | **Classrooms A & B** (lessons, sweeping job) · **Science Lab** (experiments) · **Computer Lab** (coding, fix-the-computers job) · **Library** (study, comics, shelving job) · **Music & Art** (drums, painting) |
| South Corridor | Joins the south rooms |
| South row | **Canteen** (jollof, puff-puff, kitchen job) · **Common Room** (two games tables, table tennis, TV corner, music corner, sofa) · **Sick Bay** (big energy rest) · **School Shop** (buy clothes) · **School Bank** (savings) |
| Front Yard | **School Gate** (where you arrive, with the school's name on the sign) · **Tuck Shop** (Gala & Fanta) · **Running track** (100 m sprint) · **Ten-ten circle** · **Bus Stop** (catch the bus at Home Time) |

**The town** — catch the 🚌 bus from the school's Front Yard (any time, even after school) to the
neighbourhood: **Your Home** (your own room to decorate, a pet, a bed to sleep in), **Barber &
Salon**, **Supermarket & Furniture**, **Viewing Centre**, **Town Bank**, **Market** (Mama Put, fruit,
a stall to work at), **Mama's Bukka**, **Football Park** and the **Church & Mosque Square**. The bus
in the Bus Park takes you back. The town never closes.

**University:** each student picks a course (Computer Science, Accounting, Mass Communication,
Economics, Microbiology or Business Administration) and starts in **100 Level**. Lectures are named
by course code (e.g. *CSC 201 · Data Structures*). Each day's report card is a result on the
Nigerian 5-point scale (A = 5 … F = 0) that counts towards a **CGPA**; passing 3 days (E or better)
moves you up a level. After 400 Level you **graduate** with a degree class (First Class, Second Class
Upper/Lower, Third Class or Pass) and a ₦5,000 gift from family. Graduates stop getting pocket money
and instead work at the **Office Complex** in town (south of the Bus Park) in a job that fits their
course; pay depends on the degree class and grows with promotions. "My studies" (tap the 📝 grade
chip or the menu) shows your level, CGPA, results and job.

**Coming back every day:**
- **Daily streak:** the first visit each calendar day pays a bonus that grows every day in a row
  (₦200, ₦400 … ₦1,400, plus ₦1,000 on every 7th day).
- **Weekly events:** Family Sunday (double pocket money), Market Monday (half price at the market),
  Sports Wednesday (double XP from sports), Treat Thursday (half price at the bukka), Movie Friday
  (free viewing centre) and Super Saturday (jobs pay 50% more).
- **Your room and pet:** buy furniture at the furniture shop (it goes straight into your room), paint
  the walls, adopt a rabbit, cat, dog or parrot that follows you everywhere — and feed it every day.
  Visit classmates' rooms from your home.
- **Leaderboards:** level, savings, sports wins and best room in your school (migration 006 shares
  just these with classmates).
- **Walking directions:** tap a sign or a place on the 🗺️ map and your student walks there.

New clothes are bought at the School Shop (clothes you own can be changed anywhere), and money
goes in or out of savings at the School Bank.

- **School day:** 10 real minutes, the same for everyone because it is derived from the clock:
  Morning Assembly → Lesson 1 → Break → Lesson 2 → After School → Home Time (report card).
- **Needs:** Energy, Food, Fun and Friends slowly drop; activities refill them (rest on the
  sofa, jollof rice at the canteen, football, ludo, comics…). Lessons and studying raise the
  day's grade. Mood boosts how much you learn.
- **Daily goals:** 3 per student per day ("Attend 2 lessons", "Work a part-time job", "Put some
  money in savings"…), each paid in Naira.
- **Money (₦ Naira):** start with ₦1,500 and get ₦1,000 pocket money every morning. Earn more
  from part-time jobs (help at the canteen, shelve library books, sweep the classroom after
  school, sell chin-chin at the corridor stall — busier schools mean more customers), daily
  goals and a reward from home for an A/B/C report card. Up to 4 shifts a day; job pay rises
  with your level. Keep money in **savings** to earn 5% interest each night (up to ₦500). The
  wallet shows today's earnings and spending and a history of every transaction.
- **Sending money:** in the wallet's 💸 Send tab (or from Talk), send a classmate ₦50–₦5,000 with
  an optional note, up to ₦10,000 a day. It arrives instantly if they are at school, otherwise
  the next time they come in. Transfers are recorded in the database and each one is collected
  exactly once (`supabase/migrations/005_money_transfers.sql`).
- **Spending:** jollof rice ₦500, puff-puff ₦200, sharing a snack with a friend ₦200, clothes
  ₦500–₦2,500.
- **Wardrobe:** spend money on tops, colours, hairstyles and extras; classmates see your outfit.
- **Messages:** a message box (💬 Chat) for the whole school and private one-to-one chats. Messages
  are saved (last 150 per student) so people who were away can catch up, and appear instantly
  for everyone online; school messages also pop up in a speech bubble over the sender. Rude
  words are shown as `*****`, sending is limited to 8 messages per 20 seconds, and anyone can be
  muted.
- **Table games:** at the games table in the Common Room, play **Tic-tac-toe** or **Ayọ** (the
  Yoruba seed-sowing game) against the computer, or invite a classmate at school to play live.
  Games raise Fun (and Friends when played together) and count towards a daily goal.
- **Sports:** five playable mini-games, against the computer or a classmate (both get the same
  challenge and compare scores): ⚽ **penalty shootout** on the Sports Field, 🏀 **free throws** on
  the Basketball Court, 🏃 **100 m sprint** on the Front Yard track, 🏓 **table tennis** in the
  Common Room and 👣 **ten-ten** in the Front Yard. Matches cost energy, give fun and XP, count
  towards daily goals and build friendships.
- **Breaking the rules:** a few kinds of mischief, marked with red signs — play on your phone or
  eat snacks in class, copy someone's homework in the library, or skip class behind the farm shed.
  They're fun and quick, but a prefect might catch you (30–40% chance): fines, lost grades or 20
  seconds of detention in Classroom A. The report card shows a conduct grade, and three catches in
  a day means no reward from home.
- **Names:** any name up to 20 characters — accents, emoji and other scripts are all fine.
- **Friendships:** greetings, helping with homework in the library, sharing snacks, playing
  football and table games together build friendship levels.

Online, accounts, saves, messages and money transfers live in Supabase (`supabase/migrations/002`–`006`): PINs
are bcrypt-hashed in the database, 5 wrong PINs lock the name for 5 minutes, and the tables are
only reachable through functions that check a per-student session token. Positions and social
actions use Realtime broadcast on `life:{classCode}`. In demo mode the same rules run on
`localStorage`, so it can be tried across tabs of one browser.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Without Supabase keys the app runs in **demo mode** (a yellow banner says so):

- **Practice alone against bots** on the landing page starts a room with 3 bots.
- **Create Game Room** also works: open a second tab in the same browser, choose
  **Join With Code**, and the two tabs play together (they talk through `BroadcastChannel`).

Other commands:

```bash
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run test       # Vitest: rules, scoring, collision, bots
npm run e2e        # Browser tests (run `npm run build` first)
```

### Browser tests

`npm run e2e` plays the real site in a headless browser: Breaktime Battle (multiplayer, practice,
phone/tablet layouts) and Student Life (school, money transfers, chat and table games, every sport,
player-vs-player, the town and Food Court, mischief). If nothing is running on port 3100 it starts
the built site itself. Each test prints ✓/✗ checks and the run ends with a summary; screenshots go
to `e2e/.out/` (not committed).

- Run some tests only: `npm run e2e -- life-town battle` (matches file names in `e2e/specs/`).
- First time on a new machine: `npx playwright install chromium`.
- Settings: `E2E_BASE_URL` (another server), `CHROMIUM_PATH` (use an installed Chromium), `E2E_OUT`.
- Without Supabase keys the game keeps schools in the browser, so each test runs its students as
  tabs of one browser. Several game tabs at once are heavy for a small machine, so two-player
  tests allow generous waits, and the runner retries a failed test once (the summary says so).

## Online multiplayer (Supabase)

1. Create a Supabase project.
2. Run the files in `supabase/migrations/` (001–006) in order in the SQL editor.
3. Copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

4. Restart `npm run dev`. The demo banner disappears and rooms work across devices.

Realtime uses Supabase **broadcast** on the channel `room:{roomCode}`; no table replication is
needed. Tables store rooms, players and match results (writes are best-effort and never block a
match). The RLS policies in the migration allow anonymous read/write of game records only — fine
for a school event, but tighten them before wider use.

**Message volume:** the host broadcasts a snapshot ~8×/s and each moving student sends its
position ~9×/s. A full 8-player room is well within paid-plan limits; on the free plan, keep an
eye on Realtime quotas or lower the rates in `lib/realtime/sync.ts`.

## Deploying to Vercel

Import this repository in Vercel (the app is at the repository root, so leave **Root
Directory** empty), and add the two environment variables above.

## How it works

### Host-authoritative multiplayer

- The host's browser runs the simulation (`HostRuntime`): timer, snack and power-up spawning,
  prefect patrols, bots, collisions and scoring. It broadcasts a `game_state` snapshot with the
  batched gameplay events (`snack_collected`, `powerup_collected`, `player_caught`, …).
- Each student's browser (`ClientRuntime`) moves its own character locally for instant
  response, sends `player_moved`, and draws everyone else smoothly from the snapshots.
- The lobby is also host-authoritative: `join_request` → `lobby_state` or `join_rejected`
  (room full, already started, duplicate or rude name).
- Heartbeats mark inactive students (the host can remove them) and show
  "Host disconnected." to students if the host goes quiet. There is no host migration in V1;
  if the host reloads mid-match, everyone returns to the lobby.
- Reloading a student tab reconnects to the room using the per-tab session.

### Code map

```
app/                      Pages: landing, create, join, lobby, game, results
components/ui             Button, Card, Input/Select, Badge
components/game           GameCanvas (Phaser), HUD, overlays, controls, reactions, leaderboard
components/lobby          Character select, player list
lib/game/engine.ts        Pure game rules (no Phaser/React) — shared by host, bots and tests
lib/game/map.ts           Zones, walls, obstacles, spawn points, prefect routes
lib/game/scoring.ts       Points, ranking and results
lib/game/bots.ts          Demo bots (doorway path-finding, prefect dodging)
lib/game/runtime.ts       Host and client match loops
lib/game/phaser/          The Phaser scene that draws the runtime
lib/realtime/             Event types, Supabase/BroadcastChannel transports, sync rates
lib/room/                 Room client (lobby protocol) and room/result persistence
store/gameStore.ts        Zustand store the React UI reads
supabase/migrations/      Database schema
```

## Game rules (V1)

| Event | Points |
| --- | --- |
| Biscuit / Chin Chin / Puff Puff / Zobo | 5 / 8 / 10 / 12 |
| Meat Pie / Indomie Bowl / Special Lunch Pack | 20 / 30 / 50 |
| Return to class (after at least one snack, once) | +25 |
| Caught by a prefect (and frozen 2 s) | −20 |
| Bump an obstacle (chair, bag, blocked path) | −5 |
| Outside class when the final bell rings | −30 |
| First time reaching the canteen | +5 |
| Snack streak (every 3rd snack within 4 s of the last) | +5 |
| Never caught, at least one snack (at the bell) | +10 |
| Entering the Staff Room | −10 |

Scores never go below zero. Ties are broken by fewer captures, then more snacks, then earliest
return to class. The extra rows after the main table cover the "reaching the canteen",
"streak", "avoiding prefects" and "restricted zone" items from the design brief; all values
live in `lib/game/constants.ts`.

**Power-ups:** Speed Shoes (faster for 5 s), Prefect Shield (blocks one capture),
Double Points (8 s). They apply as soon as they are picked up.

**Characters:** Fast Runner (+15% speed), Snack Lover (+2 per snack), Class Captain (starts
with a shield), Bookworm (power-ups last 30% longer), Football Boy (shorter stun after
obstacles), Quiet Genius (less slowed by spilled water and crowds).

**Controls:** arrow keys or WASD; on touch screens a large movement pad (it floats over the
game when a phone is held sideways). On small screens the camera zooms in and follows you.

## Sounds

Every effect has a built-in fallback tone, so no audio files are required. See
`public/sounds/README.md` to add real MP3s.

## Not in V1

Free chat, voice/video, more maps and the other planned modes
(Dodge the Prefect, Beat the Bell, Snack War, Lost Notebook Mission, Classroom Escape).
