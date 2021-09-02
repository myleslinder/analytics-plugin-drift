import { AnalyticsPlugin, AnalyticsInstance } from "analytics";
import { DriftEventHandler, DriftEventPayloads } from "../drift";
import loadScript from "../loadScript";
import { assert, isBrowser } from "../utils";
import {
  AnalyticsDispatchedEvents,
  AnalyticsMethodParams,
  DriftPluginConfig,
  SecureDriftPluginConfig,
} from "./pluginTypes";

const selectIdentityFunction = (
  identityType: DriftPluginConfig["identityType"]
) =>
  identityType === "userAttributes"
    ? window.drift.api.setUserAttributes.bind(window.drift.api)
    : window.drift.identify.bind(window.drift);

function callBaseMethod(
  payload: AnalyticsMethodParams["payload"],
  identity?: {
    type: DriftPluginConfig["identityType"];
    jwtResolver?: SecureDriftPluginConfig["jwtResolver"];
  }
) {
  assert(window.drift);
  if (payload.type === "page") {
    window.drift.page();
  } else if (payload.type === "identify") {
    if (!identity) {
      console.error("No identity info");
      return;
    }
    const identityFunction = selectIdentityFunction(identity.type);
    if (identity.type !== "userAttributes") {
      if (identity.type === "secured") {
        if (!identity.jwtResolver) {
          throw new Error("No jwt resolver provided");
        }
        identity
          .jwtResolver(payload.userId)
          .then((jwt) =>
            identityFunction(payload.userId, payload.traits, { jwt })
          );
      } else {
        identityFunction(payload.userId, payload.traits);
      }
    } else {
      identityFunction(payload.traits);
    }
    payload.traits;
  } else if (payload.type === "track") {
    window.drift.track(payload.properties);
  }
}

function passAlongHistory(
  history: AnalyticsMethodParams[],
  identityType: DriftPluginConfig["identityType"]
) {
  // do this async?
  history.forEach(({ payload }) =>
    callBaseMethod(payload, { type: identityType })
  );
}

function handleEvent(
  loaded: boolean,
  params: AnalyticsMethodParams,
  history: AnalyticsMethodParams[],
  identityType: DriftPluginConfig["identityType"]
) {
  let newHistory = [...history];
  if (loaded) {
    if (history.length) {
      passAlongHistory(history, identityType);
      newHistory = [];
    }
    callBaseMethod(params.payload, { type: identityType });
  } else {
    newHistory.push(params);
  }
  return newHistory;
}

function registerEvent<T extends keyof DriftEventPayloads>(
  instance: AnalyticsInstance,
  eventName: T
) {
  let handler: DriftEventHandler<
    DriftEventPayloads[T][0],
    DriftEventPayloads[T][1]
  > = (data, payload) => {
    let eventPayload = {
      [!payload ? "payload" : "api"]: data,
      ...(payload ? { payload } : {}),
    };
    instance.dispatch({
      type: `drift:${eventName}`,
      ...{ eventPayload },
    });
  };
  window.drift.on(eventName, handler);
}

function registerEvents(
  instance: AnalyticsInstance,
  events: DriftPluginConfig["events"]
) {
  // async?
  Array.from(events || []).map((eventName) => {
    return registerEvent(instance, eventName);
  });
}

export default function analyticsDriftPlugin({
  driftId,
  identityType = "userAttributes",
  scriptLoad = "load",
  page = false,
  events,
}: DriftPluginConfig): AnalyticsPlugin {
  let isLoaded = false;

  const checkIsLoaded = () => isBrowser && isLoaded;
  let eventHistory: AnalyticsMethodParams[] = [];

  return {
    name: "drift-plugin",
    config: {},
    EVENTS: Array.from(events || []).reduce<AnalyticsDispatchedEvents | {}>(
      (eventsObj, eventName) => {
        return { ...eventsObj, [`drift:${eventName}`]: eventName };
      },
      {}
    ),
    initialize: (p: AnalyticsMethodParams) => {
      console.log("init", p);
      if (scriptLoad === "load") {
        const loaded = loadScript();
        if (loaded) {
          if (identityType === "userAttributes") {
            window.drift.load(driftId);
          } else {
            // reverse the array since its chronological so we find the last one
            // in case there's multiple calls prior to load
            const identificationEvent = eventHistory
              .reverse()
              .find(({ payload: { type } }) => type === "identify");
            if (identificationEvent) {
              // directly call base method so the event history isn't flushed
              callBaseMethod(identificationEvent.payload, {
                type: identityType,
              });
              // remove all identify events so they're not duplicated
              // when the history is flushed after load
              eventHistory = eventHistory.filter(
                (event) => event.payload.type !== "identify"
              );
              window.drift.load(driftId);
            }
          }

          window.drift.on("ready", () => {
            isLoaded = true;
            passAlongHistory(eventHistory, identityType);
            registerEvents(p.instance, events);
          });
        }
      }
    },
    ...(page
      ? {
          page: (p: AnalyticsMethodParams) => {
            console.log("PAGE", p);
            eventHistory = handleEvent(
              checkIsLoaded(),
              p,
              eventHistory,
              identityType
            );
          },
        }
      : {}),
    track: (p: AnalyticsMethodParams) => {
      console.log("track", p);
      eventHistory = handleEvent(
        checkIsLoaded(),
        p,
        eventHistory,
        identityType
      );
    },
    identify: (p: AnalyticsMethodParams) => {
      console.log("identify", p);
      eventHistory = handleEvent(
        checkIsLoaded(),
        p,
        eventHistory,
        identityType
      );
    },
    loaded: () => {
      return isBrowser;
    },
    methods: {
      ready(this: { instance: AnalyticsInstance }) {
        // wrap in a ready call in case this gets called
        // on script load, and not drift ready
        window.drift.on("ready", () => {
          isLoaded = true;
          // maybe don't pass along history as that will happen as
          // soon as the next event occurs, although that leaves room for error
          // passAlongHistory(eventHistory, identityType);
          registerEvents(this.instance, events);
        });
      },
    },
  };
}
