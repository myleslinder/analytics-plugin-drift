/* eslint-disable @typescript-eslint/require-await */
import Analytics from "analytics";
import { analyticsDriftPlugin } from "../src/index";
import { AnalyticsWithDriftPlugin } from "~/types";
import { Drift } from "~/types/drift";
import { buildDriftMock, registeredHandlers } from "../src/__mocks__/drift";
import { buildAnalyticsInstance, buildListenerPlugin } from "./helpers";
const assignTo = () => {
  window.drift = buildDriftMock();
  console.log("loaded drift from script");
};
jest.mock("../src/index", () => {
  const mockWindow = jest.mock("../src/loadScript", () => {
    return {
      __esModule: true,
      default: () => {
        assignTo();
        console.log("returnign true");
        return true;
      },
    };
  });
  return jest.requireActual("../src/index");
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  window.drift = undefined;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  window.driftt = undefined;

  //resetRegisteredHandlers();
});

describe("Analytics Drift Plugin", () => {
  test("page config", async () => {
    const plugin = analyticsDriftPlugin({
      driftId: "",
      identityType: "userAttributes",
      scriptLoad: "load",
      page: true,
    });
    // expect(
    //   Object.prototype.hasOwnProperty.call(analyticsDriftPlugin, "page")
    // ).toBeTruthy();
    const analytics = buildAnalyticsInstance([plugin]);
    await new Promise<void>((resolve) => {
      analytics.on("ready", async () => {
        await Promise.all(registeredHandlers?.ready.map((h) => h()));
        void analytics.page();
        analytics.on("page", () => {
          resolve();
        });
      });
    });
    expect(window.drift.page).toHaveBeenCalled();
  });

  test("it dispatches drift events to the plugin system", async () => {
    const driftEventPlugin = buildListenerPlugin();

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

    window.drift = buildDriftMock();
    analytics.plugins.drift.ready();

    await new Promise<void>((resolve) => {
      let eventCount = 0;

      analytics.on("ready", async () => {
        await Promise.all(registeredHandlers?.ready.map((h) => h()));

        events.forEach((eventName, _, arr) => {
          analytics.on(eventName, () => {
            eventCount++;
            if (eventCount === arr.length) {
              resolve();
            }
          });
          registeredHandlers[eventName]?.forEach((handler) => {
            handler();
          });
        });
      });
    });
    expect(window.drift.on).toHaveBeenCalledTimes(events.length + 1);
    events.forEach((eventName) => {
      expect(driftEventPlugin[eventName]).toHaveBeenCalled();
    });
    expect(window.drift.track).toHaveBeenCalledWith("Start Conversation", {});
  });

  describe("Manual loading", () => {
    test("it does not load drift", async () => {
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
      });
      await new Promise<void>((resolve) => {
        analytics.on("ready", () => {
          resolve();
        });
        expect(window.drift).toBe(undefined);
      });
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

      await new Promise<void>((resolve) => {
        analytics.on("ready", async () => {
          await analytics.identify("someId", { fakeAttr: 1 });
          await analytics.track(
            trackedEvents[0].name,
            trackedEvents[0].properties
          );
          expect(window.drift).toBe(undefined);
          window.drift = buildDriftMock();
          const mocks = [
            window.drift.track,
            window.drift.identify,
            window.drift.api.setUserAttributes,
          ];
          mocks.forEach((mock) => expect(mock).not.toHaveBeenCalled());
          analytics.plugins.drift.ready();
          await Promise.all(registeredHandlers?.ready.map((h) => h()));
          await analytics.track(
            trackedEvents[1].name,
            trackedEvents[1].properties
          );
          resolve();
        });
      });
      expect(window.drift.api.setUserAttributes).toHaveBeenCalledTimes(1);
      expect(window.drift.track).toHaveBeenCalledTimes(trackedEvents.length);
      if (jest.isMockFunction(window.drift.track)) {
        window.drift.track.mock.calls.forEach((call: [unknown, unknown], i) => {
          expect(call[0]).toEqual(trackedEvents[i].name);
          expect(call[1]).toMatchObject(trackedEvents[i].properties);
        });
      } else {
        throw new Error("Drift track method not mocked");
      }
      expect(window.drift.identify).toHaveBeenCalledTimes(0);
    });
  });

  // NSFW: https://www.youtube.com/watch?v=VHdJ9bbAfpc
  describe("We do da loading", () => {
    test("it loads drift", async () => {
      expect(window.drift).toBe(undefined);
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

      return new Promise<void>((resolve) => {
        analytics.on("ready", async () => {
          await Promise.all(registeredHandlers?.ready.map((h) => h()));
          resolve();
        });
      }).then(() => {
        expect(window.drift).not.toBe(undefined);
        expect(window.drift.load).toHaveBeenCalledTimes(1);
        expect(window.drift.identify).not.toHaveBeenCalled();
      });
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
      await new Promise<void>((resolve) => {
        analytics.on("ready", async () => {
          expect(window.drift).not.toBe(undefined);
          await analytics.identify("someId", { fakeAttr: 1 });
          await analytics.track("Some Event", { fakeProp: 1 });
          await Promise.all(registeredHandlers?.ready.map((h) => h()));
          resolve();
        });
      });
      expect(window.drift.load).toHaveBeenCalledTimes(1);
      expect(window.drift.identify).toHaveBeenCalledTimes(1);
      expect(window.drift.track).toHaveBeenCalledTimes(1);
    });

    test("it handles signed identity calls", async () => {
      const jwtResolver = jest.fn(
        async (userId: string) => `someFakeJwt:${userId}`
      );
      const plugin = analyticsDriftPlugin({
        driftId: "",
        identityType: "signed",
        scriptLoad: "load",
        page: false,
        jwtResolver,
      });
      const analytics = Analytics({
        app: `Test-App`,
        version: "1",
        debug: false,
        plugins: [plugin],
      });
      const userId = "somefakeuserId";

      await analytics.identify(userId, { fakeAttr: 1 });
      await analytics.track("Some Event", { fakeProp: 1 });
      await new Promise<void>((resolve) => {
        analytics.on("ready", async () => {
          await Promise.all(registeredHandlers?.ready.map((h) => h()));
          resolve();
        });
      });
      expect(window.drift).not.toBe(undefined);
      expect(window.drift.load).toHaveBeenCalledTimes(1);
      expect(window.drift.identify).toHaveBeenCalledTimes(1);
      expect(jwtResolver).toHaveBeenCalledTimes(1);
      expect(jwtResolver).toHaveBeenCalledWith(userId);
      expect(window.drift.track).toHaveBeenCalledTimes(1);
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

      await analytics.identify("someId", { fakeAttr: 1 });
      await analytics.track("Some Event", { fakeProp: 1 });
      await new Promise<void>((resolve) => {
        analytics.on("ready", async () => {
          await Promise.all(registeredHandlers?.ready.map((h) => h()));
          resolve();
        });
      });
      expect(window.drift).not.toBe(undefined);
      expect(window.drift.load).toHaveBeenCalledTimes(1);
      expect(window.drift.identify).toHaveBeenCalledTimes(1);
      expect(window.drift.track).toHaveBeenCalledTimes(1);
    });
  });
});
