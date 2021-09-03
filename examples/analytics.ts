import Analytics from "analytics";
import { DriftEventPayloads, DriftPluginEventHandlers } from "@/drift";
import analyticsDriftPlugin from "@/analyticsDriftPlugin";

const driftEventPlugin: DriftPluginEventHandlers = {
  "campaign:click": ({ eventPayload: { payload } }) => {
    console.log(payload.campaignId);
  },
  startConversation: ({ instance }) => {
    console.log("Start Conversation");
    void instance.track("Start Conversation");
  },
  emailCapture: ({ instance, eventPayload: { payload } }) => {
    void instance.identify(payload.data.email);
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
    driftEventPlugin,
  ],
});

export default analytics;
