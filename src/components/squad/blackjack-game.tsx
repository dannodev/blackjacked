"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { RotateCcw, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SquadMemberRow } from "@/lib/supabase/squad";
import {
  advanceDealerBlackjack,
  capturePreviousWeekResults,
  currentWeekStart,
  dealBlackjackRound,
  doubleBlackjack,
  ensureBlackjackBalance,
  hitBlackjack,
  joinBlackjackRound,
  leaveBlackjackTable,
  loadBlackjackState,
  scoreHand,
  standBlackjack,
  subscribeToBlackjack,
  takeInsurance,
  updateBlackjackBet,
  type BlackjackBalance,
  type BlackjackTableState,
  type PlayingCard,
} from "@/lib/supabase/blackjack";
import { toast } from "sonner";

const BETTING_SECONDS = 15;

function emptyTable(): BlackjackTableState {
  return {
    round_id: "empty",
    deck: [],
    dealer: [],
    players: {},
    status: "waiting",
    updated_at: new Date().toISOString(),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function CardFace({
  card,
  hidden,
  compact,
}: {
  card?: PlayingCard;
  hidden?: boolean;
  compact?: boolean;
}) {
  const isRed = card?.suit === "H" || card?.suit === "D";

  return (
    <div
      className={`blackjack-card-deal flex shrink-0 flex-col justify-between rounded-xl border border-white/10 bg-white p-2 text-black shadow-lg ${
        compact ? "h-14 w-10" : "h-16 w-12 sm:h-20 sm:w-14"
      }`}
    >
      {hidden || !card ? (
        <div className="grid h-full place-items-center rounded-lg bg-[var(--rosso)] text-[9px] font-black text-white">
          BJ
        </div>
      ) : (
        <>
          <p className={`font-heading font-black ${compact ? "text-[10px]" : "text-xs"}`}>{card.rank}</p>
          <p className={`text-right font-bold ${isRed ? "text-red-600" : "text-black"} ${compact ? "text-[9px]" : "text-[10px]"}`}>
            {card.suit}
          </p>
        </>
      )}
    </div>
  );
}

function DeckStack() {
  return (
    <div className="blackjack-deck-stack" aria-label="Dealer deck">
      <CardFace hidden />
      <CardFace hidden />
      <CardFace hidden />
    </div>
  );
}

function BetTimerRing({ secondsLeft }: { secondsLeft: number }) {
  const progress = Math.max(0, Math.min(1, secondsLeft / BETTING_SECONDS));
  return (
    <div
      className="blackjack-timer-ring"
      style={{ "--bet-progress": `${progress * 360}deg` } as CSSProperties}
      aria-label={`${secondsLeft} seconds left to bet`}
    >
      <span>{secondsLeft}</span>
    </div>
  );
}

function RotatePrompt() {
  return (
    <div className="blackjack-rotate-prompt">
      <div className="rounded-[1.5rem] border border-white/12 bg-[#111217]/95 p-5 text-center shadow-2xl">
        <RotateCcw className="mx-auto mb-3 size-7 text-[var(--rosso-light)]" />
        <p className="font-heading text-lg font-black">Rotate your phone</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Blackjack works better in landscape so cards, chips, and seats have room.
        </p>
      </div>
    </div>
  );
}

export function BlackjackGame({
  squadId,
  members,
  objectivesDone,
  onClose,
}: {
  squadId: string;
  members: SquadMemberRow[];
  objectivesDone: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [table, setTable] = useState<BlackjackTableState>(() => emptyTable());
  const [balances, setBalances] = useState<BlackjackBalance[]>([]);
  const [betDraft, setBetDraft] = useState(50);
  const [entered, setEntered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revealedRoundId, setRevealedRoundId] = useState<string | null>(null);
  const [dealerRevealingRoundId, setDealerRevealingRoundId] = useState<string | null>(null);
  const [betSecondsLeft, setBetSecondsLeft] = useState(BETTING_SECONDS);

  const memberNames = useMemo(
    () => Object.fromEntries(members.map((member) => [member.user_id, member.display_name])),
    [members],
  );
  const displayName = user?.id ? memberNames[user.id] ?? user.name ?? "Player" : "Player";
  const myHand = user?.id ? table.players[user.id] : undefined;
  const allJoined = Object.values(table.players);
  const showSettledRound = table.status === "settled" && revealedRoundId === table.round_id;
  const visibleRound = table.status === "playing" || table.status === "waiting" || showSettledRound;
  const tablePlayers = visibleRound ? allJoined.slice(0, 4) : [];
  const dealerCanReveal =
    showSettledRound ||
    (table.status === "playing" && dealerRevealingRoundId === table.round_id);

  const refresh = useCallback(async () => {
    const next = await loadBlackjackState(squadId);
    setTable(next.table);
    setBalances(next.balances);
  }, [squadId]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        await ensureBlackjackBalance(squadId, objectivesDone);
        await capturePreviousWeekResults(squadId);
        if (!cancelled) await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not open blackjack");
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [objectivesDone, refresh, squadId]);

  useEffect(() => subscribeToBlackjack(squadId, refresh), [refresh, squadId]);

  useEffect(() => {
    if (table.status !== "waiting" || !table.betting_deadline_at) {
      setBetSecondsLeft(BETTING_SECONDS);
      return;
    }

    const deadline = new Date(table.betting_deadline_at).getTime();
    const tick = () => setBetSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [table.betting_deadline_at, table.status]);

  useEffect(() => {
    if (!entered || busy || table.status !== "waiting" || !table.betting_deadline_at || betSecondsLeft > 0) return;
    const hasReadyPlayers = Object.values(table.players).some((player) => player.ready);
    let cancelled = false;

    async function closeBettingWindow() {
      setBusy(true);
      try {
        if (hasReadyPlayers) {
          const next = await dealBlackjackRound(squadId, memberNames);
          if (!cancelled) setTable(next);
        } else {
          await leaveBlackjackTable(squadId);
          if (!cancelled) setEntered(false);
        }
        if (!cancelled) await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Blackjack action failed");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void closeBettingWindow();
    return () => {
      cancelled = true;
    };
  }, [betSecondsLeft, busy, entered, memberNames, refresh, squadId, table.betting_deadline_at, table.players, table.status]);

  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Blackjack action failed");
    } finally {
      setBusy(false);
    }
  }

  function nameFor(userId: string) {
    return memberNames[userId] ?? table.players[userId]?.display_name ?? "Player";
  }

  function chipsFor(userId: string) {
    return balances.find((balance) => balance.user_id === userId)?.chips ?? 1000;
  }

  async function runDealerSequence(startTable: BlackjackTableState) {
    const players = Object.values(startTable.players);
    if (
      players.length === 0 ||
      startTable.status !== "playing" ||
      !players.every((player) => ["stood", "bust", "done"].includes(player.status))
    ) {
      return;
    }

    setTable(startTable);
    await sleep(650);
    setDealerRevealingRoundId(startTable.round_id);

    let current = startTable;
    while (current.status === "playing") {
      const next = await advanceDealerBlackjack(squadId);
      setTable(next);
      if (next.status === "settled") {
        setRevealedRoundId(next.round_id);
        setDealerRevealingRoundId(null);
        break;
      }
      current = next;
      await sleep(700);
    }
  }

  async function closeTable() {
    setBusy(true);
    try {
      await leaveBlackjackTable(squadId);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not close blackjack");
    } finally {
      setBusy(false);
    }
  }

  const dealerShowsAce = table.status === "playing" && table.dealer[0]?.rank === "A";
  const myChips = user?.id ? chipsFor(user.id) : 1000;
  const canDouble = table.status === "playing" && myHand?.status === "playing" && myHand.cards.length === 2;
  const betOptions = [50, 100, 200, 500, 1000].filter((value) => value <= myChips);
  const dealerScore = table.dealer.length > 0 ? scoreHand(table.dealer) : null;
  const dealerLabel =
    table.status === "playing" && !dealerCanReveal ? "Hidden" : dealerScore ?? "Ready";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 backdrop-blur-md sm:p-3">
      <RotatePrompt />
      <Card className="blackjack-modal max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[1.5rem] border-white/10 bg-[#0f1013]">
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--rosso-light)]">
                Squad casino
              </p>
              <h2 className="font-heading text-xl font-black">Blackjack table</h2>
              <p className="text-xs text-muted-foreground">
                {myChips} chips available · weekly race closes Sunday 11:59.
              </p>
            </div>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-full border border-white/10 text-muted-foreground"
              onClick={closeTable}
              aria-label="Close blackjack"
            >
              <X className="size-4" />
            </button>
          </div>

          {!entered && (
            <Button
              className="w-full bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
              disabled={busy}
              onClick={() =>
                action(async () => {
                  const next = await joinBlackjackRound(squadId, displayName);
                  setTable(next);
                  setEntered(true);
                })
              }
            >
              Enter table
            </Button>
          )}

          <div className="blackjack-stage">
            <div className="blackjack-table blackjack-hex-table">
              <div className="blackjack-dealer-zone">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">Dealer</p>
                  <p className="font-heading text-lg font-black text-white">{dealerLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex min-h-16 items-center gap-1">
                    {table.status === "playing" || showSettledRound ? (
                      table.dealer.map((card, index) => (
                        <CardFace
                          key={`${card.rank}-${card.suit}-${index}`}
                          card={card}
                          compact
                          hidden={table.status === "playing" && !dealerCanReveal && index === 1}
                        />
                      ))
                    ) : (
                      <DeckStack />
                    )}
                  </div>
                  {(table.status !== "playing" && !showSettledRound) || table.dealer.length === 0 ? <DeckStack /> : null}
                </div>
              </div>

              {entered && myHand && table.status === "waiting" && (
                <div className="blackjack-bet-panel">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-heading text-sm font-black text-black">Place your bet</p>
                      <p className="text-[11px] font-semibold text-black/55">
                        Tap a chip or enter a custom amount.
                      </p>
                    </div>
                    <BetTimerRing secondsLeft={betSecondsLeft} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {betOptions.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`blackjack-chip ${betDraft === value ? "blackjack-chip-active" : ""}`}
                        onClick={() => setBetDraft(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <input
                    aria-label="Custom bet amount"
                    type="number"
                    min={10}
                    max={myChips}
                    step={10}
                    value={betDraft}
                    onChange={(event) => setBetDraft(Number(event.target.value))}
                    className="mt-3 h-9 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-bold text-black outline-none"
                  />
                </div>
              )}

              {tablePlayers.length === 0 ? (
                <div className="blackjack-seat blackjack-empty-seat p-3 text-center">
                  <p className="font-heading text-sm font-black">No active hand</p>
                  <p className="text-[11px] text-white/55">
                    Enter the table to join the next deal.
                  </p>
                </div>
              ) : (
                tablePlayers.map((player, index) => (
                  <div
                    key={player.user_id}
                    className={`blackjack-seat blackjack-seat-position blackjack-seat-${Math.min(tablePlayers.length, 4)}-${index} p-2`}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold leading-none">
                          {nameFor(player.user_id)}
                          {player.user_id === user?.id && (
                            <span className="ml-1 text-xs text-[var(--rosso-light)]">you</span>
                          )}
                        </p>
                        <p className="mt-1 text-[10px] text-white/55">
                          {chipsFor(player.user_id)} chips · bet {player.bet}
                        </p>
                      </div>
                      <p className="font-heading text-sm font-black">
                        {player.cards.length > 0 ? scoreHand(player.cards) : "-"}
                      </p>
                    </div>
                    <div className="flex min-h-14 gap-1 overflow-x-auto pb-1">
                      {player.cards.length === 0 ? (
                        <CardFace hidden compact />
                      ) : (
                        player.cards.map((card, cardIndex) => (
                          <CardFace key={`${card.rank}-${card.suit}-${cardIndex}`} card={card} compact />
                        ))
                      )}
                    </div>
                    <p className="mt-1 text-[10px] capitalize text-white/60">
                      {player.result ? `${player.result} (${player.payout ?? 0})` : player.ready && table.status === "waiting" ? "ready" : player.status}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {entered && (
            <div className="space-y-2">
              {table.status === "waiting" ? (
                <Button
                  className="w-full bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
                  disabled={busy || !myHand || myChips < 10 || Boolean(myHand?.ready)}
                  onClick={() =>
                    action(async () => {
                      const next = await updateBlackjackBet(squadId, betDraft);
                      setTable(next);
                      const players = Object.values(next.players);
                      if (players.length > 0 && players.every((player) => player.ready)) {
                        const dealt = await dealBlackjackRound(squadId, memberNames);
                        setTable(dealt);
                        await runDealerSequence(dealt);
                      }
                    })
                  }
                >
                  {myHand?.ready ? "Waiting for table" : "Bet"}
                </Button>
              ) : table.status === "settled" ? (
                <Button
                  className="w-full bg-[var(--rosso)] text-white hover:bg-[var(--rosso)]/90"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      const next = await joinBlackjackRound(squadId, displayName);
                      setTable(next);
                      setRevealedRoundId(null);
                      setDealerRevealingRoundId(null);
                    })
                  }
                >
                  Next hand
                </Button>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      disabled={busy || myHand?.status !== "playing"}
                      onClick={() =>
                        action(async () => {
                          const hit = await hitBlackjack(squadId);
                          setTable(hit);
                          await sleep(850);
                          await runDealerSequence(hit);
                        })
                      }
                    >
                      Hit
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || myHand?.status !== "playing"}
                      onClick={() =>
                        action(async () => {
                          const stood = await standBlackjack(squadId);
                          setTable(stood);
                          await sleep(700);
                          await runDealerSequence(stood);
                        })
                      }
                    >
                      Stand
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      disabled={busy || !canDouble}
                      onClick={() =>
                        action(async () => {
                          const doubled = await doubleBlackjack(squadId);
                          setTable(doubled);
                          await sleep(850);
                          await runDealerSequence(doubled);
                        })
                      }
                    >
                      Double
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || !dealerShowsAce || !myHand || Boolean(myHand.insurance_bet)}
                      onClick={() => action(() => takeInsurance(squadId))}
                    >
                      <ShieldCheck className="mr-1 size-4" />
                      Insurance
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-center text-[11px] text-muted-foreground">
            Week started {currentWeekStart()}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
