import Analytics from "analytics";
import { DriftEventPayloads } from "./drift";
import analyticsDriftPlugin from "./plugin/analyticsDriftPlugin";

const plugin = {
  name: "plugin",
  identify: ({ payload }: { payload: { [k: string]: any } }) => {
    //
  },
  track: ({ payload }: { payload: { [k: string]: any } }) => {
    //isProd && window?.drift.track()
  },
};

const analytics = Analytics({
  app: `Test-App`,
  version: "1",
  debug: false,
  plugins: [
    analyticsDriftPlugin({
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
