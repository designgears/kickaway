import type { KickBadge, KickChatMessage } from "@/domain/types";
import {
  kickChatMessagePayloadSchema,
  kickSocketEnvelopeSchema,
} from "@/services/schemas";

const WS_URL =
  "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false";

export const SPECIAL_TAGS_REGEX = /[\u{E0000}-\u{E007F}]/gu;

export function sanitizeUnicodeTagCharacters(value: string) {
  return value.replace(SPECIAL_TAGS_REGEX, "");
}

type ChatHandlers = {
  onConnected: () => void;
  onConnectionLost: () => void;
  onMessage: (message: KickChatMessage) => void;
};

export interface KickChatClient {
  connect(chatroomId: number, handlers: ChatHandlers): void;
  disconnect(): void;
}

function normalizeBadges(input: Array<{ type: string; count?: number | null }>) {
  return input.reduce<KickBadge[]>((accumulator, badge) => {
    accumulator.push({
      type: badge.type,
      count: badge.count ?? 0,
    });
    return accumulator;
  }, []);
}

export function createKickChatClient(
  socketFactory: (url: string) => WebSocket = (url) => new WebSocket(url),
): KickChatClient {
  let socket: WebSocket | null = null;
  let closedIntentionally = false;

  return {
    connect(chatroomId, handlers) {
      if (socket) {
        closedIntentionally = true;
        socket.close();
      }

      closedIntentionally = false;
      socket = socketFactory(WS_URL);

      socket.onmessage = (event) => {
        let envelope: unknown;
        try {
          envelope = JSON.parse(event.data);
        } catch {
          return;
        }

        const parsed = kickSocketEnvelopeSchema.safeParse(envelope);
        if (!parsed.success) {
          return;
        }

        let payload: unknown = parsed.data.data ?? {};
        if (typeof parsed.data.data === "string") {
          try {
            payload = JSON.parse(parsed.data.data);
          } catch {
            payload = {};
          }
        }

        if (parsed.data.event === "pusher:connection_established") {
          socket?.send(
            JSON.stringify({
              event: "pusher:subscribe",
              data: {
                auth: "",
                channel: `chatrooms.${chatroomId}.v2`,
              },
            }),
          );
          return;
        }

        if (parsed.data.event === "pusher_internal:subscription_succeeded") {
          handlers.onConnected();
          return;
        }

        if (parsed.data.event !== "App\\Events\\ChatMessageEvent") {
          return;
        }

        const message = kickChatMessagePayloadSchema.safeParse(payload);
        if (!message.success) {
          return;
        }

        handlers.onMessage({
          id: String(message.data.id ?? crypto.randomUUID()),
          username: message.data.sender.username,
          usernameKey: message.data.sender.username.toLowerCase(),
          content: sanitizeUnicodeTagCharacters(message.data.content ?? ""),
          sentAt: message.data.created_at ?? new Date().toISOString(),
          badges: normalizeBadges(message.data.sender.identity?.badges ?? []),
        });
      };

      socket.onclose = () => {
        const intentional = closedIntentionally;
        socket = null;
        closedIntentionally = false;
        if (!intentional) {
          handlers.onConnectionLost();
        }
      };
    },

    disconnect() {
      if (!socket) {
        return;
      }

      closedIntentionally = true;
      socket.close();
      socket = null;
    },
  };
}
