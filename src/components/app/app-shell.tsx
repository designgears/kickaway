import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  EraserIcon,
  RadioTowerIcon,
  ShieldIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Settings2Icon,
  TicketIcon,
  TrophyIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useGiveaway } from "@/context/giveaway-context";
import { copy } from "@/services/copy";
import { cn } from "@/lib/utils";
import { DrawAnimation } from "@/components/animations/draw-animation";
import type {
  AudienceFilterMode,
  GiveawaySettings,
  Participant,
} from "@/domain/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTone(status: "idle" | "waiting" | "connected" | "lost") {
  if (status === "lost") {
    return "destructive" as const;
  }

  return "default" as const;
}

function getStatusMessage(
  status: "idle" | "waiting" | "connected" | "lost",
  keyword: string,
) {
  if (status === "lost") {
    return copy.lostStatus;
  }

  if (status === "connected") {
    return copy.connectedStatus(keyword);
  }

  return copy.waitingStatus;
}

function getConnectionBadgeLabel(
  status: "idle" | "waiting" | "connected" | "lost",
) {
  if (status === "connected") {
    return copy.chatStatusLive;
  }

  if (status === "lost") {
    return copy.chatStatusLost;
  }

  return copy.chatStatusWaiting;
}

function formatClaimStatus(status: "pending" | "confirmed" | "failed") {
  if (status === "confirmed") {
    return "Confirmed";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Pending";
}

const participantRoleBadges = {
  moderator: copy.moderatorBadge,
  vip: copy.vipBadge,
  og: copy.ogBadge,
  founder: copy.founderBadge,
} as const;

function getParticipantRoleBadges(roles: Participant["roles"]) {
  return roles.flatMap((role) =>
    role in participantRoleBadges
      ? [participantRoleBadges[role as keyof typeof participantRoleBadges]]
      : [],
  );
}

function shouldShowMissingStatusBadge(participant: Participant) {
  return (
    participant.followerStatus === "not-following" &&
    !participant.isSubscriber &&
    participant.roles.length === 0
  );
}

const ambientBackdropItems = [
  {
    Icon: TicketIcon,
    left: "4%",
    top: "14%",
    size: 56,
    x: "18px",
    y: "24px",
    rotate: "8deg",
    duration: "18s",
    delay: "-4s",
  },
  {
    Icon: TrophyIcon,
    left: "18%",
    top: "72%",
    size: 62,
    x: "-14px",
    y: "-28px",
    rotate: "-10deg",
    duration: "22s",
    delay: "-8s",
  },
  {
    Icon: SparklesIcon,
    left: "31%",
    top: "18%",
    size: 42,
    x: "12px",
    y: "-20px",
    rotate: "12deg",
    duration: "16s",
    delay: "-6s",
  },
  {
    Icon: TicketIcon,
    left: "47%",
    top: "78%",
    size: 68,
    x: "20px",
    y: "-26px",
    rotate: "9deg",
    duration: "24s",
    delay: "-10s",
  },
  {
    Icon: TrophyIcon,
    left: "63%",
    top: "10%",
    size: 50,
    x: "-10px",
    y: "18px",
    rotate: "-7deg",
    duration: "19s",
    delay: "-2s",
  },
  {
    Icon: SparklesIcon,
    left: "76%",
    top: "58%",
    size: 46,
    x: "16px",
    y: "22px",
    rotate: "14deg",
    duration: "17s",
    delay: "-11s",
  },
  {
    Icon: TicketIcon,
    left: "88%",
    top: "22%",
    size: 60,
    x: "-18px",
    y: "20px",
    rotate: "-11deg",
    duration: "21s",
    delay: "-7s",
  },
  {
    Icon: TrophyIcon,
    left: "84%",
    top: "82%",
    size: 54,
    x: "-12px",
    y: "-18px",
    rotate: "6deg",
    duration: "20s",
    delay: "-14s",
  },
  {
    Icon: SparklesIcon,
    left: "56%",
    top: "36%",
    size: 38,
    x: "14px",
    y: "-16px",
    rotate: "-9deg",
    duration: "15s",
    delay: "-5s",
  },
] as const;

type AudienceFilterKey =
  | "subscriberFilter"
  | "moderatorFilter"
  | "vipFilter"
  | "ogFilter"
  | "founderFilter";

type MultiplierKey =
  | "subMultiplier"
  | "moderatorMultiplier"
  | "vipMultiplier"
  | "ogMultiplier"
  | "founderMultiplier";

type AudienceFilterConfig = {
  label: string;
  filterKey: AudienceFilterKey;
  multiplierKey: MultiplierKey;
  extraRange?: {
    label: string;
    valueKey: "subLengthMonths";
    min: number;
    max: number;
    suffix: string;
  };
};

const audienceFilterConfigs = [
  {
    label: copy.subscriberFilterLabel,
    filterKey: "subscriberFilter",
    multiplierKey: "subMultiplier",
    extraRange: {
      label: copy.subLengthLabel,
      valueKey: "subLengthMonths",
      min: 0,
      max: 60,
      suffix: copy.monthsShort,
    },
  },
  {
    label: copy.moderatorFilterLabel,
    filterKey: "moderatorFilter",
    multiplierKey: "moderatorMultiplier",
  },
  {
    label: copy.vipFilterLabel,
    filterKey: "vipFilter",
    multiplierKey: "vipMultiplier",
  },
  {
    label: copy.ogFilterLabel,
    filterKey: "ogFilter",
    multiplierKey: "ogMultiplier",
  },
  {
    label: copy.founderFilterLabel,
    filterKey: "founderFilter",
    multiplierKey: "founderMultiplier",
  },
] as const satisfies readonly AudienceFilterConfig[];

const animationOptions = [
  { value: "wheel", label: copy.animationWheel },
  { value: "slot-machine", label: copy.animationSlotMachine },
  { value: "char-scramble", label: copy.animationCharScramble },
] as const;

function AmbientBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {ambientBackdropItems.map((item, index) => {
        const style = {
          left: item.left,
          top: item.top,
          width: `${item.size}px`,
          height: `${item.size}px`,
          ["--ambient-x" as const]: item.x,
          ["--ambient-y" as const]: item.y,
          ["--ambient-rotate" as const]: item.rotate,
          ["--ambient-duration" as const]: item.duration,
          ["--ambient-delay" as const]: item.delay,
        } as CSSProperties;

        return (
          <div
            key={`${item.left}-${item.top}-${index}`}
            className="kick-ambient-glyph absolute flex items-center justify-center rounded-[1.25rem] border border-primary/7 bg-primary/[0.03] text-primary/12 shadow-[0_0_18px_rgba(83,255,118,0.04)]"
            style={style}
          >
            <item.Icon className="h-[58%] w-[58%]" strokeWidth={1.7} />
          </div>
        );
      })}
    </div>
  );
}

