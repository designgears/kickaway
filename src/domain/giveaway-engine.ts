import type {
  AudienceFilterMode,
  DrawWinnerResult,
  GiveawaySettings,
  KickBadge,
  KickChatMessage,
  Participant,
  ParticipantRole,
} from "@/domain/types";

const MILLISECONDS_PER_MINUTE = 60_000;

const IGNORED_PARTICIPANT_KEYS = new Set([
  "kickbot",
  "streamlabs",
  "streamelements",
  "nightbot",
  "moobot",
  "fossabot",
  "botrix",
  "mixitupbot",
  "wizebot",
]);

const roleBadgeDefinitions = [
  { role: "subscriber", badgeTypes: ["subscriber", "founder"] },
  { role: "moderator", badgeTypes: ["moderator", "mod"] },
  { role: "vip", badgeTypes: ["vip"] },
  { role: "og", badgeTypes: ["og"] },
  { role: "founder", badgeTypes: ["founder"] },
] as const satisfies ReadonlyArray<{
  role: ParticipantRole;
  badgeTypes: readonly string[];
}>;

function normalizeBadgeType(type: string) {
  return type.trim().toLowerCase();
}

function createBadgeTypeSet(badges: KickBadge[]) {
  return new Set(badges.map((badge) => normalizeBadgeType(badge.type)));
}

function hasBadgeType(badgeTypes: Set<string>, expected: readonly string[]) {
  return expected.some((type) => badgeTypes.has(type));
}

function getSubscriptionBadge(badges: KickBadge[]) {
  return badges.find((badge) => {
    const type = normalizeBadgeType(badge.type);
    return type === "subscriber" || type === "founder";
  });
}

function getParticipantRoles(badgeTypes: Set<string>) {
  return roleBadgeDefinitions.flatMap(({ role, badgeTypes: expected }) =>
    hasBadgeType(badgeTypes, expected) ? [role] : [],
  );
}

function isExcludedByAudienceFilter(
  mode: AudienceFilterMode,
  matches: boolean,
) {
  return mode === "exclude" && matches;
}

function isMissingRequiredAudienceFilter(
  mode: AudienceFilterMode,
  matches: boolean,
) {
  return mode === "required" && !matches;
}

export function matchesKeyword(message: string, keyword: string) {
  const normalizedMessage = message.trim().toLowerCase();
  const normalizedKeyword = keyword.trim().toLowerCase();

  return normalizedKeyword === "" || normalizedMessage === normalizedKeyword;
}

export function shouldIgnoreParticipant(usernameKey: string) {
  return IGNORED_PARTICIPANT_KEYS.has(usernameKey.trim().toLowerCase());
}

export function buildParticipant(
  message: KickChatMessage,
  settings: GiveawaySettings,
): Participant | null {
  const subscriptionBadge = getSubscriptionBadge(message.badges);
  const badgeTypes = createBadgeTypeSet(message.badges);
  const isSubscriber = Boolean(subscriptionBadge);
  const subscriptionMonths = subscriptionBadge?.count ?? 0;
  const roles = getParticipantRoles(badgeTypes);
  const audienceChecks = [
    { filter: settings.subscriberFilter, matches: isSubscriber },
    { filter: settings.moderatorFilter, matches: roles.includes("moderator") },
    { filter: settings.vipFilter, matches: roles.includes("vip") },
    { filter: settings.ogFilter, matches: roles.includes("og") },
    { filter: settings.founderFilter, matches: roles.includes("founder") },
  ];

  if (
    audienceChecks.some(
      ({ filter, matches }) =>
        isExcludedByAudienceFilter(filter, matches) ||
        isMissingRequiredAudienceFilter(filter, matches),
    )
  ) {
    return null;
  }

  if (
    isSubscriber &&
    settings.subLengthMonths > 0 &&
    subscriptionMonths < settings.subLengthMonths
  ) {
    return null;
  }

  let entryCount = 1;

  const multiplierChecks = [
    {
      filter: settings.subscriberFilter,
      matches: isSubscriber,
      multiplier: settings.subMultiplier,
    },
    {
      filter: settings.moderatorFilter,
      matches: roles.includes("moderator"),
      multiplier: settings.moderatorMultiplier,
    },
    {
      filter: settings.vipFilter,
      matches: roles.includes("vip"),
      multiplier: settings.vipMultiplier,
    },
    {
      filter: settings.ogFilter,
      matches: roles.includes("og"),
      multiplier: settings.ogMultiplier,
    },
    {
      filter: settings.founderFilter,
      matches: roles.includes("founder"),
      multiplier: settings.founderMultiplier,
    },
  ];

  for (const { filter, matches, multiplier } of multiplierChecks) {
    if (matches && filter !== "exclude") {
      entryCount *= multiplier;
    }
  }

  return {
    key: message.usernameKey,
    name: message.username,
    lastChatAt: message.sentAt,
    isSubscriber,
    followerStatus: "unknown",
    subscriptionMonths,
    entryCount,
    roles,
  };
}

