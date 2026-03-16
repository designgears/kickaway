import type {
  AppState,
  ClaimState,
  ClaimStatus,
  ConfirmDialogType,
  ConnectedChannel,
  DrawOverlayState,
  GiveawaySettings,
  Participant,
  PersistedAppStateV1,
  WinnerRecord,
} from "@/domain/types";
import {
  createEmptyPersistedState,
  defaultSettings,
  normalizeChannelState,
  normalizeSettings,
} from "@/services/storage";

export type AppAction =
  | { type: "set_channel_input"; value: string }
  | { type: "connect_request" }
  | { type: "connect_success"; channel: ConnectedChannel }
  | { type: "connect_failure"; error: string }
  | { type: "patch_settings"; settings: Partial<GiveawaySettings> }
  | { type: "set_mobile_settings_open"; open: boolean }
  | { type: "open_confirm_dialog"; dialog: ConfirmDialogType }
  | { type: "close_confirm_dialog" }
  | { type: "change_channel" }
  | { type: "clear_all_data" }
  | { type: "start_giveaway"; settings: GiveawaySettings }
  | {
      type: "set_connection_status";
      status: AppState["session"]["connectionStatus"];
    }
  | { type: "participant_added"; participant: Participant }
  | {
      type: "participant_follow_status_resolved";
      participantKey: string;
      followerStatus: Participant["followerStatus"];
    }
  | { type: "draw_prepare"; overlay: DrawOverlayState }
  | { type: "draw_status"; statusLabel: string }
  | {
      type: "draw_complete";
      winners: WinnerRecord[];
      overlayCards: DrawOverlayState["cards"];
      remainingEntries: string[];
      participantsByKey: AppState["session"]["participantsByKey"];
      participantOrder: string[];
    }
  | { type: "draw_cancel" }
  | {
      type: "append_overlay_chat";
      winnerKey: string;
      entry: ClaimState["chatLog"][number];
    }
  | { type: "reveal_draw_card"; cardId: string }
  | { type: "dismiss_draw_card"; cardId: string }
  | { type: "claim_tick" }
  | { type: "claim_confirmed"; entry: ClaimState["chatLog"][number] }
  | { type: "claim_acknowledged" }
  | { type: "reset_session" };

function createInitialSession(): AppState["session"] {
  return {
    running: false,
    connectionStatus: "idle",
    drawInProgress: false,
    participantsByKey: {},
    participantOrder: [],
    entries: [],
    frozenSettings: null,
    drawOverlay: null,
    claim: null,
  };
}

function getChannelState(state: AppState, slug: string | null) {
  if (!slug) {
    return {
      settings: defaultSettings,
      winners: [],
    };
  }

  return normalizeChannelState(state.channels[slug]);
}

function updateLatestWinnerStatus(
  winners: WinnerRecord[],
  winnerName: string,
  claimStatus: ClaimStatus,
) {
  const nextWinners = [...winners];
  for (let index = nextWinners.length - 1; index >= 0; index -= 1) {
    if (nextWinners[index]?.name === winnerName) {
      nextWinners[index] = {
        ...nextWinners[index],
        claimStatus,
      };
      break;
    }
  }
  return nextWinners;
}

function updateCurrentChannelState(
  state: AppState,
  update: (
    channelState: ReturnType<typeof getChannelState>,
  ) => ReturnType<typeof getChannelState>,
) {
  if (!state.currentChannel) {
    return state.channels;
  }

  const slug = state.currentChannel.slug;
  return {
    ...state.channels,
    [slug]: update(getChannelState(state, slug)),
  };
}

export function createInitialAppState(
  persisted: PersistedAppStateV1,
): AppState {
  return {
    screen: "connect",
    channelInput: persisted.lastChannel ?? "",
    lastChannel: persisted.lastChannel,
    channels: persisted.channels,
    currentChannel: null,
    connectStatus: "idle",
    connectError: null,
    session: createInitialSession(),
    confirmDialog: null,
    mobileSettingsOpen: false,
  };
}

export function getCurrentSettings(state: AppState) {
  return getChannelState(state, state.currentChannel?.slug ?? null).settings;
}

export function getCurrentWinners(state: AppState) {
  return getChannelState(state, state.currentChannel?.slug ?? null).winners;
}

export function toPersistedState(state: AppState): PersistedAppStateV1 {
  return {
    version: 1,
    lastChannel: state.lastChannel,
    channels: state.channels,
  };
}

