import { AnalyticsPlugin, AnalyticsInstance, PageData } from "analytics";
import { DriftEventHandlers, DriftEventPayloads } from "../drift";
// either we load it on page load
// you call the ready() method
// or we poll for the lib's presence once a second
export type ScriptLoadType = "load" | "manual";
type BaseDriftPluginConfig = {
  driftId: string;
  scriptLoad?: ScriptLoadType;
  page?: boolean;
  events?: Set<keyof DriftEventPayloads>;
};

type UserAttributesDriftPluginConfig = {
  identityType: "userAttributes";
};
// if you pass `secured` or `identify`
// then we wait to load the drift script until
// you've called identify?
// we kind of need to know if you're going to call
// identify, what happens if you call this for SSR?
// so identify essentially 'logs' that user id into drift
// to restore their chats and what not
type IdentityDriftPluginConfig = {
  identityType: "identify";
  scriptLoad: "load";
};
export type SecureDriftPluginConfig = {
  identityType: "secured";
  scriptLoad: "load";
  jwtResolver: (userId: string) => Promise<string>;
};
export type DriftPluginConfig = BaseDriftPluginConfig &
  (
    | UserAttributesDriftPluginConfig
    | IdentityDriftPluginConfig
    | SecureDriftPluginConfig
  );

//// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Metadata = Record<string, any>;

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
  instance: AnalyticsInstance;
  config: {};
  plugins: {};
  payload: TrackPayload | PagePayload | IdentifyPayload;
};

type AnalyticsDispatchedEventKey = `drift:${keyof DriftEventPayloads}`;

export type AnalyticsDispatchedEvents = {
  [K in AnalyticsDispatchedEventKey]: boolean;
};

//export type DriftBaseMethod = (payload: AnalyticsMethodParams["payload"], identityType?: DriftPluginConfig["identityType"]) => {}
