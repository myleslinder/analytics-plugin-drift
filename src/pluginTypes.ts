import { AnalyticsInstance, PageData } from "analytics";
import { DriftEventPayloads } from "@/drift";

type ScriptLoadType = "load" | "manual";
type BaseDriftPluginConfig = {
  driftId: string;
  scriptLoad?: ScriptLoadType;
  page?: boolean;
  events?: Set<keyof DriftEventPayloads>;
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
  instance: AnalyticsInstance;
  config: Record<string, unknown>;
  plugins: Record<string, unknown>;
  payload: TrackPayload | PagePayload | IdentifyPayload;
};

//export type DriftBaseMethod = (payload: AnalyticsMethodParams["payload"], identityType?: DriftPluginConfig["identityType"]) => {}
