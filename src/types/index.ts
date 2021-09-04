export type { AnalyticsPlugin, PageData } from "analytics";
import type { AnalyticsInstance, PageData } from "analytics";
export type { analyticsDriftPlugin } from "..";
import { Drift } from "./drift";

export interface AnalyticsInstanceWithDispatch extends AnalyticsInstance {
  dispatch: (action: Record<string, unknown>) => void;
}
export interface AnalyticsWithDriftPlugin extends AnalyticsInstance {
  plugins: {
    drift: {
      ready: () => void;
    };
  } & AnalyticsInstance["plugins"];
}

declare global {
  interface Window {
    drift: Drift.Instance; //| undefined;
    driftt: Drift.Instance; //| undefined;
  }
}

type DriftPluginEventHandler<K, D, P> = (arg: {
  type: K;
  instance: AnalyticsInstance;
  eventPayload: { payload: D; meta: P };
}) => void;

export type DriftPluginEventHandlers = {
  [K in keyof Drift.EventPayloads]?: DriftPluginEventHandler<
    K,
    Drift.EventPayloads[K][0],
    Drift.EventPayloads[K][1]
  >;
};

export type DriftEventHandler<D, P> = (data: D, payload?: P) => void;

type ScriptLoadType = "load" | "manual";
type BaseDriftPluginConfig = {
  driftId: string;
  scriptLoad?: ScriptLoadType;
  page?: boolean;
  events?: Set<keyof Drift.EventPayloads>;
};

type UserAttributesConfig = {
  identityType: "userAttributes";
  jwtResolver?: never;
};
type IdentifyConfig = {
  identityType: "identify";
  scriptLoad: "load";
  jwtResolver?: never;
};
export type SignedConfig = {
  identityType: "signed";
  scriptLoad: "load";
  jwtResolver: (userId: string) => Promise<string>;
};
export type DriftPluginConfig = BaseDriftPluginConfig &
  (UserAttributesConfig | IdentifyConfig | SignedConfig);

type Metadata = Record<string, unknown>;

type TrackPayload = {
  type: "track";
  event: string;
  properties: Metadata;
};
type PagePayload = {
  type: "page";
  properties: PageData;
};
export type IdentifyPayload = {
  type: "identify";
  traits: Metadata;
  userId: string;
};
export type AnalyticsMethodParams = {
  abort: (reason: string) => void;
  instance: AnalyticsInstanceWithDispatch;
  config: Record<string, unknown>;
  plugins: Record<string, unknown>;
  payload: TrackPayload | PagePayload | IdentifyPayload;
};
