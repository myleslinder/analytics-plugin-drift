# Analytics Plugin for Drift

This library exports the Drift plugin for the [analytics package](https://github.com/DavidWells/analytics).

After initializing analytics with this Drift plugin, data will be sent to Drift whenever `analytics.track`, `analytics.identify`, or (optionally) `analytics.page` are called. For `analytics.identify()` this plugin supports [signed identities](https://devdocs.drift.com/docs/securing-drift-on-your-site-using-signed-identities), regular identities, or just setting user attributes.

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
import Analytics from "analytics";
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
import Analytics from "analytics";
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
  identityType: "userAttributes" | "identify" | "signed"
  page?: boolean; // default is false
  events?: Set<DriftEventName>;
  jwtResolver?: (userId: string) => Promise<string>; // only relevant if identityType = "signed"
}
```

- `driftId` is the embed id found in your account here [LINK to finding it]
- `scriptLoad` is either "load" or "manual"
  - "load" will have the plugin load the script
  - "manual" will not load the script and you must inform the plugin once the script is loaded
- `identityType` is one of "userAttributes", "identify", or "signed" and indicates what Drift method should be called when `analytics.identify()` is called.
- `page` is a boolean value whether or not to forward `analytics.page()` calls to drift. Drift automatically tracks pages, so this is for manually telling Drift that the page has changed. You likely want this to be `false`, for more information see [the Drift docs](https://devdocs.drift.com/docs/contact-properties#driftpage)
- `events` is a set of `DriftEventName` [LINK to types] to determine which Drift events should be propagated to the rest of the plugin system [LINK to explain more]
- `jwtResolver` is a function that returns a promise resolving to the jwt to pass along to `drift.identify()`

### Script Loading Behavior

This plugin will begin accepting events from `analytics` on initial page load. To ensure that no `track()`, `page()` or `identify()` calls are lost if they occur before the script is ready the plugin maintains a history of events and will forward them on to Drift once it's available. With the "manual" `scriptLoad` option this allows for storing events that drift will have missed prior to intialization. With "load" as the `scriptLoad` option this allows for capturing `analytics.identify()` calls and identifying the user before loading drift.

#### "load"

This option will begin loading the drift script upon initialization of the `analytics` instance.

#### "manual"

This option is helpful if you're using a facade, such as [link] react-live-chat-loader, to defer the loading of the Drift script (link to chrome docs on this as well). With this option the plugin will store all events recieved until you tell the plugin that the script has loaded, using the plugin's `ready()` method. Once Drift is available then the event history is forwarded to drift in chronological order.

One potential drawback of using a facade is that events tracked prior to loading the script will all be tracked in Drift with nearly the same timestamp as opposed to their actual time.

**Calling ready()**

```js
import analytics from "src/analytics";

analytics.plugins.drift.ready();
```

### Identifying Users & Setting User Attributes

For `analytics.identify()` this plugin supports signed identities, regular identities, or just setting user attributes based on the value you provide for `identityType`.

If you choose to use the 'signed' or 'identify' `identityType` the only valid value for `scriptLoad` is "load". This is because [`drift.identify()` needs to be called prior to calling `drift.load()`](https://devdocs.drift.com/docs/contact-properties#driftidentifyuserid-attributes) and so this plugin needs full control over when and how the drift script is loaded. If you call `analytics.identify()` anytime prior to the script being fully initialized (such as on initial page load) the plugin will identify the user prior to calling `drift.load()` to establish proper auth and identity for use in the chat experience.

If you use the 'signed' `identityType` then you must provide a function to `jwtResolver` which will return a promise that resolves to the jwt.

If using `userAttributes` there are no additional considerations.

### Handling Drift Events

This plugin supports dispatching drift-specific events [LINK], such as "startConversation", to the rest of the plugin system. This allows you to handle the events as you see fit, for example to call `analytics.track()` with the event payload.

To have a particular event be dispatched simply include the event name in the Set provided to the `events` config option. If an event doesn't seem to be firing ensure that you've added it to the events config and provided a handler.

The function signature of an event listener is:

```ts
K : DriftEventName // "campaign:clicked";
D : DriftEventPayload<K> // DriftEventPayload<"campaign:clicked"> -> { data: { widgetVisible: boolean; isOnline: boolean; }; campaignId: number; }

({ type: K;
  instance: AnalyticsInstance;
  eventPayload: D;
}) => void
```

#### Listening to events from the Analytics instance

You can listen to the drift events you include in the config using the `.on()` and `.once()` analytics instance listeners directly in your app code.

```js
/* import analytic instance in your app code */
import analytics from '/src/analytics'

analytics.on('startConversation', () => {
  // do something
})

analytics.once('campaign:click', (({ eventPayload: { payload } })) => {
  //payload is specific to the event
})

/* Clean up events */
const remove = analytics.on('tabHidden', () => {/* logic */})
// Call remove() to detach listener
remove()
```

#### Example Plugin to React to Drift Events

Instead of listening with `.on()` or `.once()`, you can create plugins to also react to drift events.

If you're using TypeScript the arguments supported are different for each event.

```ts
import Analytics from "analytics";
import analyticsDriftPlugin, {
  DriftPluginEventHandlers,
} from "analytics-plugin-drift";

const driftEventPlugin: DriftPluginEventHandlers = {
  "campaign:click": ({ instance, payload }) => {
    instance.track("drift_campaign_click", {
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
      events: new Set(["campaign:click"]),
    }),
    driftEventPlugin,
  ],
});
```

---

## Contributing

- building
- CI
-

---

## TODO

- [] what to do about the ready event, get rid of it?
- [] determine best events api

  - should these auto forward? should they be dispatched? should you provide an object with methods?

- [] determine best ready() api
- [] add an option to not pass along the history if manual load
