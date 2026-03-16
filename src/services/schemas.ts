import { z } from "zod";

const animationModeSchema = z.enum(["wheel", "slot-machine", "char-scramble"]);
const claimStatusSchema = z.enum(["pending", "confirmed", "failed"]);
const audienceFilterModeSchema = z.enum([
  "any",
  "include",
  "required",
  "exclude",
]);

export const giveawaySettingsSchema = z.object({
  keyword: z.string(),
  recentChatCutoffMinutes: z.number().int().min(0).max(120).default(0),
  winnerCount: z.number().int().min(1).max(10),
  subscriberFilter: audienceFilterModeSchema.default("any"),
  moderatorFilter: audienceFilterModeSchema.default("any"),
  vipFilter: audienceFilterModeSchema.default("any"),
  ogFilter: audienceFilterModeSchema.default("any"),
  founderFilter: audienceFilterModeSchema.default("any"),
  subMultiplier: z.number().int().min(1).max(10),
  moderatorMultiplier: z.number().int().min(1).max(10).default(1),
  vipMultiplier: z.number().int().min(1).max(10).default(1),
  ogMultiplier: z.number().int().min(1).max(10).default(1),
  founderMultiplier: z.number().int().min(1).max(10).default(1),
  followLengthDays: z.number().int().min(0),
  subLengthMonths: z.number().int().min(0).max(60),
  spinDurationSeconds: z.number().int().min(2).max(30).default(5),
  winnerClaim: z.boolean(),
  claimDurationSeconds: z.number().int().min(10),
  animation: animationModeSchema,
});

export const winnerRecordSchema = z.object({
  name: z.string(),
  timestamp: z.string(),
  claimStatus: claimStatusSchema,
});

export const persistedChannelStateSchema = z.object({
  settings: giveawaySettingsSchema,
  winners: z.array(winnerRecordSchema),
});

export const persistedAppStateV1Schema = z.object({
  version: z.literal(1),
  lastChannel: z.string().nullable(),
  channels: z.record(z.string(), persistedChannelStateSchema),
});

export const kickChannelResponseSchema = z.object({
  slug: z.string(),
  created_at: z.string().nullable().optional(),
  chatroom: z
    .object({
      id: z.number().int(),
    })
    .nullable()
    .optional(),
  user: z
    .object({
      email_verified_at: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const kickChannelUserResponseSchema = z.object({
  following_since: z.string().nullable().optional(),
});

export const kickSocketEnvelopeSchema = z.object({
  event: z.string(),
  data: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
});

export const kickBadgeSchema = z.object({
  type: z.string(),
  count: z.number().int().nonnegative().nullable().optional(),
});

export const kickChatMessagePayloadSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  content: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  sender: z.object({
    username: z.string(),
    identity: z
      .object({
        badges: z.array(kickBadgeSchema).optional(),
      })
      .nullable()
      .optional(),
  }),
});