function startClaimFromOverlay(
  state: AppState,
  overlay: DrawOverlayState | null,
  winnerName: string,
  winnerKey: string,
  chatLog: ClaimState["chatLog"],
) {
  const settings = state.session.frozenSettings ?? defaultSettings;
  const status: ClaimStatus = chatLog.length > 0 ? "confirmed" : "pending";
  const winners =
    status === "confirmed"
      ? updateLatestWinnerStatus(
          getCurrentWinners(state),
          winnerName,
          "confirmed",
        )
      : getCurrentWinners(state);

  return {
    ...state,
    channels: updateCurrentChannelState(state, (channelState) => ({
      ...channelState,
      winners,
    })),
    session: {
      ...state.session,
      drawInProgress: status === "pending",
      drawOverlay: overlay,
      claim: {
        winnerKey,
        winnerName,
        remainingSeconds: settings.claimDurationSeconds,
        durationSeconds: settings.claimDurationSeconds,
        status,
        chatLog,
      },
    },
  };
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "set_channel_input":
      return {
        ...state,
        channelInput: action.value,
      };

    case "connect_request":
      return {
        ...state,
        connectStatus: "loading",
        connectError: null,
      };

    case "connect_success": {
      const currentChannelState = normalizeChannelState(
        state.channels[action.channel.slug],
        action.channel.followLengthMaxDays,
      );

      return {
        ...state,
        screen: "dashboard",
        currentChannel: action.channel,
        connectStatus: "idle",
        connectError: null,
        channelInput: action.channel.slug,
        lastChannel: action.channel.slug,
        channels: {
          ...state.channels,
          [action.channel.slug]: currentChannelState,
        },
        session: createInitialSession(),
      };
    }

    case "connect_failure":
      return {
        ...state,
        connectStatus: "error",
        connectError: action.error,
      };

    case "patch_settings": {
      if (!state.currentChannel) {
        return state;
      }

      const current = getChannelState(state, state.currentChannel.slug);
      const settings = normalizeSettings(
        {
          ...current.settings,
          ...action.settings,
        },
        state.currentChannel.followLengthMaxDays,
      );

      if (settings.winnerCount > 1 && settings.winnerClaim) {
        settings.winnerClaim = false;
      }

      return {
        ...state,
        channels: {
          ...state.channels,
          [state.currentChannel.slug]: {
            ...current,
            settings,
          },
        },
      };
    }

    case "set_mobile_settings_open":
      return {
        ...state,
        mobileSettingsOpen: action.open,
      };

    case "open_confirm_dialog":
      return {
        ...state,
        confirmDialog: action.dialog,
      };

    case "close_confirm_dialog":
      return {
        ...state,
        confirmDialog: null,
      };

    case "change_channel":
      return {
        ...state,
        screen: "connect",
        currentChannel: null,
        confirmDialog: null,
        mobileSettingsOpen: false,
        session: createInitialSession(),
      };

    case "clear_all_data":
      return createInitialAppState(createEmptyPersistedState());

    case "start_giveaway":
      return {
        ...state,
        session: {
          ...createInitialSession(),
          running: true,
          connectionStatus: "waiting",
          frozenSettings: action.settings,
        },
      };

    case "set_connection_status":
      return {
        ...state,
        session: {
          ...state.session,
          connectionStatus: action.status,
        },
      };

    case "participant_added": {
      if (state.session.participantsByKey[action.participant.key]) {
        return state;
      }

      return {
        ...state,
        session: {
          ...state.session,
          participantsByKey: {
            ...state.session.participantsByKey,
            [action.participant.key]: action.participant,
          },
          participantOrder: [
            action.participant.key,
            ...state.session.participantOrder,
          ],
          entries: [
            ...state.session.entries,
            ...Array.from(
              { length: action.participant.entryCount },
              () => action.participant.key,
            ),
          ],
        },
      };
    }

    case "participant_follow_status_resolved": {
      const participant =
        state.session.participantsByKey[action.participantKey];
      if (
        !participant ||
        participant.followerStatus === action.followerStatus
      ) {
        return state;
      }

      return {
        ...state,
        session: {
          ...state.session,
          participantsByKey: {
            ...state.session.participantsByKey,
            [action.participantKey]: {
              ...participant,
              followerStatus: action.followerStatus,
            },
          },
        },
      };
    }

    case "draw_prepare":
      return {
        ...state,
        session: {
          ...state.session,
          drawInProgress: true,
          drawOverlay: action.overlay,
          claim: null,
        },
      };

    case "draw_status":
      return {
        ...state,
        session: state.session.drawOverlay
          ? {
              ...state.session,
              drawOverlay: {
                ...state.session.drawOverlay,
                statusLabel: action.statusLabel,
              },
            }
          : state.session,
      };

    case "draw_complete": {
      if (!state.currentChannel || !state.session.drawOverlay) {
        return state;
      }

      const winners = [...getCurrentWinners(state), ...action.winners];

      return {
        ...state,
        channels: updateCurrentChannelState(state, (channelState) => ({
          ...channelState,
          winners,
        })),
        session: {
          ...state.session,
          entries: action.remainingEntries,
          participantsByKey: action.participantsByKey,
          participantOrder: action.participantOrder,
          drawOverlay: {
            ...state.session.drawOverlay,
            statusLabel: "Winners ready",
            cards: action.overlayCards,
          },
        },
      };
    }

    case "draw_cancel":
      return {
        ...state,
        session: {
          ...state.session,
          drawInProgress: false,
          drawOverlay: null,
        },
      };

    case "append_overlay_chat":
      return {
        ...state,
        session: state.session.drawOverlay
          ? {
              ...state.session,
              drawOverlay: {
                ...state.session.drawOverlay,
                cards: state.session.drawOverlay.cards.map((card) =>
                  card.winnerKey === action.winnerKey
                    ? {
                        ...card,
                        chatLog: [...card.chatLog, action.entry],
                      }
                    : card,
                ),
              },
            }
          : state.session,
      };

    case "reveal_draw_card": {
      const overlay = state.session.drawOverlay;
      if (!overlay) {
        return state;
      }

      const nextCards = overlay.cards.map((card) =>
        card.id === action.cardId ? { ...card, revealed: true } : card,
      );
      const nextOverlay = {
        ...overlay,
        cards: nextCards,
      };

      if (overlay.claimAfterClose) {
        const winnerCard = nextCards.find((card) => card.id === action.cardId);
        if (winnerCard?.winnerName && winnerCard?.winnerKey) {
          return startClaimFromOverlay(
            state,
            nextOverlay,
            winnerCard.winnerName,
            winnerCard.winnerKey,
            [],
          );
        }
      }

      return {
        ...state,
        session: {
          ...state.session,
          drawOverlay: nextOverlay,
        },
      };
    }

    case "dismiss_draw_card": {
      const overlay = state.session.drawOverlay;
      if (!overlay) {
        return state;
      }

      const nextCards = overlay.cards.map((card) =>
        card.id === action.cardId ? { ...card, acknowledged: true } : card,
      );
      const allAcknowledged = nextCards.every((card) => card.acknowledged);

      if (!allAcknowledged) {
        return {
          ...state,
          session: {
            ...state.session,
            drawOverlay: {
              ...overlay,
              cards: nextCards,
            },
          },
        };
      }

      return {
        ...state,
        session: {
          ...state.session,
          drawInProgress: false,
          drawOverlay: null,
        },
      };
    }

    case "claim_tick": {
      if (
        !state.currentChannel ||
        !state.session.claim ||
        state.session.claim.status !== "pending"
      ) {
        return state;
      }

      const remainingSeconds = state.session.claim.remainingSeconds - 1;
      if (remainingSeconds > 0) {
        return {
          ...state,
          session: {
            ...state.session,
            claim: {
              ...state.session.claim,
              remainingSeconds,
            },
          },
        };
      }

      const winners = updateLatestWinnerStatus(
        getCurrentWinners(state),
        state.session.claim.winnerName,
        "failed",
      );

      return {
        ...state,
        channels: updateCurrentChannelState(state, (channelState) => ({
          ...channelState,
          winners,
        })),
        session: {
          ...state.session,
          claim: {
            ...state.session.claim,
            remainingSeconds: 0,
            status: "failed",
          },
        },
      };
    }

    case "claim_confirmed": {
      if (!state.currentChannel || !state.session.claim) {
        return state;
      }

      const winners = updateLatestWinnerStatus(
        getCurrentWinners(state),
        state.session.claim.winnerName,
        "confirmed",
      );

      return {
        ...state,
        channels: updateCurrentChannelState(state, (channelState) => ({
          ...channelState,
          winners,
        })),
        session: {
          ...state.session,
          claim: {
            ...state.session.claim,
            status: "confirmed",
            chatLog: [...state.session.claim.chatLog, action.entry],
          },
        },
      };
    }

    case "claim_acknowledged":
      return {
        ...state,
        session: {
          ...state.session,
          drawInProgress: false,
          drawOverlay: null,
          claim: null,
        },
      };

    case "reset_session":
      return {
        ...state,
        session: createInitialSession(),
      };

    default:
      return state;
  }
}
