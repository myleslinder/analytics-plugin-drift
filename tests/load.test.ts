import Analytics from "analytics";
import { analyticsDriftPlugin } from "../src/index";

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

// NSFW: https://www.youtube.com/watch?v=VHdJ9bbAfpc
describe("We do da loading", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    window.drift = undefined;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    window.driftt = undefined;
  });

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

    await new Promise<void>((resolve) => {
      analytics.on("ready", async () => {
        expect(jest.isMockFunction(window.drift.on)).toBe(true);
        expect(window.drift.on).toHaveBeenCalledTimes(1);
        expect((window.drift.on as jest.Mock).mock.calls).toHaveLength(1);
        await Promise.all(
          (window.drift.on as jest.Mock).mock.calls.map(
            ([eventName, handler = () => undefined]: [string, () => void]) => {
              if (eventName === "ready") {
                return handler();
              } else {
                return Promise.resolve();
              }
            }
          )
        );
        resolve();
      });
    });
    expect(window.drift).not.toBe(undefined);
    expect(window.drift.load).toHaveBeenCalledTimes(1);
    expect(window.drift.identify).not.toHaveBeenCalled();
  });

  test("it forwards calls placed before load completes", async () => {
    expect(window.drift).toBe(undefined);
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

    return new Promise<void>((resolve) => {
      analytics.on("ready", () => {
        resolve();
      });
    }).then(async () => {
      expect(window.drift).not.toBe(undefined);
      expect(window.drift.load).toHaveBeenCalledTimes(1);
      expect(jest.isMockFunction(window.drift.on)).toBe(true);
      expect(window.drift.on).toHaveBeenCalledTimes(1);
      expect(window.drift.identify).not.toHaveBeenCalled();
      expect(window.drift.track).not.toHaveBeenCalled();
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
      expect(window.drift.identify).toHaveBeenCalledTimes(1);
      expect(window.drift.track).toHaveBeenCalledTimes(1);
      await analytics.reset();
    });
  });

  test("it handles signed identity calls", async () => {
    const jwtResolver = jest.fn(async (userId: string) =>
      Promise.resolve(`someFakeJwt:${userId}`)
    );
    const plugin = analyticsDriftPlugin({
      driftId: "",
      identityType: "signed",
      scriptLoad: "load",
      page: false,
      jwtResolver,
    });
    const userId = "somefakeuserId";
    const analytics = Analytics({
      app: `Test-App`,
      version: "1",
      debug: false,
      plugins: [plugin],
      initialUser: {
        userId,
        traits: {
          fake: 1,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await analytics.identify(userId, { fakeAttr: 1 });

    const afterward = async () => {
      return new Promise<void>((resolve) => {
        analytics.on("ready", async () => {
          await analytics.track("Some Event", { fakeProp: 1 });
          resolve();
        });
      }).then(async () => {
        expect(window.drift).not.toBe(undefined);
        expect(window.drift.load).toHaveBeenCalledTimes(1);
        expect(window.drift.identify).toHaveBeenCalledTimes(1);
        expect(jwtResolver).toHaveBeenCalledTimes(1);
        expect(jwtResolver).toHaveBeenCalledWith(userId);
        expect(jest.isMockFunction(window.drift.on)).toBe(true);
        expect((window.drift.on as jest.Mock).mock.calls).toHaveLength(1);
        await Promise.all(
          (window.drift.on as jest.Mock).mock.calls.map(
            ([_, handler]: [unknown, () => Promise<void>]) => {
              return handler();
            }
          )
        );
        expect(window.drift.track).toHaveBeenCalledTimes(1);
        await analytics.reset();
      });
    };

    return await afterward();
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

    await new Promise<void>((resolve) => {
      analytics.on("ready", async () => {
        expect(jest.isMockFunction(window.drift.on)).toBe(true);
        await Promise.all(
          (window.drift.on as jest.Mock).mock.calls.map(
            ([_, handler]: [unknown, () => Promise<void>]) => {
              return handler();
            }
          )
        );
        await analytics.identify("someId", { fakeAttr: 1 });
        await analytics.track("Some Event", { fakeProp: 1 });
        resolve();
      });
    });

    expect(window.drift).not.toBe(undefined);
    expect(window.drift.load).toHaveBeenCalledTimes(1);
    expect(window.drift.identify).toHaveBeenCalledTimes(1);
    expect(window.drift.track).toHaveBeenCalled();
    await analytics.reset();
  });
});
