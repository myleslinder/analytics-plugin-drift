import type {
  AnalyticsInstanceWithDispatch,
  AnalyticsPlugin,
  DriftEventHandler,
} from "~/types";

import { assert, isBrowser } from "./utils";
import loadScript from "./loadScript";
import { AnalyticsMethodParams, DriftPluginConfig } from "~/types";
import { Drift } from "./types/drift";

export function analyticsDriftPlugin({
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

  async function callBaseMethod(payload: AnalyticsMethodParams["payload"]) {
    assert(!!window.drift);
    if (payload.type === "page") {
      window.drift.page();
    } else if (payload.type === "track") {
      window.drift.track(payload.event, payload.properties);
    } else if (payload.type === "identify") {
      if (identityType !== "userAttributes") {
        if (identityType === "signed") {
          if (!jwtResolver) {
            throw new Error("No jwt resolver provided");
          }
          return await jwtResolver(payload.userId).then((jwt) => {
            window.drift.identify(payload.userId, payload.traits, { jwt });
            if (!window.drift.hasInitialized) {
              window.drift.load("driftId");
            }
          });
        } else {
          window.drift.identify(payload.userId, payload.traits);
        }
      } else {
        window.drift.api.setUserAttributes(payload.traits);
      }
      payload.traits;
    }
  }

  function handleBaseMethodError(promise: Promise<void>) {
    promise.catch((e) => {
      // eventHistory.push(initialPayload)
      console.error(e);
    });
  }

  function passAlongHistory(history: AnalyticsMethodParams[]) {
    // do this async?
    history.forEach(({ payload }) =>
      handleBaseMethodError(callBaseMethod(payload))
    );
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
      handleBaseMethodError(callBaseMethod(params.payload));
    } else {
      newHistory.push(params);
    }

    return newHistory;
  }

  function registerEvent<T extends keyof Drift.EventPayloads>(
    instance: AnalyticsInstanceWithDispatch,
    eventName: T
  ) {
    const handler: DriftEventHandler<
      Drift.EventPayloads[T][0],
      Drift.EventPayloads[T][1]
    > = (data, payload) => {
      const eventPayload = {
        [!payload ? "payload" : "api"]: data,
        ...(payload ? { payload } : {}),
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      instance.dispatch({
        type: eventName,
        eventPayload,
      });
      return undefined;
    };
    window.drift.on(eventName, handler);
  }

  function registerEvents(
    instance: AnalyticsInstanceWithDispatch,
    events: DriftPluginConfig["events"]
  ) {
    // async?
    Array.from(events || []).map((eventName) => {
      return registerEvent(instance, eventName);
    });
  }

  return {
    name: "drift",
    config: {},
    EVENTS: Array.from(events || []).reduce<Record<string, string>>(
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
              const methodPromise = callBaseMethod(identificationEvent.payload);

              handleBaseMethodError(
                methodPromise.then(() => {
                  if (!window.drift.hasInitialized) {
                    window.drift.load(driftId);
                  }
                })
              );
            }
          }

          window.drift.on("ready", () => {
            isLoaded = true;
            passAlongHistory(eventHistory);
            registerEvents(p.instance, events);
            return undefined;
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
      ready(this: { instance: AnalyticsInstanceWithDispatch }) {
        assert(!!window.drift);

        // wrap in a ready call in case this gets called
        // on script load, and not drift ready
        window.drift.on("ready", () => {
          isLoaded = true;

          passAlongHistory(eventHistory);
          registerEvents(this.instance, events);
          return undefined;
        });
      },
    },
  };
}
