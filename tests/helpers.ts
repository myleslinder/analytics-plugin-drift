import { Analytics, AnalyticsInstance } from "analytics";
import {
  AnalyticsPlugin,
  AnalyticsWithDriftPlugin,
  DriftPluginEventHandlers,
} from "~/types";

export const buildAnalyticsInstance = (
  plugins: Record<string, unknown>[]
): AnalyticsWithDriftPlugin => {
  return Analytics({
    app: `Test-App`,
    version: "1",
    debug: false,
    plugins,
  }) as AnalyticsWithDriftPlugin;
};

export const buildListenerPlugin = () => {
  const driftEventPlugin: AnalyticsPlugin & DriftPluginEventHandlers = {
    name: "listener-plugin",
    "campaign:click": jest.fn(),
    startConversation: jest.fn(
      async ({ instance }: { instance: AnalyticsInstance }) => {
        await instance.track("Start Conversation");
      }
    ),
    emailCapture: jest.fn(),
  };
  return driftEventPlugin;
};
