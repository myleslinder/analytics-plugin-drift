/* eslint-disable @typescript-eslint/require-await */
import Analytics, { AnalyticsInstance } from "analytics";
import { analyticsDriftPlugin } from "../src/index";
import {
  DriftPluginEventHandlers,
  AnalyticsPlugin,
  AnalyticsWithDriftPlugin,
} from "~/types";
import { Drift } from "~/types/drift";
import {
  DriftEventPayloads,
  driftmock,
  registeredHandlers,
} from "../src/__mocks__/drift";

jest.mock("../src/index", () => {
  jest.mock("../src/loadScript");
  return jest.requireActual("../src/index");
});
beforeEach(() => {
  //
});
afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  window.drift = undefined;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  window.driftt = undefined;
});

describe("Analytics Drift Plugin", () => {
  test("it respects the page config", async () => {
    const plugin = analyticsDriftPlugin({
      driftId: "",
      identityType: "userAttributes",
      scriptLoad: "load",
      page: false,
    });
    const analytics = Analytics({
      app: `Test-App`,
      version: "1",
      debug: false,
      plugins: [plugin],
    });
    void analytics.page();
    return () => {
      expect(window?.drift?.page).not.toHaveBeenCalled();
    };
  });

  test("it dispatches drift events to the plugin system", async () => {
    const driftEventPlugin: AnalyticsPlugin & DriftPluginEventHandlers = {
      name: "listener-plugin",
      "campaign:click": jest.fn(),
      startConversation: jest.fn(
        ({ instance }: { instance: AnalyticsInstance }) => {
          void instance.track("Start Conversation");
        }
      ),
      emailCapture: jest.fn(),
    };

    const events: (keyof Drift.EventPayloads)[] = Object.keys(
      driftEventPlugin
    ).filter((k) => k !== "name") as (keyof Drift.EventPayloads)[];

    const plugin = analyticsDriftPlugin({
      driftId: "",
      identityType: "userAttributes",
      scriptLoad: "manual",
      page: false,
      events: new Set(events),
    });

    const analytics: AnalyticsWithDriftPlugin = Analytics({
      app: `Test-App`,
      version: "1",
      debug: false,
      plugins: [plugin, driftEventPlugin],
    }) as AnalyticsWithDriftPlugin;

    window.drift = driftmock;

    analytics.plugins.drift.ready();

    return () => {
      expect(window.drift.on).toHaveBeenCalledTimes(events.length + 1);
      events.forEach((eventName) => {
        registeredHandlers[eventName]?.forEach((handler) => handler());
      });
      events.forEach((eventName, i) => {
        expect(events[i]).toHaveBeenCalledWith(DriftEventPayloads[eventName]);
      });
      expect(window.drift?.track).toHaveBeenCalledWith("Start Conversation");
    };
  });

  describe("Manual loading", () => {
    test("it does not load drift", async () => {
      const plugin = analyticsDriftPlugin({
        driftId: "",
        identityType: "userAttributes",
        scriptLoad: "manual",
        page: false,
      });
      Analytics({
        app: `Test-App`,
        version: "1",
        debug: false,
        plugins: [plugin],
      });
      return () => expect(window.drift).toBe(undefined);
    });

    test("it does not forward events to drift until ready", async () => {
      const plugin = analyticsDriftPlugin({
        driftId: "",
        identityType: "userAttributes",
        scriptLoad: "manual",
        page: false,
      });
      const analytics = Analytics({
        app: `Test-App`,
        version: "1",
        debug: false,
        plugins: [plugin],
      }) as AnalyticsWithDriftPlugin;

      const trackedEvents = [
        {
          name: "Fake Event",
          properties: { fakeProp: 1 },
        },
        {
          name: "Fake Event 2",
          properties: { fakeProp: 2 },
        },
      ];

      void analytics.identify("someId", { fakeAttr: 1 });
      void analytics.track(trackedEvents[0].name, trackedEvents[0].properties);
      expect(window.drift).toBe(undefined);
      window.drift = driftmock;
      const mocks = [
        window.drift.track,
        window.drift.identify,
        window.drift.api.setUserAttributes,
      ];
      mocks.forEach((mock) => expect(mock).not.toHaveBeenCalled());
      analytics.plugins.drift.ready();
      void analytics.track(trackedEvents[1].name, trackedEvents[1].properties);
      return () => {
        expect(window.drift.track).toHaveBeenCalledTimes(trackedEvents.length);
        if (jest.isMockFunction(window.drift.track)) {
          window.drift.track.mock.calls.forEach((call, i) => {
            expect(call).toContainEqual(trackedEvents[i]);
          });
        } else {
          throw new Error("Drift track method not mocked");
        }
        expect(window.drift.identify).toHaveBeenCalledTimes(0);
        expect(window.drift.api.setUserAttributes).toHaveBeenCalledTimes(1);
      };
    });
  });

  describe("We do da loading", () => {
    test("it loads drift", async () => {
      expect(window.drift).toBe(undefined);
      const plugin = analyticsDriftPlugin({
        driftId: "",
        identityType: "userAttributes",
        scriptLoad: "load",
        page: false,
      });
      Analytics({
        app: `Test-App`,
        version: "1",
        debug: false,
        plugins: [plugin],
      });
      return () => {
        expect(window.drift).not.toBe(undefined);
        expect(window.drift.load).toHaveBeenCalledTimes(1);
        expect(window.drift.identify).not.toHaveBeenCalled();
      };
    });

    test("it forwards calls placed before load completes", async () => {
      const plugin = analyticsDriftPlugin({
        driftId: "",
        identityType: "identify",
        scriptLoad: "load",
        page: false,
      });
      const analytics = Analytics({
        app: `Test-App`,
        version: "1",
        debug: false,
        plugins: [plugin],
      });

      void analytics.identify("someId", { fakeAttr: 1 });
      void analytics.track("Some Event", { fakeProp: 1 });
      return () => {
        expect(window.drift).not.toBe(undefined);
        expect(window.drift.load).toHaveBeenCalledTimes(1);
        expect(window.drift.identify).toHaveBeenCalledTimes(1);
        expect(window.drift.track).toHaveBeenCalledTimes(1);
      };
    });
    test("it forwards all calls after load", async () => {
      const plugin = analyticsDriftPlugin({
        driftId: "",
        identityType: "identify",
        scriptLoad: "load",
        page: false,
      });
      const analytics = Analytics({
        app: `Test-App`,
        version: "1",
        debug: false,
        plugins: [plugin],
      });

      void analytics.identify("someId", { fakeAttr: 1 });
      void analytics.track("Some Event", { fakeProp: 1 });
      return () => {
        expect(window.drift).not.toBe(undefined);
        expect(window.drift.load).toHaveBeenCalledTimes(1);
        expect(window.drift.identify).toHaveBeenCalledTimes(1);
        expect(window.drift.track).toHaveBeenCalledTimes(1);
      };
    });
  });
});
