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
    console.log("base metohd", payload.type);
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
    return promise;
  }

  async function passAlongHistory(history: AnalyticsMethodParams[]) {
    return Promise.all(
      history.map(async ({ payload }) =>
        handleBaseMethodError(callBaseMethod(payload))
      )
    );
  }

  async function handleEvent(
    loaded: boolean,
    params: AnalyticsMethodParams,
    history: AnalyticsMethodParams[]
  ) {
    let newHistory = [...history];

    if (loaded) {
      if (history.length) {
        await passAlongHistory(history);
        newHistory = [];
      }

      await handleBaseMethodError(callBaseMethod(params.payload));
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
    initialize: async (p: AnalyticsMethodParams) => {
      if (scriptLoad === "load") {
        const loaded = loadScript();
        console.log("loaded=", loaded);
        if (loaded) {
          if (identityType === "userAttributes") {
            window.drift.load(driftId);
          } else {
            const user =
              (p.instance.user() as {
                userId: string;
                traits: Record<string, unknown>;
              }) || {};
            if (user.userId) {
              await callBaseMethod({
                type: "identify",
                userId: user.userId,
                traits: user.traits,
              });

              eventHistory = eventHistory.filter(
                (event) => event.payload.type !== "identify"
              );
              console.log(eventHistory);
            }

            if (!window.drift.hasInitialized) {
              window.drift.load(driftId);
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          window.drift.on("ready", async () => {
            isLoaded = true;
            await passAlongHistory(eventHistory);
            registerEvents(p.instance, events);
          });
        }
      }
    },
    ...(page
      ? {
          page: async (p: AnalyticsMethodParams) => {
            eventHistory = await handleEvent(checkIsLoaded(), p, eventHistory);
          },
        }
      : {}),
    track: async (p: AnalyticsMethodParams) => {
      eventHistory = await handleEvent(checkIsLoaded(), p, eventHistory);
    },
    identify: async (p: AnalyticsMethodParams) => {
      console.log("identify");
      eventHistory = await handleEvent(checkIsLoaded(), p, eventHistory);
    },
    loaded: () => {
      return isBrowser;
    },
    methods: {
      ready(this: { instance: AnalyticsInstanceWithDispatch }) {
        assert(!!window.drift);

        // wrap in a ready call in case this gets called
        // on script load, and not drift ready

        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        window.drift.on("ready", async () => {
          isLoaded = true;
          await passAlongHistory(eventHistory);
          eventHistory = [];
          registerEvents(this.instance, events);
          return undefined;
        });
      },
    },
  };
}
