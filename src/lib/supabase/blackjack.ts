"use client";

import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase/client";

export type Suit = "S" | "H" | "D" | "C";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type PlayingCard = { suit: Suit; rank: Rank };
export type PlayerHand = {
  user_id: string;
  display_name: string;
  cards: PlayingCard[];
  bet: number;
  ready?: boolean;
  insurance_bet?: number;
  status: "playing" | "stood" | "bust" | "done";
  result?: "win" | "loss" | "push" | "blackjack";
  payout?: number;
};
export type BlackjackTableState = {
  round_id: string;
  deck: PlayingCard[];
  dealer: PlayingCard[];
  players: Record<string, PlayerHand>;
  status: "waiting" | "playing" | "settled";
  betting_deadline_at?: string;
  updated_at: string;
};
export type BlackjackBalance = {
  squad_id: string;
  user_id: string;
  chips: number;
  last_daily_grant_date: string | null;
  last_objective_bonus_date: string | null;
  updated_at: string;
};
export type WeeklyResult = {
  squad_id: string;
  week_start: string;
  user_id: string;
  chips: number;
  rank: number;
  captured_at: string;
};

const SUITS: Suit[] = ["S", "H", "D", "C"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const DEFAULT_BET = 50;
const E2E_AUTH_KEY = "blackjacked.e2eAuth";
const E2E_BLACKJACK_KEY = "blackjacked.e2eBlackjack";
const E2E_USER_ID = "00000000-0000-4000-8000-000000000001";

type E2EBlackjackState = {
  tables: Record<string, BlackjackTableState>;
  balances: BlackjackBalance[];
  weeklyResults: WeeklyResult[];
};

function webCrypto() {
  return typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
}

function randomBytes(length: number) {
  const values = new Uint8Array(length);
  const cryptoApi = webCrypto();
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(values);
    return values;
  }

  for (let index = 0; index < values.length; index += 1) {
    values[index] = Math.floor(Math.random() * 256);
  }
  return values;
}

function randomUint32Array(length: number) {
  const values = new Uint32Array(length);
  const cryptoApi = webCrypto();
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(values);
    return values;
  }

  for (let index = 0; index < values.length; index += 1) {
    values[index] = Math.floor(Math.random() * 0xffffffff);
  }
  return values;
}

function randomId() {
  const cryptoApi = webCrypto();
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();

  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function emptyTable(): BlackjackTableState {
  return {
    round_id: randomId(),
    deck: [],
    dealer: [],
    players: {},
    status: "waiting",
    updated_at: new Date().toISOString(),
  };
}

function freshDeck() {
  const deck = SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));
  const bytes = randomUint32Array(deck.length);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = bytes[i] % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function draw(deck: PlayingCard[], count: number) {
  return { cards: deck.slice(0, count), deck: deck.slice(count) };
}

export function scoreHand(cards: PlayingCard[]) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") {
      aces += 1;
      total += 11;
    } else if (["K", "Q", "J"].includes(card.rank)) total += 10;
    else total += Number(card.rank);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

export function handResult(player: PlayingCard[], dealer: PlayingCard[]) {
  const p = scoreHand(player);
  const d = scoreHand(dealer);
  if (p > 21) return "loss" as const;
  if (p === 21 && player.length === 2 && !(d === 21 && dealer.length === 2)) return "blackjack" as const;
  if (d > 21) return "win" as const;
  if (d === 21 && dealer.length === 2 && !(p === 21 && player.length === 2)) return "loss" as const;
  if (p > d) return "win" as const;
  if (d > p) return "loss" as const;
  return "push" as const;
}

function payoutFor(result: PlayerHand["result"], bet: number, insuranceBet: number, dealer: PlayingCard[]) {
  const dealerBlackjack = scoreHand(dealer) === 21 && dealer.length === 2;
  const insuranceReturn = insuranceBet > 0 && dealerBlackjack ? insuranceBet * 3 : 0;
  if (result === "blackjack") return Math.floor(bet * 2.5) + insuranceReturn;
  if (result === "win") return bet * 2 + insuranceReturn;
  if (result === "push") return bet + insuranceReturn;
  return insuranceReturn;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function canUseE2EAuthBypass() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const isLocalhost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  return (
    typeof window !== "undefined" &&
    isLocalhost &&
    (localStorage.getItem(E2E_AUTH_KEY) === "1" || search.includes("__e2eAuth=1"))
  );
}

