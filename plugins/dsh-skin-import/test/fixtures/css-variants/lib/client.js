// Fixture: CSS embedded in a bundle string, palette cards selected by data attributes.
const CSS = "body[data-demo-style]{--dsw-alias-label-caption:#999}" +
  "body[data-demo-style][data-demo-palette=main]:not([data-ds-dark-theme]){--dsw-alias-bg-base:#ffffff;--dsw-alias-bg-layer-1:#f6f6f6;--dsw-alias-bg-layer-2:#ffffff;--dsw-alias-bg-layer-3:#eeeeee;--dsw-alias-label-primary:#141414;--dsw-alias-label-secondary:#5a5a5a;--dsw-alias-label-tertiary:#8a8a8a;--dsw-alias-brand-primary:#2563eb;--dsw-alias-border-l1:#ececec;--dsw-alias-border-l2:#dddddd}" +
  "body[data-demo-style][data-demo-palette=main][data-ds-dark-theme]{--dsw-alias-bg-base:#141414;--dsw-alias-bg-layer-1:#1c1c1c;--dsw-alias-bg-layer-2:#222222;--dsw-alias-bg-layer-3:#2a2a2a;--dsw-alias-label-primary:#f2f2f2;--dsw-alias-label-secondary:#b4b4b4;--dsw-alias-label-tertiary:#8c8c8c;--dsw-alias-brand-primary:#60a5fa;--dsw-alias-border-l1:#262626;--dsw-alias-border-l2:#333333}" +
  "body[data-demo-style][data-demo-palette=main][data-demo-palette-card=moss]:not([data-ds-dark-theme]){--dsw-alias-bg-base:#f6faf5;--dsw-alias-brand-primary:#2f7d4f}" +
  "body[data-demo-style][data-demo-palette=main][data-demo-palette-card=moss][data-ds-dark-theme]{--dsw-alias-bg-base:#121813;--dsw-alias-brand-primary:#6fcf97}" +
  "body[data-demo-style][data-demo-palette=host]{--dsw-alias-bg-base:var(--dsw-alias-bg-base)}" +
  "[data-demo-glass] body{--dsw-alias-bg-layer-1:transparent}" +
  "@font-face{font-family:Demo Sans;src:url(demo/fonts/DemoSans-Regular.woff2) format(\"woff2\");font-weight:400;font-style:normal}" +
  "@font-face{font-family:\"Demo Mono\";src:url(data:font/woff2;base64,d09GMgABAAAAAAAA) format(\"woff2\");font-weight:400}";
module.exports = { CSS };
