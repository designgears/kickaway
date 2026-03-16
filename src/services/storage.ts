import type {
  AudienceFilterMode,
  GiveawaySettings,
  PersistedAppStateV1,
  PersistedChannelState,
  WinnerRecord,
} from "@/domain/types";
import { persistedAppStateV1Schema } from "@/services/schemas";

export const STORAGE_KEY = "kickaway:v1";

export const defaultSettings: GiveawaySettings = {
  keyword: "",
  recentChatCutoffMinutes: 0,
  winnerCount: 1,
  subscriberFilter: "any",
  moderatorFilter: "any",
  vipFilter: "any",
  ogFilter: "any",
  founderFilter: "any",
  subMultiplier: 1,
  moderatorMultiplier: 1,
  vipMultiplier: 1,
  ogMultiplier: 1,
  founderMultiplier: 1,
  followLengthDays: 0,
  subLengthMonths: 0,
  spinDurationSeconds: 5,
  winnerClaim: false,
  claimDurationSeconds: 30,
  animation: "wheel",
};

export function createEmptyPersistedState(): PersistedAppStateV1 {
  return {
    version: 1,
    lastChannel: null,
    channels: {},
  };
}

function normalizeAudienceFilterMode(
  value: unknown,
  fallback: AudienceFilterMode = "any",
): AudienceFilterMode {
  if (value == null) {
    return fallback;
  }

  if (
    value === "any" ||
    value === "include" ||
    value === "required" ||
    value === "exclude"
  ) {
    return value;
  }

  return fallback;
}

export function normalizeSettings(
  settings: Partial<GiveawaySettings> | undefined,
  maxFollowLength = Number.POSITIVE_INFINITY,
): GiveawaySettings {
  const recentChatCutoffMinutes = Math.min(
    Math.max(settings?.recentChatCutoffMinutes ?? 0, 0),
    120,
  );
  const winnerCount = Math.min(Math.max(settings?.winnerCount ?? 1, 1), 10);
  const subMultiplier = Math.min(Math.max(settings?.subMultiplier ?? 1, 1), 10);
  const moderatorMultiplier = Math.min(
    Math.max(settings?.moderatorMultiplier ?? 1, 1),
    10,
  );
  const vipMultiplier = Math.min(Math.max(settings?.vipMultiplier ?? 1, 1), 10);
  const ogMultiplier = Math.min(Math.max(settings?.ogMultiplier ?? 1, 1), 10);
  const founderMultiplier = Math.min(
    Math.max(settings?.founderMultiplier ?? 1, 1),
    10,
  );
  const followLengthDays = Math.min(
    Math.max(settings?.followLengthDays ?? 0, 0),
    maxFollowLength,
  );
  const subLengthMonths = Math.min(
    Math.max(settings?.subLengthMonths ?? 0, 0),
    60,
  );
  const spinDurationSeconds = Math.min(
    Math.max(settings?.spinDurationSeconds ?? 5, 2),
    30,
  );
  const claimDurationSeconds = Math.max(
    settings?.claimDurationSeconds ?? 30,
    10,
  );

  return {
    keyword: settings?.keyword?.trim().toLowerCase() ?? "",
    recentChatCutoffMinutes,
    winnerCount,
    subscriberFilter: normalizeAudienceFilterMode(settings?.subscriberFilter),
    moderatorFilter: normalizeAudienceFilterMode(settings?.moderatorFilter),
    vipFilter: normalizeAudienceFilterMode(settings?.vipFilter),
    ogFilter: normalizeAudienceFilterMode(settings?.ogFilter),
    founderFilter: normalizeAudienceFilterMode(settings?.founderFilter),
    subMultiplier,
    moderatorMultiplier,
    vipMultiplier,
    ogMultiplier,
    founderMultiplier,
    followLengthDays,
    subLengthMonths,
    spinDurationSeconds,
    winnerClaim: settings?.winnerClaim ?? false,
    claimDurationSeconds,
    animation: settings?.animation ?? "wheel",
  };
}

function normalizeWinners(winners: WinnerRecord[] | undefined): WinnerRecord[] {
  return (winners ?? []).map((winner) =>
    winner.claimStatus === "pending"
      ? {
          ...winner,
          claimStatus: "failed",
        }
      : winner,
  );
}

export function normalizeChannelState(
  state: Partial<PersistedChannelState> | undefined,
  maxFollowLength = Number.POSITIVE_INFINITY,
): PersistedChannelState {
  return {
    settings: normalizeSettings(state?.settings, maxFollowLength),
    winners: normalizeWinners(state?.winners),
  };
}

export function loadPersistedState(
  storage: Storage = window.localStorage,
): PersistedAppStateV1 {
  const canonicalRaw = storage.getItem(STORAGE_KEY);
  if (!canonicalRaw) {
    return createEmptyPersistedState();
  }

  try {
    const parsed = persistedAppStateV1Schema.parse(JSON.parse(canonicalRaw));
    const normalized: PersistedAppStateV1 = {
      ...parsed,
      channels: Object.fromEntries(
        Object.entries(parsed.channels).map(([channel, channelState]) => [
          channel,
          normalizeChannelState(channelState),
        ]),
      ),
    };

    savePersistedState(storage, normalized);
    return normalized;
  } catch {
    const empty = createEmptyPersistedState();
    savePersistedState(storage, empty);
    return empty;
  }
}

export function savePersistedState(
  storage: Storage = window.localStorage,
  state: PersistedAppStateV1,
) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedState(storage: Storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
}
