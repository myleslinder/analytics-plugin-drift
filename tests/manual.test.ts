import Analytics from "analytics";
import { analyticsDriftPlugin } from "../src/index";
import { AnalyticsWithDriftPlugin } from "~/types";

import { buildDriftMock } from "./__mocks__/drift";

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
        await Promise.all(
          (window.drift.on as jest.Mock).mock.calls.map(
            async ([eventName, handler = () => Promise.resolve()]: [
              string,
              () => Promise<void>
            ]) => {
              if (eventName === "ready") {
                return await handler();
              }
              return Promise.resolve();
            }
          )
        );
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
