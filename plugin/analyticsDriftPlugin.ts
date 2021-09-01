import { AnalyticsPlugin, AnalyticsInstance } from "analytics";
import {
  DriftEventHandler,
  DriftEventHandlers,
  DriftEventPayloads,
} from "../drift";
import { assert, isBrowser } from "../utils";
import {
  AnalyticsDispatchedEvents,
  AnalyticsMethodParams,
  DriftPluginConfig,
} from "./pluginTypes";

function loadScript() {
  if (window.drift) return false;

  !(function () {
    const t = (window.driftt = window.drift = window.driftt || []);
    if (!t.init) {
      if (t.invoked) {
        return void (
          window.console &&
          console.error &&
          console.error("Drift snippet included twice.")
        );
      }
      //eslint-disable-next-line  @typescript-eslint/no-extra-semi
      (t.invoked = !0),
        (t.methods = [
          "identify",
          "config",
          "track",
          "reset",
          "debug",
          "show",
          "ping",
          "page",
          "hide",
          "off",
          "on",
        ]),
        (t.factory = function (e: any) {
          return function () {
            const n = Array.prototype.slice.call(arguments);
            return n.unshift(e), t.push(n), t;
          };
        }),
        t.methods.forEach(function (e: any) {
          t[e] = t.factory(e);
        }),
        (t.load = function (t: any) {
          const e = 3e5,
            n = Math.ceil((new Date() as any) / e) * e,
            o = document.createElement("script");
          (o.type = "text/javascript"),
            (o.async = !0),
            (o.crossOrigin = "anonymous"),
            (o.src = "https://js.driftt.com/include/" + n + "/" + t + ".js");
          const i = document.getElementsByTagName("script")[0];
          i.parentNode?.insertBefore(o, i);
        });
    }
  })();
  window.drift.SNIPPET_VERSION = "0.3.1";
  return true;
}

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
    const identityFunction = selectIdentityFunction(
      identityType ?? "userAttributes"
    );
    identityFunction(payload.traits);
  } else if (payload.type === "track") {
    window.drift.track(payload.properties);
  }
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
      history.forEach(({ payload }) => callBaseMethod(payload, identityType));
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
    let passAlong = {
      [!payload ? "payload" : "api"]: data,
      ...(payload ? { payload } : {}),
    };
    instance.dispatch({
      type: `drift:${eventName}`,
      ...{ passAlong },
    });
  };
  window.drift.on(eventName, handler);
}

function registerEvents(
  instance: AnalyticsInstance,
  events: DriftPluginConfig["events"]
) {
  Array.from(events || []).map(async (eventName) => {
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
  const eventHistory: AnalyticsMethodParams[] = [];

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
            const identificationEvent = eventHistory.find(
              ({ payload: { type } }) => type === "identify"
            );
            if (identificationEvent) {
              callBaseMethod(identificationEvent.payload, identityType);
              window.drift.load(driftId);
            }
          }

          window.drift.on("ready", () => {
            isLoaded = true;
            registerEvents(p.instance, events);
          });
        }
      }
    },
    ...(page
      ? {
          page: (p: AnalyticsMethodParams) => {
            console.log("PAGE", p);
            handleEvent(checkIsLoaded(), p, eventHistory);
          },
        }
      : {}),
    track: (p: AnalyticsMethodParams) => {
      console.log("track", p);
      handleEvent(checkIsLoaded(), p, eventHistory);
    },
    identify: (p: AnalyticsMethodParams) => {
      console.log("ident", p);
      handleEvent(checkIsLoaded(), p, eventHistory, identityType);
    },
    loaded: () => {
      return isBrowser;
      //&& (scriptLoad === "manual" ? true : isLoaded);
    },
    methods: {
      ready(this: { instance: AnalyticsInstance }) {
        isLoaded = true;
        registerEvents(this.instance, events);
      },
    },
  };
}
