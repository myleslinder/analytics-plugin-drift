import Analytics from "analytics";
import { DriftEventPayloads } from "./drift";
import analyticsDriftPlugin from "./plugin/analyticsDriftPlugin";

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