function ConnectView() {
  const { state, setChannelInput, connectChannel } = useGiveaway();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[80rem] items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-5xl space-y-5">
        <div className="mx-auto max-w-3xl space-y-2 text-center">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-primary/90">
            Live chat giveaway control
          </div>
          <div className="font-display text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            {copy.appTitle}
          </div>
          <div className="text-base text-white/74 sm:text-lg">
            {copy.appDescription}
          </div>
        </div>
        <Card size="sm" className="kick-panel overflow-hidden">
          <div className="absolute inset-0 bg-white/[0.015]" />
          <div className="relative">
            <CardHeader className="justify-items-center gap-3 px-6 pb-4 pt-8 text-center sm:px-10">
              <Badge variant="outline" className="kick-accent-chip bg-black/20">
                {copy.connectEyebrow}
              </Badge>
              <CardTitle className="max-w-3xl text-3xl font-semibold leading-[1] tracking-[-0.03em] text-white sm:text-4xl">
                {copy.connectTitle}
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-relaxed text-white/84 sm:text-lg">
                {copy.connectDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 pb-8 sm:px-10">
              <div className="mx-auto w-full max-w-3xl space-y-3">
                <Label className="text-center text-sm font-semibold tracking-[0.01em] text-white/92">
                  {copy.channelLabel}
                </Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    aria-label={copy.channelLabel}
                    value={state.channelInput}
                    onChange={(event) =>
                      setChannelInput(event.currentTarget.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void connectChannel();
                      }
                    }}
                    placeholder={copy.channelPlaceholder}
                    className="h-14 flex-1 rounded-xl border-primary/18 bg-black/30 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  />
                  <Button
                    size="lg"
                    onClick={() => void connectChannel()}
                    disabled={state.connectStatus === "loading"}
                    className="h-14 rounded-xl bg-primary px-6 text-primary-foreground shadow-[0_14px_36px_rgba(83,255,118,0.18)] hover:bg-primary/92 sm:min-w-48"
                  >
                    {state.connectStatus === "loading"
                      ? copy.connectingButton
                      : copy.connectButton}
                    <ArrowRightIcon />
                  </Button>
                </div>
              </div>
              {state.connectError ? (
                <div className="mx-auto w-full max-w-3xl">
                  <Alert variant="destructive">
                    <AlertCircleIcon />
                    <AlertTitle>{copy.connectErrorPrefix}</AlertTitle>
                    <AlertDescription>{state.connectError}</AlertDescription>
                  </Alert>
                </div>
              ) : null}
              <div className="grid gap-3 pt-1 md:grid-cols-3">
                <ConnectMetaCard
                  label={copy.landingFeatureDrawsTitle}
                  value={copy.landingFeatureDrawsText}
                />
                <ConnectMetaCard
                  label={copy.landingFeatureRolesTitle}
                  value={copy.landingFeatureRolesText}
                />
                <ConnectMetaCard
                  label={copy.landingFeatureMemoryTitle}
                  value={copy.landingFeatureMemoryText}
                />
              </div>
            </CardContent>
          </div>
        </Card>
        <div className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-white/76">
          {copy.connectViewFooter}
        </div>
      </div>
    </main>
  );
}

function ConnectMetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="kick-subpanel flex h-full flex-col rounded-[1rem] px-4 py-3.5 text-left">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-primary/95">
        {label}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-white/84 sm:text-base">
        {value}
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof UsersIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="kick-accent-chip rounded-lg p-1.5">
          <Icon className="size-4.5" />
        </div>
        <div>
          <div className="text-lg font-semibold tracking-[0.02em] text-white sm:text-[1.2rem]">
            {title}
          </div>
          {description ? (
            <p className="text-sm leading-relaxed text-white/82">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function AudienceFilterField({
  label,
  value,
  disabled,
  onChange,
  children,
}: {
  label: string;
  value: AudienceFilterMode;
  disabled: boolean;
  onChange: (value: AudienceFilterMode) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="kick-subpanel rounded-[1.1rem] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-semibold tracking-[0.02em] text-white">
          {label}
        </Label>
        <ToggleGroup
          type="single"
          value={value === "any" ? "" : value}
          onValueChange={(next) =>
            onChange((next || "any") as AudienceFilterMode)
          }
          className="rounded-full border border-white/8 bg-black/34 p-px"
        >
          <ToggleGroupItem
            value="include"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label={`${label}: ${copy.audienceModeInclude}`}
            className="h-6 min-w-6 rounded-full border-transparent px-1 text-emerald-200/80 hover:border-emerald-400/25 hover:bg-emerald-400/12 hover:text-emerald-100 data-[state=on]:border-emerald-400/30 data-[state=on]:bg-emerald-400/18 data-[state=on]:text-emerald-100"
          >
            <CheckIcon className="size-3" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="required"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label={`${label}: ${copy.audienceModeRequired}`}
            className="h-6 min-w-6 rounded-full border-transparent px-1 text-sky-200/80 hover:border-sky-400/25 hover:bg-sky-400/12 hover:text-sky-100 data-[state=on]:border-sky-400/30 data-[state=on]:bg-sky-400/18 data-[state=on]:text-sky-100"
          >
            <ShieldIcon className="size-3" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="exclude"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label={`${label}: ${copy.audienceModeExclude}`}
            className="h-6 min-w-6 rounded-full border-transparent px-1 text-destructive/80 hover:border-destructive/25 hover:bg-destructive/12 hover:text-destructive data-[state=on]:border-destructive/30 data-[state=on]:bg-destructive/15 data-[state=on]:text-destructive"
          >
            <XIcon className="size-3" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {children ? <div className="mt-2.5">{children}</div> : null}
    </div>
  );
}

function SettingsFields({ disabled }: { disabled: boolean }) {
  const { state, currentSettings, updateSettings } = useGiveaway();
  const followLengthMax = state.currentChannel?.followLengthMaxDays ?? 0;
  const setSetting = <K extends keyof GiveawaySettings>(
    key: K,
    value: GiveawaySettings[K],
  ) => {
    updateSettings({ [key]: value } as Pick<GiveawaySettings, K>);
  };

  return (
    <div className="space-y-4">
      <Accordion
        type="multiple"
        defaultValue={["entry-rules", "audience-filters", "draw-behavior"]}
        className="space-y-3"
      >
        <AccordionItem
          value="entry-rules"
          className="kick-subpanel overflow-hidden rounded-[1.2rem]"
        >
          <AccordionTrigger className="px-3.5 py-3 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="kick-accent-chip rounded-lg p-1.5">
                <TicketIcon className="size-4" />
              </div>
              <span className="text-sm font-semibold tracking-[0.02em] text-white">
                {copy.entryRulesSection}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3.5 pb-3.5 pt-1">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label
                  htmlFor="keyword"
                  className="text-sm font-semibold tracking-[0.02em] text-white"
                >
                  {copy.keywordLabel}
                </Label>
                <Input
                  id="keyword"
                  aria-label={copy.keywordLabel}
                  disabled={disabled}
                  value={currentSettings.keyword}
                  onChange={(event) =>
                    setSetting(
                      "keyword",
                      event.currentTarget.value.toLowerCase(),
                    )
                  }
                  placeholder={copy.anyMessage}
                  className="h-10 rounded-xl border-white/12 bg-black/30"
                />
              </div>
              <RangeField
                label={copy.winnerCountLabel}
                value={currentSettings.winnerCount}
                min={1}
                max={10}
                disabled={disabled}
                suffix=""
                onChange={(value) => setSetting("winnerCount", value)}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="audience-filters"
          className="kick-subpanel overflow-hidden rounded-[1.2rem]"
        >
          <AccordionTrigger className="px-3.5 py-3 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="kick-accent-chip rounded-lg p-1.5">
                <ShieldCheckIcon className="size-4" />
              </div>
              <span className="text-sm font-semibold tracking-[0.02em] text-white">
                {copy.audienceFiltersSection}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3.5 pb-3.5 pt-1">
            <div className="space-y-3">
              {audienceFilterConfigs.map((config) => {
                const filterValue = currentSettings[config.filterKey];
                const multiplierDisabled =
                  disabled || filterValue === "exclude";
                const extraRange =
                  "extraRange" in config ? config.extraRange : undefined;

                return (
                  <AudienceFilterField
                    key={config.filterKey}
                    label={config.label}
                    value={filterValue}
                    disabled={disabled}
                    onChange={(value) => setSetting(config.filterKey, value)}
                  >
                    <div className="space-y-3">
                      <RangeField
                        label={copy.multiplierLabel}
                        value={currentSettings[config.multiplierKey]}
                        min={1}
                        max={10}
                        disabled={multiplierDisabled}
                        suffix="x"
                        onChange={(value) =>
                          setSetting(config.multiplierKey, value)
                        }
                      />
                      {extraRange ? (
                        <RangeField
                          label={extraRange.label}
                          value={currentSettings[extraRange.valueKey]}
                          min={extraRange.min}
                          max={extraRange.max}
                          disabled={multiplierDisabled}
                          suffix={extraRange.suffix}
                          onChange={(value) =>
                            setSetting(extraRange.valueKey, value)
                          }
                        />
                      ) : null}
                    </div>
                  </AudienceFilterField>
                );
              })}
              <div className="kick-subpanel rounded-[1.1rem] p-3.5">
                <RangeField
                  label={copy.followLengthLabel}
                  value={currentSettings.followLengthDays}
                  min={0}
                  max={followLengthMax}
                  disabled={disabled}
                  suffix={copy.daysShort}
                  onChange={(value) => setSetting("followLengthDays", value)}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="draw-behavior"
          className="kick-subpanel overflow-hidden rounded-[1.2rem]"
        >
          <AccordionTrigger className="px-3.5 py-3 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="kick-accent-chip rounded-lg p-1.5">
                <SparklesIcon className="size-4" />
              </div>
              <span className="text-sm font-semibold tracking-[0.02em] text-white">
                {copy.drawBehaviorSection}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3.5 pb-3.5 pt-1">
            <div className="space-y-3">
              <ToggleField
                label={copy.winnerClaimLabel}
                checked={currentSettings.winnerClaim}
                disabled={disabled || currentSettings.winnerCount > 1}
                onChange={(checked) => setSetting("winnerClaim", checked)}
              />
              <RangeField
                label={copy.claimDurationLabel}
                value={currentSettings.claimDurationSeconds}
                min={10}
                max={180}
                disabled={
                  disabled ||
                  !currentSettings.winnerClaim ||
                  currentSettings.winnerCount > 1
                }
                suffix={copy.secondsShort}
                onChange={(value) => setSetting("claimDurationSeconds", value)}
              />
              <RangeField
                label={copy.spinDurationLabel}
                value={currentSettings.spinDurationSeconds}
                min={2}
                max={30}
                disabled={disabled}
                suffix={copy.secondsShort}
                onChange={(value) => setSetting("spinDurationSeconds", value)}
              />
              <div className="space-y-2">
                <Label
                  htmlFor="animation"
                  className="text-sm font-semibold tracking-[0.02em] text-white"
                >
                  {copy.animationLabel}
                </Label>
                <select
                  id="animation"
                  value={currentSettings.animation}
                  disabled={disabled}
                  onChange={(event) =>
                    setSetting(
                      "animation",
                      event.currentTarget
                        .value as GiveawaySettings["animation"],
                    )
                  }
                  className="h-10 w-full rounded-xl border border-white/12 bg-black/30 px-3 text-sm text-white outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {animationOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-[#0c140e]"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  disabled,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-semibold tracking-[0.02em] text-white">
          {label}
        </Label>
        <Badge variant="outline" className="kick-accent-chip bg-transparent">
          {suffix ? `${value} ${suffix}` : value}
        </Badge>
      </div>
      <Slider
        disabled={disabled}
        min={min}
        max={Math.max(min, max)}
        value={[value]}
        onValueChange={(next) =>
          onChange(Array.isArray(next) ? (next[0] ?? min) : (next ?? min))
        }
      />
    </div>
  );
}

function ToggleField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="kick-subpanel flex items-center justify-between gap-3 rounded-[1.1rem] p-3.5">
      <Label className="text-sm font-semibold tracking-[0.02em] text-white">
        {label}
      </Label>
      <Switch
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

function ParticipantsPanel() {
  const {
    state,
    currentSettings,
    startGiveaway,
    drawWinners,
    resetSession,
    setMobileSettingsOpen,
    openConfirmDialog,
  } = useGiveaway();
  const participantList = state.session.participantOrder
    .map((key) => state.session.participantsByKey[key])
    .filter(Boolean);
  const uniqueEntriesLeft = new Set(state.session.entries).size;
  const drawDisabled =
    !state.session.running ||
    state.session.drawInProgress ||
    uniqueEntriesLeft === 0;

  const keyword =
    state.session.frozenSettings?.keyword ?? currentSettings.keyword;

  return (
    <Card size="sm" className="kick-panel">
      <CardHeader>
        <SectionHeading
          icon={UsersIcon}
          title={copy.liveGiveaway}
          action={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-primary/18 bg-black/24 text-white hover:bg-primary/12 hover:text-white"
                onClick={() => setMobileSettingsOpen(true)}
              >
                <Settings2Icon />
                {copy.mobileSettings}
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={() => openConfirmDialog("change-channel")}
              >
                {copy.headerChangeChannel}
              </Button>
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={() => openConfirmDialog("clear-all-data")}
              >
                <EraserIcon />
                {copy.headerClearData}
              </Button>
            </div>
          }
        />
      </CardHeader>
      <CardContent className="space-y-2.5">
        <Alert
          variant={getStatusTone(state.session.connectionStatus)}
          className={cn(
            "border-white/8 bg-black/24 transition-colors",
            state.session.connectionStatus === "lost" &&
              "border-destructive/35 bg-destructive/8",
            state.session.connectionStatus === "connected" &&
              "border-primary/25 bg-primary/8",
          )}
        >
          {state.session.connectionStatus === "lost" ? (
            <AlertCircleIcon />
          ) : (
            <RadioTowerIcon className="text-primary" />
          )}
          <AlertTitle className="flex items-center justify-between gap-3">
            <span className="font-semibold text-white">
              {state.currentChannel?.slug}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em]",
                state.session.connectionStatus === "connected" &&
                  "border-primary/30 bg-primary/12 text-primary",
                state.session.connectionStatus === "lost" &&
                  "border-destructive/30 bg-destructive/10 text-destructive",
                state.session.connectionStatus !== "connected" &&
                  state.session.connectionStatus !== "lost" &&
                  "border-white/12 bg-white/8 text-white/82",
              )}
            >
              {state.session.connectionStatus === "connected" ? (
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
              ) : null}
              {getConnectionBadgeLabel(state.session.connectionStatus)}
            </span>
          </AlertTitle>
          <AlertDescription>
            {getStatusMessage(state.session.connectionStatus, keyword)}
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="kick-accent-chip bg-transparent">
            {keyword === "" ? copy.anyMessage : `"${keyword}"`}
          </Badge>
          <Badge variant="outline">
            {state.session.participantOrder.length} {copy.participantsTitle}
          </Badge>
          <Badge variant="outline">
            {uniqueEntriesLeft} unique entries left
          </Badge>
        </div>

        <div className="kick-subpanel rounded-[1.15rem] p-3">
          <div className="mb-2 flex items-center justify-between px-0.5">
            <div className="font-semibold text-white">
              {copy.participantsTitle}
            </div>
            <Badge variant="secondary">{participantList.length}</Badge>
          </div>
          <ScrollArea className="h-[17rem] lg:h-[19rem]">
            <div className="space-y-2 pr-1">
              {participantList.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/12 p-4 text-center text-base leading-relaxed text-white/86">
                  {copy.noParticipants}
                </div>
              ) : (
                participantList.map((participant) => (
                  <div
                    key={participant.key}
                    className="kick-soft-panel flex items-center justify-between rounded-xl px-3.5 py-2.5"
                  >
                    <div className="font-medium text-white">
                      {participant.name}
                    </div>
                    <div className="flex gap-2">
                      {participant.followerStatus === "follower" ? (
                        <Badge
                          variant="outline"
                          className="border-sky-500/30 bg-sky-500/10 text-sky-100"
                        >
                          {copy.followerBadge}
                        </Badge>
                      ) : null}
                      {getParticipantRoleBadges(participant.roles).map(
                        (role) => (
                          <Badge
                            key={`${participant.key}-${role}`}
                            variant="outline"
                            className="kick-accent-chip"
                          >
                            {role}
                          </Badge>
                        ),
                      )}
                      {participant.isSubscriber ? (
                        <Badge className="bg-primary text-primary-foreground">
                          {copy.subscribersBadge(participant.entryCount)}
                        </Badge>
                      ) : null}
                      {participant.subscriptionMonths > 0 ? (
                        <Badge variant="outline">
                          {participant.subscriptionMonths} {copy.monthsShort}
                        </Badge>
                      ) : null}
                      {shouldShowMissingStatusBadge(participant) ? (
                        <Badge
                          variant="destructive"
                          className="border border-destructive/35"
                        >
                          <XIcon />
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter className="sticky bottom-0 mt-auto flex gap-2.5 border-t-0 bg-black/22 pt-0 backdrop-blur-xl">
        {state.session.running ? (
          <>
            <Button
              data-testid="draw-button"
              size="lg"
              onClick={() => void drawWinners()}
              disabled={drawDisabled}
              className="h-10 flex-1 rounded-xl bg-primary text-primary-foreground shadow-[0_14px_36px_rgba(83,255,118,0.16)] hover:bg-primary/92"
            >
              {copy.drawButton}
            </Button>
            <Button
              data-testid="reset-session-button"
              size="lg"
              variant="destructive"
              onClick={resetSession}
              disabled={state.session.drawInProgress}
              className="h-10 rounded-xl"
            >
              {copy.resetSessionButton}
            </Button>
          </>
        ) : (
          <Button
            data-testid="start-giveaway-button"
            size="lg"
            onClick={startGiveaway}
            className="h-10 w-full rounded-xl bg-primary text-primary-foreground shadow-[0_14px_36px_rgba(83,255,118,0.16)] hover:bg-primary/92"
          >
            {copy.startGiveawayButton}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function WinnersPanel() {
  const { currentWinners } = useGiveaway();

  return (
    <Card size="sm" className="kick-panel xl:sticky xl:top-5">
      <CardHeader>
        <SectionHeading
          icon={TrophyIcon}
          title={copy.resultsRail}
          action={<Badge variant="secondary">{currentWinners.length}</Badge>}
        />
      </CardHeader>
      <CardContent>
        <div className="kick-subpanel rounded-[1.15rem] p-3">
          <ScrollArea className="h-[16rem] lg:h-[18rem]">
            <div className="space-y-2 pr-1">
              {currentWinners.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/12 p-4 text-center text-base leading-relaxed text-white/86">
                  {copy.noWinners}
                </div>
              ) : (
                [...currentWinners].reverse().map((winner) => (
                  <div
                    key={`${winner.name}-${winner.timestamp}`}
                    className="kick-soft-panel rounded-xl p-3"
                  >
                    <div className="space-y-2">
                      <div className="break-all font-semibold leading-snug text-white">
                        {winner.name}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm text-white/82">
                          {formatTimestamp(winner.timestamp)}
                        </div>
                        <Badge
                          variant={
                            winner.claimStatus === "confirmed"
                              ? "default"
                              : winner.claimStatus === "failed"
                                ? "destructive"
                                : "outline"
                          }
                          className={
                            winner.claimStatus === "confirmed"
                              ? "bg-primary text-primary-foreground"
                              : ""
                          }
                        >
                          {formatClaimStatus(winner.claimStatus)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}

function DrawOverlay() {
  const {
    state,
    currentSettings,
    revealDrawCard,
    dismissDrawCard,
    acknowledgeClaim,
  } = useGiveaway();
  const overlay = state.session.drawOverlay;
  const claim = state.session.claim;
  const animationMode =
    state.session.frozenSettings?.animation ?? currentSettings.animation;
  const animationDurationSeconds =
    state.session.frozenSettings?.spinDurationSeconds ??
    currentSettings.spinDurationSeconds;

  if (!overlay) {
    return null;
  }

  return (
    <div
      data-testid="draw-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="kick-panel w-full max-w-5xl rounded-[1.35rem]">
        {claim ? (
          <>
            <div className="px-5 py-4">
              <div className="text-[1.35rem] font-semibold tracking-[0.02em] text-white">
                {copy.claimTitle}
              </div>
            </div>
            <Separator />
            <div className="grid gap-4 p-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
              <OverlayChatPanel
                title="Winner chat"
                entries={claim.chatLog}
                emptyText={copy.claimChatEmpty}
                heightClassName="h-[24rem]"
              />
              <SingleWinnerClaimPanel
                pool={overlay.poolSnapshot}
                animationMode={animationMode}
                animationDurationSeconds={animationDurationSeconds}
                winnerName={claim.winnerName}
                status={claim.status}
                remainingSeconds={claim.remainingSeconds}
                claimDurationSeconds={claim.durationSeconds}
                onAcknowledge={
                  claim.status !== "pending" ? acknowledgeClaim : undefined
                }
              />
            </div>
          </>
        ) : (
          <>
            {overlay.cards.length === 1 ? (
              <div className="grid gap-4 p-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
                <OverlayChatPanel
                  title="Winner chat"
                  entries={overlay.cards[0]?.chatLog ?? []}
                  emptyText={copy.overlayEmptyChat}
                  heightClassName="h-[24rem]"
                />
                <SingleWinnerRevealPanel
                  card={overlay.cards[0]}
                  pool={overlay.poolSnapshot}
                  animationMode={animationMode}
                  animationDurationSeconds={animationDurationSeconds}
                  claimAfterReveal={overlay.claimAfterClose}
                  onReveal={() => revealDrawCard(overlay.cards[0]!.id)}
                  onDismiss={() => dismissDrawCard(overlay.cards[0]!.id)}
                />
              </div>
            ) : (
              <div className="grid gap-3 p-3.5 lg:grid-cols-2 xl:grid-cols-3">
                {overlay.cards.map((card) => (
                  <DrawCard
                    key={card.id}
                    card={card}
                    pool={overlay.poolSnapshot}
                    animationMode={animationMode}
                    animationDurationSeconds={animationDurationSeconds}
                    onReveal={() => revealDrawCard(card.id)}
                    onDismiss={() => dismissDrawCard(card.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function OverlayChatPanel({
  title,
  entries,
  emptyText,
  heightClassName,
}: {
  title: string;
  entries: { id: string; username: string; content: string }[];
  emptyText: string;
  heightClassName: string;
}) {
  return (
    <div className="kick-subpanel rounded-[1.2rem]">
      <div className="px-3 py-2.5 text-sm font-semibold tracking-[0.02em] text-white">
        {title}
      </div>
      <Separator />
      <ScrollArea className={heightClassName}>
        <div className="space-y-2 p-3">
          {entries.length === 0 ? (
            <div className="text-base text-white/86">{emptyText}</div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-xl border border-white/8 bg-white/4 p-3"
              >
                <div className="text-sm font-semibold tracking-[0.02em] text-primary">
                  {entry.username}
                </div>
                <div className="mt-1 text-base text-white/88">
                  {entry.content}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function SingleWinnerRevealPanel({
  card,
  pool,
  animationMode,
  animationDurationSeconds,
  claimAfterReveal,
  onReveal,
  onDismiss,
}: {
  card: {
    id: string;
    winnerKey: string | null;
    winnerName: string | null;
    chatLog: { id: string; username: string; content: string }[];
    revealed: boolean;
    acknowledged: boolean;
  };
  pool: string[];
  animationMode: "wheel" | "slot-machine" | "char-scramble";
  animationDurationSeconds: number;
  claimAfterReveal: boolean;
  onReveal: () => void;
  onDismiss: () => void;
}) {
  const [ready, setReady] = useState(false);

  return (
    <Card
      size="sm"
      className={cn(
        "kick-soft-panel h-full",
        card.acknowledged && "opacity-40",
      )}
    >
      <CardContent className="flex-1">
        <DrawAnimation
          mode={animationMode}
          pool={pool}
          winner={card.winnerName}
          durationSeconds={animationDurationSeconds}
          size="tall"
          landed={ready}
          onDone={() => {
            setReady(true);
            onReveal();
          }}
        />
      </CardContent>
      {claimAfterReveal ? null : (
        <CardFooter className="bg-transparent">
          <Button
            onClick={onDismiss}
            disabled={!card.winnerName || !ready || card.acknowledged}
            variant="destructive"
            className="h-10 w-full rounded-xl"
          >
            Continue
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function SingleWinnerClaimPanel({
  pool,
  animationMode,
  animationDurationSeconds,
  winnerName,
  status,
  remainingSeconds,
  claimDurationSeconds,
  onAcknowledge,
}: {
  pool: string[];
  animationMode: "wheel" | "slot-machine" | "char-scramble";
  animationDurationSeconds: number;
  winnerName: string;
  status: "pending" | "confirmed" | "failed";
  remainingSeconds: number;
  claimDurationSeconds: number;
  onAcknowledge?: () => void;
}) {
  return (
    <Card size="sm" className="kick-soft-panel">
      <CardContent className="space-y-4">
        <DrawAnimation
          mode={animationMode}
          pool={pool}
          winner={winnerName}
          durationSeconds={animationDurationSeconds}
          settled
          landed
        />
        <div className="kick-subpanel rounded-[1.1rem] px-4 py-3">
          {status === "pending" ? (
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
                <span>Countdown</span>
                <span className="text-primary">{remainingSeconds}s</span>
              </div>
              <div
                className="h-2.5 overflow-hidden rounded-full border border-white/8 bg-white/6"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-700 ease-linear"
                  style={{
                    width: `${Math.max(0, Math.min(100, (remainingSeconds / claimDurationSeconds) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ) : null}
          <div className="text-sm text-white/72">Confirmation</div>
          <div className="mt-1 text-base text-white/88">
            {status === "pending"
              ? copy.claimPending(winnerName, remainingSeconds)
              : status === "confirmed"
                ? copy.claimConfirmed
                : copy.claimFailed}
          </div>
        </div>
      </CardContent>
      {onAcknowledge ? (
        <CardFooter className="bg-transparent">
          <Button
            onClick={onAcknowledge}
            variant="destructive"
            className="h-10 w-full rounded-xl"
          >
            {copy.claimAcknowledge}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function DrawCard({
  card,
  pool,
  animationMode,
  animationDurationSeconds,
  onReveal,
  onDismiss,
}: {
  card: {
    id: string;
    winnerKey: string | null;
    winnerName: string | null;
    chatLog: { id: string; username: string; content: string }[];
    revealed: boolean;
    acknowledged: boolean;
  };
  pool: string[];
  animationMode: "wheel" | "slot-machine" | "char-scramble";
  animationDurationSeconds: number;
  onReveal: () => void;
  onDismiss: () => void;
}) {
  const [ready, setReady] = useState(false);

  return (
    <Card
      size="sm"
      className={cn("kick-soft-panel", card.acknowledged && "opacity-40")}
    >
      <CardContent className="space-y-4">
        <DrawAnimation
          mode={animationMode}
          pool={pool}
          winner={card.winnerName}
          durationSeconds={animationDurationSeconds}
          landed={ready}
          onDone={() => {
            setReady(true);
            onReveal();
          }}
        />
        <OverlayChatPanel
          title="Winner chat"
          entries={card.chatLog}
          emptyText={copy.overlayEmptyChat}
          heightClassName="h-24"
        />
      </CardContent>
      <CardFooter className="bg-transparent">
        <Button
          onClick={onDismiss}
          disabled={!card.winnerName || !ready || card.acknowledged}
          variant="destructive"
          className="h-10 w-full rounded-xl"
        >
          OK
        </Button>
      </CardFooter>
    </Card>
  );
}

function ConfirmDialog() {
  const {
    state,
    closeConfirmDialog,
    confirmChangeChannel,
    confirmClearAllData,
  } = useGiveaway();
  const open = Boolean(state.confirmDialog);
  const isClear = state.confirmDialog === "clear-all-data";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (!next ? closeConfirmDialog() : undefined)}
    >
      <DialogContent className="rounded-[1.75rem] border border-primary/16 bg-[#0c140e]">
        <DialogHeader>
          <DialogTitle>
            {isClear ? copy.clearDataTitle : copy.changeChannelTitle}
          </DialogTitle>
          <DialogDescription>
            {isClear
              ? copy.clearDataDescription
              : copy.changeChannelDescription}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-transparent">
          <Button variant="destructive" onClick={closeConfirmDialog}>
            {copy.cancel}
          </Button>
          <Button
            variant="destructive"
            onClick={isClear ? confirmClearAllData : confirmChangeChannel}
          >
            {copy.continue}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell() {
  const { state, setMobileSettingsOpen } = useGiveaway();

  useEffect(() => {
    document.title = copy.appTitle;
    const description = document.querySelector('meta[name="description"]');
    description?.setAttribute("content", copy.appDescription);
  }, []);

  return (
    <div className="relative overflow-hidden">
      <AmbientBackdrop />
      {state.screen === "connect" || !state.currentChannel ? (
        <ConnectView />
      ) : (
        <main className="mx-auto flex min-h-screen w-full max-w-[99rem] flex-col gap-4 px-4 py-5 sm:px-6">
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
            <ParticipantsPanel />
            <WinnersPanel />
          </div>

          <Sheet
            open={state.mobileSettingsOpen}
            onOpenChange={(open) => setMobileSettingsOpen(open)}
          >
            <SheetContent
              side="left"
              showCloseButton={false}
              className="overflow-y-auto border-r border-primary/16 bg-[#0b120d]/98 p-4 sm:max-w-xl xl:max-w-[34rem]"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <SheetTitle className="text-[1.35rem] font-semibold tracking-[0.02em] text-white sm:text-[1.5rem]">
                  {copy.controlDeck}
                </SheetTitle>
                <SheetClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-lg"
                    />
                  }
                >
                  <XIcon />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>
              <SettingsFields disabled={state.session.running} />
            </SheetContent>
          </Sheet>

          <DrawOverlay />
          <ConfirmDialog />
        </main>
      )}
    </div>
  );
}
