import Analytics from "analytics";
import { DriftEventPayloads } from "~/types/drift";

import { analyticsDriftPlugin } from "~/index";
import { DriftPluginEventHandlers } from "~/types";

const driftEventPlugin: DriftPluginEventHandlers = {
  "campaign:click": ({ eventPayload: { payload } }) => {
    console.log(payload.campaignId);
  },
  startConversation: async ({ instance }) => {
    await instance.track("Start Conversation");
  },
  emailCapture: async ({ instance, eventPayload: { payload } }) => {
    await instance.identify(payload.data.email);
  },
};

const analytics = Analytics({
  app: `Test-App`,
  version: "1",
  debug: false,
  plugins: [
    analyticsDriftPlugin({
      driftId: "someIdhere",
      identityType: "userAttributes",
      scriptLoad: "manual",
      page: false,
      events: new Set<keyof DriftEventPayloads>([
        "awayMessage:close",
        "campaign:open",
      ]),
    }),
    driftEventPlugin,
  ],
});

export default analytics;
