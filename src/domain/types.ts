export type AnimationMode = "wheel" | "slot-machine" | "char-scramble";

export type ClaimStatus = "pending" | "confirmed" | "failed";

export type AudienceFilterMode = "any" | "include" | "required" | "exclude";

export type GiveawaySettings = {
  keyword: string;
  winnerCount: number;
  subscriberFilter: AudienceFilterMode;
  moderatorFilter: AudienceFilterMode;
  vipFilter: AudienceFilterMode;
  ogFilter: AudienceFilterMode;
  founderFilter: AudienceFilterMode;
  subMultiplier: number;
  moderatorMultiplier: number;
  vipMultiplier: number;
  ogMultiplier: number;
  founderMultiplier: number;
  followLengthDays: number;
  subLengthMonths: number;
  spinDurationSeconds: number;
  winnerClaim: boolean;
  claimDurationSeconds: number;
  animation: AnimationMode;
};

export type ParticipantRole =
  | "subscriber"
  | "moderator"
  | "vip"
  | "og"
  | "founder";

export type FollowerStatus = "unknown" | "follower" | "not-following";

export type WinnerRecord = {
  name: string;
  timestamp: string;
  claimStatus: ClaimStatus;
};

export type PersistedChannelState = {
  settings: GiveawaySettings;
  winners: WinnerRecord[];
};

export type PersistedAppStateV1 = {
  version: 1;
  lastChannel: string | null;
  channels: Record<string, PersistedChannelState>;
};

export type ConnectedChannel = {
  slug: string;
  chatroomId: number;
  followLengthMaxDays: number;
};

export type KickBadge = {
  type: string;
  count: number;
};

export type KickChatMessage = {
  id: string;
  username: string;
  usernameKey: string;
  content: string;
  sentAt: string;
  badges: KickBadge[];
};

export type Participant = {
  key: string;
  name: string;
  isSubscriber: boolean;
  followerStatus: FollowerStatus;
  subscriptionMonths: number;
  entryCount: number;
  roles: ParticipantRole[];
};

export type ChatLogEntry = {
  id: string;
  username: string;
  content: string;
  timestamp: string;
};

export type DrawOverlayCard = {
  id: string;
  winnerKey: string | null;
  winnerName: string | null;
  chatLog: ChatLogEntry[];
  revealed: boolean;
  acknowledged: boolean;
};

export type DrawOverlayState = {
  requestedCount: number;
  statusLabel: string;
  poolSnapshot: string[];
  cards: DrawOverlayCard[];
  claimAfterClose: boolean;
};

export type ClaimState = {
  winnerKey: string;
  winnerName: string;
  remainingSeconds: number;
  durationSeconds: number;
  status: ClaimStatus;
  chatLog: ChatLogEntry[];
};

export type SessionState = {
  running: boolean;
  connectionStatus: "idle" | "waiting" | "connected" | "lost";
  drawInProgress: boolean;
  participantsByKey: Record<string, Participant>;
  participantOrder: string[];
  entries: string[];
  frozenSettings: GiveawaySettings | null;
  drawOverlay: DrawOverlayState | null;
  claim: ClaimState | null;
};

export type ConfirmDialogType = "change-channel" | "clear-all-data";

export type AppState = {
  screen: "connect" | "dashboard";
  channelInput: string;
  lastChannel: string | null;
  channels: Record<string, PersistedChannelState>;
  currentChannel: ConnectedChannel | null;
  connectStatus: "idle" | "loading" | "error";
  connectError: string | null;
  session: SessionState;
  confirmDialog: ConfirmDialogType | null;
  mobileSettingsOpen: boolean;
};

export type DrawWinnerResult = {
  winnerKeys: string[];
  remainingEntries: string[];
};
