import { AnalyticsPlugin, AnalyticsInstance } from "analytics";
import { DriftEventHandler, DriftEventPayloads } from "../drift";
import loadScript from "../loadScript";
import { assert, isBrowser } from "../utils";
import {
  AnalyticsDispatchedEvents,
  AnalyticsMethodParams,
  DriftPluginConfig,
} from "./pluginTypes";

const selectIdentityFunction = (
  identityType: DriftPluginConfig["identityType"]
) =>
  identityType === "userAttributes"
    ? window.drift.api.setUserAttributes.bind(window.drift.api)
    : window.drift.identify.bind(window.drift);

function callBaseMethod(
  payload: AnalyticsMethodParams["payload"],
  identityType?: DriftPluginConfig["identityType"]
) {
  assert(window.drift);
  if (payload.type === "page") {
    window.drift.page();
  } else if (payload.type === "identify") {
    selectIdentityFunction(identityType ?? "userAttributes")(payload.traits);
  } else if (payload.type === "track") {
    window.drift.track(payload.properties);
  }
}

function passAlongHistory(
  history: AnalyticsMethodParams[],
  identityType?: DriftPluginConfig["identityType"]
) {
  // do this async?
  history.forEach(({ payload }) => callBaseMethod(payload, identityType));
}

function handleEvent(
  loaded: boolean,
  params: AnalyticsMethodParams,
  history: AnalyticsMethodParams[],
  identityType?: DriftPluginConfig["identityType"]
) {
  let newHistory = [...history];
  if (loaded) {
    if (history.length) {
      // Because it's just drift it's okay that these events
      // show up at the exact same time as opposed to their
      // actual time. Although it is a definite drawback
      // of using the facade.
      passAlongHistory(history, identityType);
      newHistory = [];
    }
    callBaseMethod(params.payload, identityType);
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
  identityType,
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
              callBaseMethod(identificationEvent.payload, identityType);
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
            eventHistory = handleEvent(checkIsLoaded(), p, eventHistory);
          },
        }
      : {}),
    track: (p: AnalyticsMethodParams) => {
      console.log("track", p);
      eventHistory = handleEvent(checkIsLoaded(), p, eventHistory);
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
      // as the script takes a while to load
      // and is non essential
      // we don't want it blocking the entire
      // analytics instance from being ready
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
