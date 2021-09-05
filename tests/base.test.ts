import Analytics from "analytics";
import { analyticsDriftPlugin } from "../src/index";
import { AnalyticsWithDriftPlugin } from "~/types";
import { Drift } from "~/types/drift";
import { buildDriftMock } from "./__mocks__/drift";
import { buildAnalyticsInstance, buildListenerPlugin } from "./helpers";

const assignTo = () => {
  window.drift = buildDriftMock();
};
jest.mock("../src/index", () => {
  const mockWindow = jest.mock("../src/loadScript", () => {
    return {
      __esModule: true,
      default: () => {
        assignTo();
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

    const analytics = buildAnalyticsInstance([plugin]);
    await new Promise<void>((resolve) => {
      analytics.on("ready", async () => {
        await Promise.all(
          (window.drift.on as jest.Mock).mock.calls.map(
            async ([eventName, handler = () => Promise.resolve()]: [
              string,
              () => Promise<void>
            ]) => {
              if (eventName === "ready") {
                return await handler();
              } else {
                return Promise.resolve();
              }
            }
          )
        );
        void analytics.page();
        analytics.on("page", () => {
          resolve();
        });
      });
    });
    expect(window.drift.load).toHaveBeenCalledTimes(1);
    expect(window.drift.page).toHaveBeenCalledTimes(1);
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
    await Promise.all(
      (window.drift.on as jest.Mock).mock.calls.map(
        ([eventName, handler]: [string, () => Promise<void>]) => {
          if (eventName === "ready") {
            return handler();
          }
          return Promise.resolve();
        }
      )
    );

    await new Promise<void>((resolve) => {
      let eventCount = 0;

      analytics.on("ready", async () => {
        events.forEach((eventName, _, arr) => {
          analytics.on(eventName, () => {
            eventCount++;
            if (eventCount === arr.length) {
              resolve();
            }
          });
        });
        await Promise.all(
          (window.drift.on as jest.Mock).mock.calls.map(
            async ([eventName, handler = () => Promise.resolve()]: [
              string,
              () => Promise<void>
            ]) => {
              if (eventName !== "ready") {
                return await handler();
              }
              return Promise.resolve();
            }
          )
        );
      });
    });
    expect(window.drift.on).toHaveBeenCalledTimes(events.length + 1);
    events.forEach((eventName) => {
      expect(driftEventPlugin[eventName]).toHaveBeenCalled();
    });
    expect(window.drift.track).toHaveBeenCalledWith("Start Conversation", {});
  });
});
