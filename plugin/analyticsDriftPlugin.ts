import { AnalyticsPlugin, AnalyticsInstance } from "analytics";
import { DriftEventHandler, DriftEventPayloads } from "../drift";
import loadScript from "../loadScript";
import { assert, isBrowser } from "../utils";
import {
  AnalyticsDispatchedEvents,
  AnalyticsMethodParams,
  DriftPluginConfig,
} from "./pluginTypes";

export default function analyticsDriftPlugin({
  driftId,
  identityType = "userAttributes",
  scriptLoad = "load",
  page = false,
  events,
  jwtResolver,
}: DriftPluginConfig): AnalyticsPlugin {
  let isLoaded = false;

  const checkIsLoaded = () => isBrowser && isLoaded;
  let eventHistory: AnalyticsMethodParams[] = [];

  const selectIdentityFunction = () =>
    identityType === "userAttributes"
      ? window.drift.api.setUserAttributes.bind(window.drift.api)
      : window.drift.identify.bind(window.drift);

  function callBaseMethod(payload: AnalyticsMethodParams["payload"]) {
    assert(window.drift);
    if (payload.type === "page") {
      window.drift.page();
    } else if (payload.type === "track") {
      window.drift.track(payload.properties);
    } else if (payload.type === "identify") {
      const identityFunction = selectIdentityFunction();
      if (identityType !== "userAttributes") {
        if (identityType === "signed") {
          if (!jwtResolver) {
            throw new Error("No jwt resolver provided");
          }
          return jwtResolver(payload.userId).then((jwt) => {
            identityFunction(payload.userId, payload.traits, { jwt });
            if (!window.drift.hasInitialized) {
              window.drift.load("driftId");
            }
          });
        } else {
          identityFunction(payload.userId, payload.traits);
        }
      } else {
        identityFunction(payload.traits);
      }
      payload.traits;
    }
  }

  function passAlongHistory(history: AnalyticsMethodParams[]) {
    // do this async?
    history.forEach(({ payload }) => callBaseMethod(payload));
  }

  function handleEvent(
    loaded: boolean,
    params: AnalyticsMethodParams,
    history: AnalyticsMethodParams[]
  ) {
    let newHistory = [...history];
    if (loaded) {
      if (history.length) {
        passAlongHistory(history);
        newHistory = [];
      }
      callBaseMethod(params.payload);
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
        type: eventName,
        eventPayload,
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

  return {
    name: "drift-plugin",
    config: {},
    EVENTS: Array.from(events || []).reduce<AnalyticsDispatchedEvents | {}>(
      (eventsObj, eventName) => {
        return { ...eventsObj, [eventName]: eventName };
      },
      {}
    ),
    initialize: (p: AnalyticsMethodParams) => {
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
              // remove all identify events so they're not duplicated
              // when the history is flushed after load
              eventHistory = eventHistory.filter(
                (event) => event.payload.type !== "identify"
              );
              // directly call base method so the event history isn't flushed
              const maybePromise = callBaseMethod(identificationEvent.payload);
              if (maybePromise) {
                maybePromise.then(() => {
                  if (!window.drift.hasInitialized) {
                    window.drift.load(driftId);
                  }
                });
              }
            }
          }

          window.drift.on("ready", () => {
            isLoaded = true;
            passAlongHistory(eventHistory);
            registerEvents(p.instance, events);
          });
        }
      }
    },
    ...(page
      ? {
          page: (p: AnalyticsMethodParams) => {
            eventHistory = handleEvent(checkIsLoaded(), p, eventHistory);
          },
        }
      : {}),
    track: (p: AnalyticsMethodParams) => {
      eventHistory = handleEvent(checkIsLoaded(), p, eventHistory);
    },
    identify: (p: AnalyticsMethodParams) => {
      eventHistory = handleEvent(checkIsLoaded(), p, eventHistory);
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