function readE2EBlackjack(): E2EBlackjackState {
  if (typeof window === "undefined") return { tables: {}, balances: [], weeklyResults: [] };
  const raw = localStorage.getItem(E2E_BLACKJACK_KEY);
  return raw ? (JSON.parse(raw) as E2EBlackjackState) : { tables: {}, balances: [], weeklyResults: [] };
}

function writeE2EBlackjack(state: E2EBlackjackState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(E2E_BLACKJACK_KEY, JSON.stringify(state));
}

export function currentWeekStart(date = new Date()) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  return copy.toISOString().slice(0, 10);
}

export function previousWeekStart(date = new Date()) {
  const start = new Date(`${currentWeekStart(date)}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - 7);
  return start.toISOString().slice(0, 10);
}

async function getUserId() {
  if (canUseE2EAuthBypass()) return E2E_USER_ID;
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in to play blackjack.");
  return data.user.id;
}

async function saveTable(squadId: string, state: BlackjackTableState) {
  if (canUseE2EAuthBypass()) {
    const e2e = readE2EBlackjack();
    const next = { ...state, updated_at: new Date().toISOString() };
    writeE2EBlackjack({ ...e2e, tables: { ...e2e.tables, [squadId]: next } });
    return next;
  }
  const supabase = getSupabaseBrowser();
  const next = { ...state, updated_at: new Date().toISOString() };
  const { error } = await supabase
    .from("squad_blackjack_tables")
    .upsert({ squad_id: squadId, state: next, updated_at: next.updated_at });
  if (error) throw error;
  return next;
}

export async function loadBlackjackState(squadId: string) {
  if (canUseE2EAuthBypass()) {
    const e2e = readE2EBlackjack();
    return {
      table: e2e.tables[squadId] ?? emptyTable(),
      balances: e2e.balances.filter((balance) => balance.squad_id === squadId),
      weeklyResults: e2e.weeklyResults.filter((result) => result.squad_id === squadId),
    };
  }
  if (!isSupabaseConfigured()) {
    return { table: emptyTable(), balances: [] as BlackjackBalance[], weeklyResults: [] as WeeklyResult[] };
  }
  const supabase = getSupabaseBrowser();
  const [tableResult, balancesResult, weeklyResult] = await Promise.all([
    supabase.from("squad_blackjack_tables").select("*").eq("squad_id", squadId).maybeSingle(),
    supabase.from("squad_blackjack_balances").select("*").eq("squad_id", squadId).order("chips", { ascending: false }),
    supabase
      .from("squad_blackjack_weekly_results")
      .select("*")
      .eq("squad_id", squadId)
      .eq("week_start", previousWeekStart())
      .order("rank", { ascending: true }),
  ]);
  if (tableResult.error) throw tableResult.error;
  if (balancesResult.error) throw balancesResult.error;
  if (weeklyResult.error) throw weeklyResult.error;
  return {
    table: ((tableResult.data?.state as BlackjackTableState | null) ?? emptyTable()),
    balances: (balancesResult.data ?? []) as BlackjackBalance[],
    weeklyResults: (weeklyResult.data ?? []) as WeeklyResult[],
  };
}

export async function ensureBlackjackBalance(
  squadId: string,
  objectivesDone: boolean,
) {
  if (canUseE2EAuthBypass()) {
    const userId = E2E_USER_ID;
    const today = todayKey();
    const e2e = readE2EBlackjack();
    const current = e2e.balances.find((balance) => balance.squad_id === squadId && balance.user_id === userId);
    const dailyGrant = current?.last_daily_grant_date === today ? 0 : 100;
    const objectiveGrant = objectivesDone && current?.last_objective_bonus_date !== today ? 100 : 0;
    const next: BlackjackBalance = {
      squad_id: squadId,
      user_id: userId,
      chips: (current?.chips ?? 1000) + dailyGrant + objectiveGrant,
      last_daily_grant_date: dailyGrant ? today : current?.last_daily_grant_date ?? null,
      last_objective_bonus_date: objectiveGrant ? today : current?.last_objective_bonus_date ?? null,
      updated_at: new Date().toISOString(),
    };
    writeE2EBlackjack({
      ...e2e,
      balances: [
        ...e2e.balances.filter((balance) => !(balance.squad_id === squadId && balance.user_id === userId)),
        next,
      ],
    });
    return;
  }
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseBrowser();
  const userId = await getUserId();
  const today = todayKey();
  const { data, error } = await supabase
    .from("squad_blackjack_balances")
    .select("*")
    .eq("squad_id", squadId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  const current = data as BlackjackBalance | null;
  const baseChips = current?.chips ?? 1000;
  const dailyGrant = current?.last_daily_grant_date === today ? 0 : 100;
  const objectiveGrant =
    objectivesDone && current?.last_objective_bonus_date !== today ? 100 : 0;
  const next = {
    squad_id: squadId,
    user_id: userId,
    chips: baseChips + dailyGrant + objectiveGrant,
    last_daily_grant_date: dailyGrant ? today : current?.last_daily_grant_date,
    last_objective_bonus_date: objectiveGrant ? today : current?.last_objective_bonus_date,
    updated_at: new Date().toISOString(),
  };
  const { error: upsertError } = await supabase
    .from("squad_blackjack_balances")
    .upsert(next, { onConflict: "squad_id,user_id" });
  if (upsertError) throw upsertError;
}

export async function capturePreviousWeekResults(squadId: string) {
  if (canUseE2EAuthBypass()) return;
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseBrowser();
  const weekStart = previousWeekStart();
  const { data: existing, error: existingError } = await supabase
    .from("squad_blackjack_weekly_results")
    .select("user_id")
    .eq("squad_id", squadId)
    .eq("week_start", weekStart)
    .limit(1);
  if (existingError) throw existingError;
  if (existing && existing.length > 0) return;

  const { data: balances, error } = await supabase
    .from("squad_blackjack_balances")
    .select("*")
    .eq("squad_id", squadId)
    .order("chips", { ascending: false });
  if (error) throw error;

  const rows = ((balances ?? []) as BlackjackBalance[]).map((balance, index) => ({
    squad_id: squadId,
    week_start: weekStart,
    user_id: balance.user_id,
    chips: balance.chips,
    rank: index + 1,
  }));
  if (rows.length === 0) return;
  const { error: insertError } = await supabase
    .from("squad_blackjack_weekly_results")
    .upsert(rows, { onConflict: "squad_id,week_start,user_id" });
  if (insertError) throw insertError;
}

export async function joinBlackjackRound(squadId: string, displayName: string) {
  const userId = await getUserId();
  const { table, balances } = await loadBlackjackState(squadId);
  const baseTable = table.status === "settled" ? emptyTable() : table;
  const chips = balances.find((balance) => balance.user_id === userId)?.chips ?? 1000;
  const bet = Math.min(DEFAULT_BET, Math.max(0, chips));
  const isFreshWaitingTable = baseTable.status === "waiting" && Object.keys(baseTable.players).length === 0;
  const next: BlackjackTableState = {
    ...baseTable,
    betting_deadline_at:
      baseTable.betting_deadline_at ??
      (isFreshWaitingTable ? new Date(Date.now() + 15_000).toISOString() : undefined),
    players: {
      ...baseTable.players,
      [userId]: baseTable.players[userId] ?? {
        user_id: userId,
        display_name: displayName,
        cards: [],
        bet,
        ready: false,
        insurance_bet: 0,
        status: "playing",
      },
    },
    status: baseTable.status,
  };
  return saveTable(squadId, next);
}

export async function updateBlackjackBet(squadId: string, bet: number) {
  const userId = await getUserId();
  const { table, balances } = await loadBlackjackState(squadId);
  const player = table.players[userId];
  if (!player || table.status === "playing") return table;
  const chips = balances.find((balance) => balance.user_id === userId)?.chips ?? 1000;
  const safeBet = Math.max(10, Math.min(Math.floor(bet), chips));
  return saveTable(squadId, {
    ...table,
    players: {
      ...table.players,
      [userId]: { ...player, bet: safeBet, ready: true, insurance_bet: 0 },
    },
  });
}

export async function dealBlackjackRound(squadId: string, members: Record<string, string>) {
  const { table, balances } = await loadBlackjackState(squadId);
  if (table.status !== "waiting") return table;
  const balanceMap = new Map(balances.map((balance) => [balance.user_id, balance.chips]));
  const readyEntries = Object.entries(table.players).filter(([, player]) => player.ready);
  if (readyEntries.length === 0) return table;
  let deck = freshDeck();
  const players: Record<string, PlayerHand> = {};
  const reservedBets: Record<string, number> = {};
  for (const [userId, existing] of readyEntries) {
    const chips = balanceMap.get(userId) ?? 1000;
    const safeBet = Math.max(0, Math.min(existing.bet || DEFAULT_BET, chips));
    if (safeBet < 10) continue;
    const hand = draw(deck, 2);
    deck = hand.deck;
    reservedBets[userId] = safeBet;
    players[userId] = {
      user_id: userId,
      display_name: members[userId] ?? existing.display_name,
      cards: hand.cards,
      bet: safeBet,
      ready: true,
      insurance_bet: 0,
      status: scoreHand(hand.cards) === 21 ? "stood" : "playing",
    };
  }
  if (Object.keys(players).length === 0) return table;
  await applyBlackjackBalanceDeltas(
    squadId,
    Object.entries(reservedBets).map(([userId, bet]) => ({ userId, delta: -bet })),
  );
  const dealerDraw = draw(deck, 2);
  return saveTable(squadId, {
    round_id: randomId(),
    deck: dealerDraw.deck,
    dealer: dealerDraw.cards,
    players,
    status: "playing",
    betting_deadline_at: undefined,
    updated_at: new Date().toISOString(),
  });
}

export async function takeInsurance(squadId: string) {
  const userId = await getUserId();
  const { table, balances } = await loadBlackjackState(squadId);
  const player = table.players[userId];
  const dealerShowsAce = table.dealer[0]?.rank === "A";
  if (!player || table.status !== "playing" || !dealerShowsAce) return table;
  const chips = balances.find((balance) => balance.user_id === userId)?.chips ?? 1000;
  const insuranceBet = Math.min(Math.floor(player.bet / 2), Math.max(0, chips));
  if (insuranceBet <= 0) return table;
  await applyBlackjackBalanceDeltas(squadId, [{ userId, delta: -insuranceBet }]);
  return saveTable(squadId, {
    ...table,
    players: {
      ...table.players,
      [userId]: { ...player, insurance_bet: insuranceBet },
    },
  });
}

export async function hitBlackjack(squadId: string) {
  const userId = await getUserId();
  const { table } = await loadBlackjackState(squadId);
  const player = table.players[userId];
  if (!player || player.status !== "playing") return table;
  const nextDraw = draw(table.deck, 1);
  const cards = [...player.cards, ...nextDraw.cards];
  const nextPlayer: PlayerHand = {
    ...player,
    cards,
    status: scoreHand(cards) > 21 ? "bust" : "playing",
  };
  return saveTable(squadId, {
    ...table,
    deck: nextDraw.deck,
    players: { ...table.players, [userId]: nextPlayer },
  });
}

export async function doubleBlackjack(squadId: string) {
  const userId = await getUserId();
  const { table, balances } = await loadBlackjackState(squadId);
  const player = table.players[userId];
  if (!player || player.status !== "playing" || player.cards.length !== 2) return table;
  const chips = balances.find((balance) => balance.user_id === userId)?.chips ?? 1000;
  const extraBet = Math.min(player.bet, chips);
  if (extraBet <= 0) return table;
  const nextBet = player.bet + extraBet;
  const nextDraw = draw(table.deck, 1);
  const cards = [...player.cards, ...nextDraw.cards];
  await applyBlackjackBalanceDeltas(squadId, [{ userId, delta: -extraBet }]);
  return saveTable(squadId, {
    ...table,
    deck: nextDraw.deck,
    players: {
      ...table.players,
      [userId]: {
        ...player,
        bet: nextBet,
        cards,
        status: scoreHand(cards) > 21 ? "bust" : "stood",
      },
    },
  });
}

export async function standBlackjack(squadId: string) {
  const userId = await getUserId();
  const { table } = await loadBlackjackState(squadId);
  const player = table.players[userId];
  if (!player) return table;
  return saveTable(squadId, {
    ...table,
    players: { ...table.players, [userId]: { ...player, status: "stood" } },
  });
}

export async function settleBlackjackRound(squadId: string) {
  const { table } = await loadBlackjackState(squadId);
  if (table.status !== "playing") return table;
  let deck = table.deck;
  let dealer = table.dealer;
  while (scoreHand(dealer) < 17) {
    const next = draw(deck, 1);
    deck = next.deck;
    dealer = [...dealer, ...next.cards];
  }
  const players = Object.fromEntries(
    Object.entries(table.players).map(([userId, player]) => {
      const result = handResult(player.cards, dealer);
      return [
        userId,
        {
          ...player,
          status: "done" as const,
          result,
          payout: payoutFor(result, player.bet, player.insurance_bet ?? 0, dealer),
        },
      ];
    }),
  );
  const settled = await saveTable(squadId, {
    ...table,
    deck,
    dealer,
    players,
    status: "settled",
  });
  await applyBlackjackPayouts(squadId, Object.values(players));
  return settled;
}

export async function advanceDealerBlackjack(squadId: string) {
  const { table } = await loadBlackjackState(squadId);
  if (table.status !== "playing") return table;
  const players = Object.values(table.players);
  const dealerCanPlay =
    players.length > 0 &&
    players.every((player) => ["stood", "bust", "done"].includes(player.status));
  if (!dealerCanPlay) return table;

  if (scoreHand(table.dealer) < 17) {
    const next = draw(table.deck, 1);
    return saveTable(squadId, {
      ...table,
      deck: next.deck,
      dealer: [...table.dealer, ...next.cards],
    });
  }

  return settleBlackjackRound(squadId);
}

async function applyBlackjackPayouts(squadId: string, players: PlayerHand[]) {
  await applyBlackjackBalanceDeltas(
    squadId,
    players.map((player) => ({ userId: player.user_id, delta: player.payout ?? 0 })),
  );
}

async function applyBlackjackBalanceDeltas(
  squadId: string,
  deltas: Array<{ userId: string; delta: number }>,
) {
  if (canUseE2EAuthBypass()) {
    const e2e = readE2EBlackjack();
    const totals = new Map<string, number>();
    for (const { userId, delta } of deltas) {
      totals.set(userId, (totals.get(userId) ?? 0) + delta);
    }
    const existing = new Map(
      e2e.balances
        .filter((balance) => balance.squad_id === squadId)
        .map((balance) => [balance.user_id, balance]),
    );
    const changedRows = Array.from(totals.entries()).map(([userId, delta]) => {
      const current = existing.get(userId);
      return {
        squad_id: squadId,
        user_id: userId,
        chips: Math.max(0, (current?.chips ?? 1000) + delta),
        last_daily_grant_date: current?.last_daily_grant_date ?? null,
        last_objective_bonus_date: current?.last_objective_bonus_date ?? null,
        updated_at: new Date().toISOString(),
      };
    });
    writeE2EBlackjack({
      ...e2e,
      balances: [
        ...e2e.balances.filter(
          (balance) =>
            balance.squad_id !== squadId ||
            !changedRows.some((row) => row.user_id === balance.user_id),
        ),
        ...changedRows,
      ],
    });
    return;
  }
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("squad_blackjack_balances")
    .select("*")
    .eq("squad_id", squadId);
  if (error) throw error;
  const balances = new Map(((data ?? []) as BlackjackBalance[]).map((row) => [row.user_id, row]));
  const totals = new Map<string, number>();
  for (const { userId, delta } of deltas) {
    totals.set(userId, (totals.get(userId) ?? 0) + delta);
  }
  const rows = Array.from(totals.entries()).map(([userId, delta]) => {
    const current = balances.get(userId);
    return {
      squad_id: squadId,
      user_id: userId,
      chips: Math.max(0, (current?.chips ?? 1000) + delta),
      last_daily_grant_date: current?.last_daily_grant_date ?? null,
      last_objective_bonus_date: current?.last_objective_bonus_date ?? null,
      updated_at: new Date().toISOString(),
    };
  });
  if (rows.length === 0) return;
  const { error: upsertError } = await supabase
    .from("squad_blackjack_balances")
    .upsert(rows, { onConflict: "squad_id,user_id" });
  if (upsertError) throw upsertError;
}

export async function leaveBlackjackTable(squadId: string) {
  const userId = await getUserId();
  const { table } = await loadBlackjackState(squadId);
  const otherPlayers = Object.fromEntries(
    Object.entries(table.players).filter(([playerId]) => playerId !== userId),
  );
  const hasOtherLivePlayers =
    table.status === "playing" &&
    Object.values(otherPlayers).some((player) => player.cards.length > 0 && player.status !== "done");

  if (!hasOtherLivePlayers) {
    return saveTable(squadId, emptyTable());
  }

  const current = table.players[userId];
  if (!current) return table;
  return saveTable(squadId, {
    ...table,
    players: {
      ...table.players,
      [userId]: current.status === "playing" ? { ...current, status: "stood" } : current,
    },
  });
}

export function subscribeToBlackjack(squadId: string, onChange: () => void) {
  if (canUseE2EAuthBypass()) return () => undefined;
  if (!isSupabaseConfigured()) return () => undefined;
  const supabase = getSupabaseBrowser();
  const suffix = randomId();
  const channel = supabase
    .channel(`blackjack-table:${squadId}:${suffix}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "squad_blackjack_tables", filter: `squad_id=eq.${squadId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "squad_blackjack_balances", filter: `squad_id=eq.${squadId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "squad_blackjack_weekly_results", filter: `squad_id=eq.${squadId}` },
      onChange,
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
