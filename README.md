# Analytics Plugin for Drift

This library exports the Drift plugin for the [analytics package](https://github.com/DavidWells/analytics).

After initializing analytics with this Drift plugin, data will be sent to Drift whenever `analytics.track`, `analytics.identify`, or (optionally) `analytics.page` are called. For `analytics.identify()` this plugin supports secured identities, regular identities, or just setting user attributes.

## Installation

```bash
    npm install analytics analytics-plugin-drift
    # or with yarn
    yarn add analytics analytics-plugin-drift
```

## How to use

This plugin works in the browser and is a no-op on the server.

Example usage:

```js
import analyticsDriftPlugin from "analytics-plugin-drift";

const analytics = Analytics({
  app: `Your-App-Name`,
  version: "your-app-version",
  debug: false,
  plugins: [
    analyticsDriftPlugin({
      identityType: "userAttributes",
      scriptLoad: "load",
      page: false,
      events: new Set(["awayMessage:close", "campaign:open"]),
    }),
  ],
});
```

**TypeScript**

```ts
import analyticsDriftPlugin, { DriftEventName } from "analytics-plugin-drift";

const analytics = Analytics({
  app: `Your-App-Name`,
  version: "your-app-version",
  debug: false,
  plugins: [
    analyticsDriftPlugin({
      identityType: "userAttributes",
      scriptLoad: "load",
      page: false,
      events: new Set<DriftEventName>(["awayMessage:close", "campaign:open"]),
    }),
  ],
});
```

### Initialization Config Options

The default export function accepts an object with the following shape:

```ts
{
  driftId: string;
  scriptLoad?: "load" | "manual"; // default is "load"
  identityType: "userAttributes" | "identify" | "secured"
  page?: boolean; // default is false
  events?: Set<DriftEventName>;
  jwtResolver?: (userId: string) => Promise<string>; // only relevant if identityType = "secured"
}
```

- `driftId` is the embed id found in your account here [LINK to finding it]
- `scriptLoad` is either "load" or "manual"
  - "load" will have the plugin load the script
  - "manual" will not load the script and you must inform the plugin once the script is loaded
- `identityType` is one of "userAttributes", "identify", or "secured" and indicates what Drift method should be called when `analytics.identify()` is called.
- `page` is a boolean value whether or not to forward `analytics.page()` calls to drift. Drift automatically tracks pages, so this is for manually telling Drift that the page has changed. You likely want this to be `false`, for more information see [the Drift docs](https://devdocs.drift.com/docs/contact-properties#driftpage)
- `events` is a set of `DriftEventName` [LINK to types] to determine which Drift events should be propagated to the rest of the plugin system [LINK to explain more]
- `jwtResolver` is a function that returns a promise resolving to the jwt to pass along to `drift.identify()`

### Script Loading Behavior

Loading and initializing the Drift script is slow, and as a result this plugin will begin accepting events from `analytics` before the script has loaded, regardless of the `scriptLoad` option you provide.

To ensure that no `track()`, `page()` or `identify()` calls are lost if they occur before the script is ready the plugin maintains a history of events and will forward them on to Drift once it's available.

#### "load"

This option will begin loading the drift script upon initialization of the `analytics` instance.

#### "manual"

This option is helpful if you're using a facade, such as [link] react-live-chat-loader, to defer the loading of the Drift script (link to chrome docs on this as well). With this option the plugin will store all events recieved until you tell the plugin that the script has loaded, using `ready()`. Once Drift is available then the event history is forwarded to drift in chronological order.

One potential drawback of using a facade is that events tracked prior to loading the script will all be tracked in Drift with nearly the same timestamp as opposed to their actual time.

**Calling ready()**

There's a named export called setDriftReady or something like that. Call this method once the drift scrip has been loaded by some other means.

### Identifying Users & Setting User Attributes

For `analytics.identify()` this plugin supports secured identities, regular identities, or just setting user attributes based on the value you provide for `identityType`.

If you choose to use the 'secured' or 'identify' `identityType` the only valid value for `scriptLoad` is "load". This is because [`drift.identify()` needs to be called prior to calling `drift.load()`](https://devdocs.drift.com/docs/contact-properties#driftidentifyuserid-attributes) and so this plugin needs full control over when and how the drift script is loaded. If you call `analytics.identify()` anytime prior to the script being fully initialized (such as on initial page load) the plugin will identify the user prior to calling `drift.load()` to establish proper auth and identity for use in the chat experience.

If you use the 'secured' `identityType` then you must provide a function to `jwtResolver` which will return a promise that resolves to the jwt.

If using `userAttributes` there are no additional considerations.

### Registering Event Handlers with Drift

This plugin supports dispatching drift-specific events [LINK], such as "conversationStarted", to the rest of the plugin system. This allows you to handle the events as you see fit, for example to call `analytics.track()` with the event payload.

**The events dispatched are prepended with `drift:`** so the drift "conversationStarted" event will be dispatched as `drift:conversationStarted`. This is to avoid event name collisions in the analytics event namespace.

To have a particular event be dispatched simply include the event name in the Set provided to the `events` config option.

#### Example Plugin to React to Drift Events

```ts
import analyticsDriftPlugin from "analytics-plugin-drift";

const driftEventPlugin = {
  "drfit:conversationStarted": ({ instance, payload }) => {
    instance.track("drift_conversation_started", {
      ...payload,
    });
  },
};

const analytics = Analytics({
  app: `Your-App-Name`,
  version: "your-app-version",
  debug: false,
  plugins: [
    analyticsDriftPlugin({
      identityType: "userAttributes",
      scriptLoad: "load",
      events: new Set(["conversationStarted"]),
    }),
    driftEventPlugin,
  ],
});
```

---

## TODO

- [] determine best events api

  - should these auto forward? should they be dispatched? should you provide an object with methods?

- [] determine best ready() api
- [] add an option to not pass along the history if manual load
