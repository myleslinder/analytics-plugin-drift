import { AnalyticsPlugin, AnalyticsInstance } from "analytics";
import { DriftEventHandlers, DriftEventPayloads } from "../drift";
import { assert, isBrowser } from "../utils";
import {
  AnalyticsMethodParams,
  DriftPluginConfig,
  ScriptLoadType,
} from "./pluginTypes";

function loadScript(
  driftId: string | undefined,
  loadType: ScriptLoadType,
  identityType: DriftPluginConfig["identityType"],
  setLoaded: (b: boolean) => void
) {
  if (loadType === "load") {
    // load drift
    // then set loaded to true
  } else if (loadType === "manual") {
    // this cannot be the best way??
    // let id = setInterval(() => {
    //   console.log("check", id);
    //   if (window?.drift?.apiReady) {
    //     setLoaded(true);
    //     clearInterval(id);
    //     // reconcileHistory(eventHistory);
    //     // console.log(eventHistory);
    //   }
    // }, 1000);
  }
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

export default function analyticsDriftPlugin({
  driftId,
  identityType,
  scriptLoad = "load",
  page = false,
  events,
}: DriftPluginConfig): AnalyticsPlugin {
  let isLoaded = false;
  const scriptState = {
    loaded: false,
  };
  const checkIsLoaded = () => isBrowser && isLoaded; //window?.drift?.apiReady;
  const eventHistory: AnalyticsMethodParams[] = [];

  return {
    name: "drift-plugin",
    config: {},
    EVENTS: Array.from(events || []).reduce<{ [k: string]: string }>(
      (eventsObj, eventName) => {
        return { ...eventsObj, [`drift:${eventName}`]: eventName };
      },
      {}
    ),
    initialize: (p: AnalyticsMethodParams) => {
      console.log("init", p);
      loadScript(driftId, scriptLoad, identityType, (b) => (isLoaded = b));
      // register event handlers
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
      return isBrowser; //&& !!window?.drift?.apiReady;
    },
    methods: {
      ready(this: { instance: AnalyticsInstance }) {
        isLoaded = true;
      },
      events(
        this: { instance: AnalyticsInstance },
        eventHandlers: DriftEventHandlers
      ) {
        const instance = this.instance;
        instance.once("ready", () => {
          let keys = Object.keys(eventHandlers) as (keyof DriftEventPayloads)[];
          keys.forEach((eventName) => {
            window.drift.on(eventName, eventHandlers[eventName]);
          });
        });
      },
    },
  };
}
