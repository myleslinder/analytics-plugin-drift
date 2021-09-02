import Analytics from "analytics";
import {
  DriftEventHandlers,
  DriftEventName,
  DriftEventPayloads,
  DriftPluginEventHandlers,
} from "./drift";
import analyticsDriftPlugin from "./plugin/analyticsDriftPlugin";

const driftEventPlugin: DriftPluginEventHandlers = {
  "campaign:click": ({ eventPayload: { payload } }) => {},
  startConversation: (a) => {
    // track
    // maybe change something about UI?
    // maybe perform some kind of side effect
  },
};

const analytics = Analytics({
  app: `Test-App`,
  version: "1",
  debug: false,
  plugins: [
    analyticsDriftPlugin({
      driftId: "",
      identityType: "userAttributes",
      scriptLoad: "manual",
      page: false,
      events: new Set<keyof DriftEventPayloads>([
        "awayMessage:close",
        "campaign:open",
      ]),
    }),
  ],
});

export default analytics;
