// Hand-written fixture shaped like a bundled DSH skin. Not executed by the importer.
const BASE = {
  night: { "--shiki-foreground": "var(--dsw-alias-label-primary)", "--shiki-token-keyword": "#c792ea", "--shiki-token-string": "#c3e88d", "--shiki-token-comment": "#7f8ab0", "--shiki-token-function": "#82aaff", "--shiki-token-constant": "#f78c6c" }
};
const SKINS = [
  {
    id: "demo-night",
    colorScheme: "dark",
    label: "Demo Night",
    tokens: {
      "--dsw-alias-bg-base": "#101218",
      "--dsw-alias-bg-layer-1": "#171a22",
      "--dsw-alias-bg-layer-2": "rgba(40, 44, 56, 0.92)",
      "--dsw-alias-bg-layer-3": "color-mix(in srgb, #ffffff 6%, #101218)",
      "--dsw-alias-label-primary": "#e8ebf4",
      "--dsw-alias-label-secondary": "#aab0c0",
      "--dsw-alias-label-tertiary": "#8a90a0",
      "--dsw-alias-state-business-primary": "oklch(72% 0.14 280)",
      "--dsw-alias-button-primary-fill": "var(--dsw-alias-state-business-primary)",
      "--dsw-alias-border-l1": "rgba(255, 255, 255, 0.06)",
      "--dsw-alias-border-l2": "rgba(255, 255, 255, 0.1)",
      "--dsw-alias-state-success-primary": "#6ed889",
      "--dsw-alias-file-diff-added-bg": "rgba(110, 216, 137, 0.12)",
      ...extraTokens(),
    },
    glow: "radial-gradient(60% 50% at 20% 10%, rgba(160, 147, 251, 0.35), transparent), radial-gradient(50% 40% at 80% 0%, rgba(80, 200, 255, 0.2), transparent), linear-gradient(#101218, #0c0e13)",
    defaults: { wallpaperOpacity: 0.8, material: "frosted" },
    render() { return document.querySelector("body"); },
  },
  {
    id: "demo-day",
    colorScheme: "light",
    tokens: {
      "--dsw-alias-bg-base": "#fbfaf7",
      "--dsw-alias-label-primary": "#1d1b17",
      "--dsw-alias-label-secondary": "#5d584f",
      "--dsw-alias-brand-primary": "#c2410c",
      "--dsw-alias-border-l2": "#e2ddd3",
      "--dsw-radius-md": "14px"
    }
  }
];
function extraTokens() { return {}; }