export function expandEntries(participant: Participant) {
  return Array.from({ length: participant.entryCount }, () => participant.key);
}

export async function drawWinnersFromPool({
  entries,
  requestedCount,
  channelSlug,
  minFollowDays,
  checkFollowAge,
  onCandidateCheck,
  rng = Math.random,
}: {
  entries: string[];
  requestedCount: number;
  channelSlug: string;
  minFollowDays: number;
  checkFollowAge: (
    channelSlug: string,
    username: string,
    minDays: number,
  ) => Promise<boolean>;
  onCandidateCheck?: (candidateKey: string) => void;
  rng?: () => number;
}): Promise<DrawWinnerResult> {
  let drawPool = [...entries];
  const winnerKeys: string[] = [];
  let uniqueCount = new Set(drawPool).size;
  const targetCount = Math.min(requestedCount, uniqueCount);

  while (winnerKeys.length < targetCount && uniqueCount > 0) {
    const candidateKey = drawPool[Math.floor(rng() * drawPool.length)];
    onCandidateCheck?.(candidateKey);

    const isValid =
      minFollowDays > 0
        ? await checkFollowAge(channelSlug, candidateKey, minFollowDays)
        : true;

    drawPool = drawPool.filter((entry) => entry !== candidateKey);
    uniqueCount = new Set(drawPool).size;

    if (isValid) {
      winnerKeys.push(candidateKey);
    }
  }

  return {
    winnerKeys,
    remainingEntries: drawPool,
  };
}

export function removeWinnersFromSession(
  participantsByKey: Record<string, Participant>,
  participantOrder: string[],
  entries: string[],
  winnerKeys: string[],
) {
  const winnerSet = new Set(winnerKeys);
  const nextParticipants = Object.fromEntries(
    Object.entries(participantsByKey).filter(([key]) => !winnerSet.has(key)),
  );
  const nextOrder = participantOrder.filter((key) => !winnerSet.has(key));
  const nextEntries = entries.filter((key) => !winnerSet.has(key));

  return {
    participantsByKey: nextParticipants,
    participantOrder: nextOrder,
    entries: nextEntries,
  };
}

export function isParticipantWithinChatCutoff(
  participant: Participant,
  recentChatCutoffMinutes: number,
  now = Date.now(),
) {
  if (recentChatCutoffMinutes <= 0) {
    return true;
  }

  const lastChatTimestamp = Date.parse(participant.lastChatAt);
  if (Number.isNaN(lastChatTimestamp)) {
    return false;
  }

  return (
    now - lastChatTimestamp <= recentChatCutoffMinutes * MILLISECONDS_PER_MINUTE
  );
}

export function pruneParticipantsByActivity(
  participantsByKey: Record<string, Participant>,
  participantOrder: string[],
  entries: string[],
  recentChatCutoffMinutes: number,
  now = Date.now(),
) {
  if (recentChatCutoffMinutes <= 0) {
    return {
      participantsByKey,
      participantOrder,
      entries,
      removedCount: 0,
    };
  }

  const expiredKeys = new Set(
    participantOrder.filter((key) => {
      const participant = participantsByKey[key];
      return (
        participant &&
        !isParticipantWithinChatCutoff(
          participant,
          recentChatCutoffMinutes,
          now,
        )
      );
    }),
  );

  if (expiredKeys.size === 0) {
    return {
      participantsByKey,
      participantOrder,
      entries,
      removedCount: 0,
    };
  }

  return {
    participantsByKey: Object.fromEntries(
      Object.entries(participantsByKey).filter(
        ([key]) => !expiredKeys.has(key),
      ),
    ),
    participantOrder: participantOrder.filter((key) => !expiredKeys.has(key)),
    entries: entries.filter((key) => !expiredKeys.has(key)),
    removedCount: expiredKeys.size,
  };
}
