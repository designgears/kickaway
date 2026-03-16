import type { ConnectedChannel } from "@/domain/types";
import {
  kickChannelResponseSchema,
  kickChannelUserResponseSchema,
} from "@/services/schemas";

export class KickApiError extends Error {
  kind:
    | "channel-not-found"
    | "chatroom-missing"
    | "invalid-channel-payload"
    | "follow-check"
    | "network";

  constructor(
    kind: KickApiError["kind"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.kind = kind;
  }
}

export interface KickApiClient {
  fetchChannel(slug: string): Promise<ConnectedChannel>;
  checkFollowerStatus(channelSlug: string, username: string): Promise<boolean>;
  checkFollowAge(
    channelSlug: string,
    username: string,
    minDays: number,
  ): Promise<boolean>;
}

function calculateFollowLengthMaxDays(
  channel: ReturnType<typeof kickChannelResponseSchema.parse>,
  now = new Date(),
) {
  const startDate = channel.user?.email_verified_at ?? channel.created_at;

  if (!startDate) {
    return 0;
  }

  const diffTime = Math.abs(now.getTime() - new Date(startDate).getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function createKickApiClient(
  fetchImpl: typeof fetch = fetch,
): KickApiClient {
  async function getFollowingSince(channelSlug: string, username: string) {
    let response: Response;
    try {
      response = await fetchImpl(
        `https://kick.com/api/v2/channels/${channelSlug}/users/${username}`,
      );
    } catch (error) {
      throw new KickApiError(
        "follow-check",
        "Unable to validate follower age.",
        {
          cause: error,
        },
      );
    }

    if (!response.ok) {
      return null;
    }

    const parsed = kickChannelUserResponseSchema.safeParse(
      await response.json(),
    );
    if (!parsed.success) {
      throw new KickApiError(
        "follow-check",
        "Kick returned an invalid channel-user payload.",
      );
    }

    return parsed.data.following_since ?? null;
  }

  return {
    async fetchChannel(slug) {
      let response: Response;

      try {
        response = await fetchImpl(`https://kick.com/api/v2/channels/${slug}`);
      } catch (error) {
        throw new KickApiError("network", "Unable to reach Kick.", {
          cause: error,
        });
      }

      if (!response.ok) {
        throw new KickApiError(
          "channel-not-found",
          "Channel not found or Kick returned an error.",
        );
      }

      const parsed = kickChannelResponseSchema.safeParse(await response.json());
      if (!parsed.success) {
        throw new KickApiError(
          "invalid-channel-payload",
          "Kick returned an invalid channel payload.",
        );
      }

      if (!parsed.data.chatroom?.id) {
        throw new KickApiError(
          "chatroom-missing",
          "Channel has no chatroom id.",
        );
      }

      return {
        slug: parsed.data.slug.toLowerCase(),
        chatroomId: parsed.data.chatroom.id,
        followLengthMaxDays: calculateFollowLengthMaxDays(parsed.data),
      };
    },

    async checkFollowerStatus(channelSlug, username) {
      const followingSince = await getFollowingSince(channelSlug, username);
      return Boolean(followingSince);
    },

    async checkFollowAge(channelSlug, username, minDays) {
      if (minDays <= 0) {
        return true;
      }

      const followingSince = await getFollowingSince(channelSlug, username);
      if (!followingSince) {
        return false;
      }

      const followDate = new Date(followingSince);
      const diffTime = Math.abs(Date.now() - followDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= minDays;
    },
  };
}
