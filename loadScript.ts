export default function loadScript() {
  if (window.drift) return false;

  !(function () {
    const t = (window.driftt = window.drift = window.driftt || []);
    if (!t.init) {
      if (t.invoked) {
        return void (
          window.console &&
          console.error &&
          console.error("Drift snippet included twice.")
        );
      }
      //eslint-disable-next-line  @typescript-eslint/no-extra-semi
      (t.invoked = !0),
        (t.methods = [
          "identify",
          "config",
          "track",
          "reset",
          "debug",
          "show",
          "ping",
          "page",
          "hide",
          "off",
          "on",
        ]),
        (t.factory = function (e: any) {
          return function () {
            const n = Array.prototype.slice.call(arguments);
            return n.unshift(e), t.push(n), t;
          };
        }),
        t.methods.forEach(function (e: any) {
          t[e] = t.factory(e);
        }),
        (t.load = function (t: any) {
          const e = 3e5,
            n = Math.ceil((new Date() as any) / e) * e,
            o = document.createElement("script");
          (o.type = "text/javascript"),
            (o.async = !0),
            (o.crossOrigin = "anonymous"),
            (o.src = "https://js.driftt.com/include/" + n + "/" + t + ".js");
          const i = document.getElementsByTagName("script")[0];
          i.parentNode?.insertBefore(o, i);
        });
    }
  })();
  window.drift.SNIPPET_VERSION = "0.3.1";
  return true;
}
