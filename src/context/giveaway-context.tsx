import {
  startTransition,
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import type { PropsWithChildren } from "react";
import {
  buildParticipant,
  drawWinnersFromPool,
  expandEntries,
  matchesKeyword,
  removeWinnersFromSession,
  shouldIgnoreParticipant,
} from "@/domain/giveaway-engine";
import {
  appReducer,
  createInitialAppState,
  getCurrentSettings,
  getCurrentWinners,
  toPersistedState,
} from "@/domain/reducer";
import type {
  AppState,
  ChatLogEntry,
  KickChatMessage,
  WinnerRecord,
} from "@/domain/types";
import { copy } from "@/services/copy";
import { createKickApiClient, KickApiError } from "@/services/kick-api";
import { createKickChatClient } from "@/services/kick-chat";
import {
  clearPersistedState,
  loadPersistedState,
  normalizeSettings,
  savePersistedState,
} from "@/services/storage";
import type { KickApiClient } from "@/services/kick-api";
import type { KickChatClient } from "@/services/kick-chat";

type GiveawayContextValue = {
  state: AppState;
  currentSettings: ReturnType<typeof getCurrentSettings>;
  currentWinners: ReturnType<typeof getCurrentWinners>;
  setChannelInput: (value: string) => void;
  connectChannel: () => Promise<void>;
  updateSettings: (
    patch: Partial<ReturnType<typeof getCurrentSettings>>,
  ) => void;
  startGiveaway: () => void;
  resetSession: () => void;
  drawWinners: () => Promise<void>;
  acknowledgeClaim: () => void;
  revealDrawCard: (cardId: string) => void;
  dismissDrawCard: (cardId: string) => void;
  setMobileSettingsOpen: (open: boolean) => void;
  openConfirmDialog: (dialog: NonNullable<AppState["confirmDialog"]>) => void;
  closeConfirmDialog: () => void;
  confirmChangeChannel: () => void;
  confirmClearAllData: () => void;
};

const GiveawayContext = createContext<GiveawayContextValue | null>(null);

function createChatLogEntry(message: KickChatMessage): ChatLogEntry {
  return {
    id: message.id,
    username: message.username,
    content: message.content,
    timestamp: message.sentAt,
  };
}

export function GiveawayProvider({
  children,
  apiClient = createKickApiClient(),
  chatClient = createKickChatClient(),
}: PropsWithChildren<{
  apiClient?: KickApiClient;
  chatClient?: KickChatClient;
}>) {
  const [state, dispatch] = useReducer(appReducer, undefined, () =>
    createInitialAppState(loadPersistedState()),
  );
  const stateRef = useRef(state);
  const chatClientRef = useRef(chatClient);
  const apiClientRef = useRef(apiClient);
  const followerStatusCacheRef = useRef(new Map<string, boolean>());

  const currentSettings = getCurrentSettings(state);
  const currentWinners = getCurrentWinners(state);

  useEffect(() => {
    savePersistedState(window.localStorage, toPersistedState(state));
  }, [state]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const resolveParticipantFollowerStatus = (
    channelSlug: string,
    participantKey: string,
  ) => {
    const cacheKey = `${channelSlug}:${participantKey}`;
    const cachedStatus = followerStatusCacheRef.current.get(cacheKey);
    if (typeof cachedStatus === "boolean") {
      dispatch({
        type: "participant_follow_status_resolved",
        participantKey,
        followerStatus: cachedStatus ? "follower" : "not-following",
      });
      return;
    }

    void apiClientRef.current
      .checkFollowerStatus(channelSlug, participantKey)
      .then((isFollower) => {
        followerStatusCacheRef.current.set(cacheKey, isFollower);

        const latestState = stateRef.current;
        if (
          latestState.currentChannel?.slug !== channelSlug ||
          !latestState.session.participantsByKey[participantKey]
        ) {
          return;
        }

        startTransition(() => {
          dispatch({
            type: "participant_follow_status_resolved",
            participantKey,
            followerStatus: isFollower ? "follower" : "not-following",
          });
        });
      })
      .catch(() => {
        // Keep the participant unresolved if the follow lookup fails.
      });
  };

  const handleIncomingMessage = (message: KickChatMessage) => {
    const currentState = stateRef.current;
    const logEntry = createChatLogEntry(message);

    if (
      currentState.session.claim &&
      currentState.session.claim.status === "pending" &&
      currentState.session.claim.winnerKey === message.usernameKey
    ) {
      dispatch({ type: "claim_confirmed", entry: logEntry });
      return;
    }

    if (currentState.session.drawOverlay) {
      const matchingCard = currentState.session.drawOverlay.cards.find(
        (card) => card.revealed && card.winnerKey === message.usernameKey,
      );

      if (matchingCard) {
        dispatch({
          type: "append_overlay_chat",
          winnerKey: message.usernameKey,
          entry: logEntry,
        });
      }
    }

    if (!currentState.session.running || !currentState.session.frozenSettings) {
      return;
    }

    if (shouldIgnoreParticipant(message.usernameKey)) {
      return;
    }

    if (currentState.session.participantsByKey[message.usernameKey]) {
      return;
    }

    if (
      !matchesKeyword(
        message.content,
        currentState.session.frozenSettings.keyword,
      )
    ) {
      return;
    }

    const participant = buildParticipant(
      message,
      currentState.session.frozenSettings,
    );
    if (!participant) {
      return;
    }

    dispatch({
      type: "participant_added",
      participant: {
        ...participant,
        entryCount: expandEntries(participant).length,
      },
    });

    const channelSlug = currentState.currentChannel?.slug;
    if (channelSlug) {
      resolveParticipantFollowerStatus(channelSlug, participant.key);
    }
  };

  useEffect(() => {
    if (!state.session.claim || state.session.claim.status !== "pending") {
      return;
    }

    const timer = window.setInterval(() => {
      dispatch({ type: "claim_tick" });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [state.session.claim]);

  const connectChannel = async () => {
    const slug = state.channelInput.trim().toLowerCase();
    if (!slug) {
      dispatch({
        type: "connect_failure",
        error: "Enter a channel slug before connecting.",
      });
      return;
    }

    dispatch({ type: "connect_request" });

    try {
      const channel = await apiClientRef.current.fetchChannel(slug);
      dispatch({ type: "connect_success", channel });
    } catch (error) {
      const message =
        error instanceof KickApiError
          ? error.message
          : "Unable to load this Kick channel.";
      dispatch({ type: "connect_failure", error: message });
    }
  };

  const updateSettings = (patch: Partial<typeof currentSettings>) => {
    dispatch({ type: "patch_settings", settings: patch });
  };

  const startGiveaway = () => {
    if (!state.currentChannel) {
      return;
    }

    chatClientRef.current.disconnect();
    dispatch({
      type: "start_giveaway",
      settings: normalizeSettings(
        currentSettings,
        state.currentChannel.followLengthMaxDays,
      ),
    });

    chatClientRef.current.connect(state.currentChannel.chatroomId, {
      onConnected: () => {
        dispatch({ type: "set_connection_status", status: "connected" });
      },
      onConnectionLost: () => {
        dispatch({ type: "set_connection_status", status: "lost" });
      },
      onMessage: handleIncomingMessage,
    });
  };

  const resetSession = () => {
    chatClientRef.current.disconnect();
    dispatch({ type: "reset_session" });
  };

  const drawWinners = async () => {
    if (
      !state.currentChannel ||
      !state.session.running ||
      state.session.drawInProgress
    ) {
      return;
    }

    const uniqueCount = new Set(state.session.entries).size;
    if (uniqueCount === 0) {
      window.alert(copy.drawNoParticipants);
      return;
    }

    const requestedCount = Math.min(currentSettings.winnerCount, uniqueCount);
    const claimAfterClose = currentSettings.winnerClaim && requestedCount === 1;

    dispatch({
      type: "draw_prepare",
      overlay: {
        requestedCount,
        statusLabel: copy.drawPendingTitle,
        poolSnapshot: [...state.session.entries],
        claimAfterClose,
        cards: Array.from({ length: requestedCount }, (_, index) => ({
          id: `card-${index}`,
          winnerKey: null,
          winnerName: null,
          chatLog: [],
          revealed: false,
          acknowledged: false,
        })),
      },
    });

    try {
      const result = await drawWinnersFromPool({
        entries: state.session.entries,
        requestedCount,
        channelSlug: state.currentChannel.slug,
        minFollowDays: currentSettings.followLengthDays,
        checkFollowAge: apiClientRef.current.checkFollowAge,
        onCandidateCheck: (candidateKey) => {
          dispatch({
            type: "draw_status",
            statusLabel: copy.checkingCandidate(candidateKey),
          });
        },
      });

      if (result.winnerKeys.length === 0) {
        window.alert(copy.drawNoParticipants);
        dispatch({ type: "draw_cancel" });
        return;
      }

      const winners: WinnerRecord[] = result.winnerKeys.map((winnerKey) => ({
        name: state.session.participantsByKey[winnerKey]?.name ?? winnerKey,
        timestamp: new Date().toISOString(),
        claimStatus: claimAfterClose ? "pending" : "confirmed",
      }));

      const overlayCards = result.winnerKeys.map((winnerKey, index) => ({
        id: `card-${index}`,
        winnerKey,
        winnerName:
          state.session.participantsByKey[winnerKey]?.name ?? winnerKey,
        chatLog: [],
        revealed: false,
        acknowledged: false,
      }));

      const nextSession = removeWinnersFromSession(
        state.session.participantsByKey,
        state.session.participantOrder,
        state.session.entries,
        result.winnerKeys,
      );

      dispatch({
        type: "draw_complete",
        winners,
        overlayCards,
        remainingEntries: nextSession.entries,
        participantsByKey: nextSession.participantsByKey,
        participantOrder: nextSession.participantOrder,
      });
    } catch {
      window.alert(copy.drawFollowCheckError);
      dispatch({ type: "draw_cancel" });
    }
  };

  const acknowledgeClaim = () => {
    dispatch({ type: "claim_acknowledged" });
  };

  const revealDrawCard = (cardId: string) => {
    dispatch({ type: "reveal_draw_card", cardId });
  };

  const dismissDrawCard = (cardId: string) => {
    dispatch({ type: "dismiss_draw_card", cardId });
  };

  const setMobileSettingsOpen = (open: boolean) => {
    dispatch({ type: "set_mobile_settings_open", open });
  };

  const openConfirmDialog = (
    dialog: NonNullable<AppState["confirmDialog"]>,
  ) => {
    dispatch({ type: "open_confirm_dialog", dialog });
  };

  const closeConfirmDialog = () => {
    dispatch({ type: "close_confirm_dialog" });
  };

  const confirmChangeChannel = () => {
    chatClientRef.current.disconnect();
    dispatch({ type: "change_channel" });
  };

  const confirmClearAllData = () => {
    chatClientRef.current.disconnect();
    clearPersistedState(window.localStorage);
    dispatch({ type: "clear_all_data" });
  };

  const value: GiveawayContextValue = {
    state,
    currentSettings,
    currentWinners,
    setChannelInput: (value) => dispatch({ type: "set_channel_input", value }),
    connectChannel,
    updateSettings,
    startGiveaway,
    resetSession,
    drawWinners,
    acknowledgeClaim,
    revealDrawCard,
    dismissDrawCard,
    setMobileSettingsOpen,
    openConfirmDialog,
    closeConfirmDialog,
    confirmChangeChannel,
    confirmClearAllData,
  };

  return (
    <GiveawayContext.Provider value={value}>
      {children}
    </GiveawayContext.Provider>
  );
}

export function useGiveaway() {
  const context = useContext(GiveawayContext);
  if (!context) {
    throw new Error("useGiveaway must be used within GiveawayProvider");
  }
  return context;
}
