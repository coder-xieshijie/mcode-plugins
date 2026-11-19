// Hand-written fixture: a DSH skin literal plus a character asset. Not executed by the converter.
const SHIKI = {
  "--shiki-token-keyword": "#c792ea",
  "--shiki-token-string": "#c3e88d",
  "--shiki-token-comment": "#7f8ab0",
  "--shiki-token-function": "#82aaff",
};
ctx.theme.register({
  id: "pet-night",
  label: "Pet Night",
  colorScheme: "dark",
  tokens: {
    ...SHIKI,
    "--dsw-alias-bg-base": "#101318",
    "--dsw-alias-bg-layer-1": "#161b22",
    "--dsw-alias-bg-layer-2": "#1d232c",
    "--dsw-alias-label-primary": "#e6edf3",
    "--dsw-alias-label-secondary": "#9da7b3",
    "--dsw-alias-label-tertiary": "#7d8794",
    "--dsw-alias-state-business-primary": "#7fd8ff",
    "--dsw-alias-border-l1": "#2a323d",
    "--dsw-alias-border-l2": "#222a33",
  },
});
