// Preset theme palettes, written from each project's published palette.
// Sources and licences: see NOTICE.md and plugins/preset-themes/README.md.
// Seed fields feed plugins/dsh-skin-import/scripts/lib/derive.mjs, which fills all 47 tokens.

const MONO = ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'Cascadia Code', 'Consolas', 'monospace'];
const mono = (first) => [first, ...MONO.filter((f) => f !== first)];

export const PRESET_THEMES = [
  {
    id: 'catppuccin',
    label: 'Catppuccin',
    description: 'Catppuccin 官方色板：亮色 Latte，暗色 Mocha。',
    recipe: { elevation: 'soft', shape: { controlRadius: 10, surfaceRadius: 14, composerRadius: 20, messageRadius: 16 } },
    fonts: { code: mono('JetBrains Mono') },
    modes: {
      light: {
        canvas: '#eff1f5', sidebar: '#e6e9ef', surface: '#eff1f5', overlay: '#eff1f5', tertiary: '#ccd0da',
        text: '#4c4f69', text2: '#5c5f77', text3: '#7c7f93', accent: '#8839ef', info: '#1e66f5',
        border: '#bcc0cc', borderLight: '#ccd0da', borderHeavy: '#8c8fa1',
        code: { keyword: '#8839ef', string: '#40a02b', function: '#1e66f5', type: '#df8e1d', number: '#fe640b', property: '#7287fd', comment: '#7c7f93', muted: '#7c7f93' },
        backdrop: { base: '#e6e9ef', glowPrimary: '#dcc6fb', glowSecondary: '#dce0e8' },
      },
      dark: {
        canvas: '#1e1e2e', sidebar: '#181825', surface: '#313244', overlay: '#313244', tertiary: '#45475a',
        text: '#cdd6f4', text2: '#bac2de', text3: '#7f849c', accent: '#cba6f7', info: '#89b4fa',
        border: '#45475a', borderLight: '#313244', borderHeavy: '#7f849c',
        code: { keyword: '#cba6f7', string: '#a6e3a1', function: '#89b4fa', type: '#f9e2af', number: '#fab387', property: '#b4befe', comment: '#9399b2', muted: '#9399b2' },
        backdrop: { base: '#11111b', glowPrimary: '#3b2f52', glowSecondary: '#1e1e2e' },
      },
    },
  },
  {
    id: 'dracula',
    label: 'Dracula',
    description: 'Dracula 官方色板（只有暗色）。',
    recipe: { elevation: 'soft', shape: { controlRadius: 8, surfaceRadius: 12, composerRadius: 18, messageRadius: 14 } },
    fonts: { code: mono('Fira Code') },
    modes: {
      dark: {
        canvas: '#282a36', sidebar: '#21222c', surface: '#343746', overlay: '#343746', tertiary: '#44475a',
        text: '#f8f8f2', text2: '#c9cbd6', text3: '#6272a4', accent: '#bd93f9', info: '#8be9fd',
        border: '#44475a', borderLight: '#343746', borderHeavy: '#6272a4',
        code: { keyword: '#ff79c6', string: '#f1fa8c', function: '#50fa7b', type: '#8be9fd', number: '#bd93f9', property: '#ffb86c', comment: '#6272a4', muted: '#6272a4' },
        backdrop: { base: '#191a21', glowPrimary: '#3d3357', glowSecondary: '#282a36' },
      },
    },
  },
  {
    id: 'nord',
    label: 'Nord',
    description: 'Nord 官方色板：亮色用 Snow Storm，暗色用 Polar Night。',
    recipe: { elevation: 'flat', shape: { controlRadius: 6, surfaceRadius: 10, composerRadius: 16, messageRadius: 12 } },
    fonts: { code: mono('JetBrains Mono') },
    modes: {
      light: {
        canvas: '#eceff4', sidebar: '#e5e9f0', surface: '#eceff4', overlay: '#eceff4', tertiary: '#d8dee9',
        text: '#2e3440', text2: '#4c566a', text3: '#4c566a', accent: '#5e81ac', info: '#81a1c1',
        border: '#d8dee9', borderLight: '#e5e9f0', borderHeavy: '#4c566a',
        code: { keyword: '#5e81ac', string: '#a3be8c', function: '#88c0d0', type: '#8fbcbb', number: '#b48ead', property: '#d08770', comment: '#4c566a', muted: '#4c566a' },
        backdrop: { base: '#e5e9f0', glowPrimary: '#c9d6e6', glowSecondary: '#eceff4' },
      },
      dark: {
        canvas: '#2e3440', sidebar: '#3b4252', surface: '#3b4252', overlay: '#434c5e', tertiary: '#434c5e',
        text: '#d8dee9', text2: '#e5e9f0', text3: '#4c566a', accent: '#88c0d0', info: '#81a1c1',
        border: '#434c5e', borderLight: '#3b4252', borderHeavy: '#4c566a',
        code: { keyword: '#81a1c1', string: '#a3be8c', function: '#88c0d0', type: '#8fbcbb', number: '#b48ead', property: '#ebcb8b', comment: '#616e88', muted: '#616e88' },
        backdrop: { base: '#2e3440', glowPrimary: '#3b4a5a', glowSecondary: '#3b4252' },
      },
    },
  },
  {
    id: 'solarized',
    label: 'Solarized',
    description: 'Solarized 官方色板：Light 与 Dark。',
    recipe: { elevation: 'flat', shape: { controlRadius: 4, surfaceRadius: 8, composerRadius: 12, messageRadius: 10 } },
    fonts: { code: mono('SF Mono') },
    modes: {
      light: {
        canvas: '#fdf6e3', sidebar: '#eee8d5', surface: '#fdf6e3', overlay: '#fdf6e3', tertiary: '#eee8d5',
        text: '#586e75', text2: '#657b83', text3: '#93a1a1', accent: '#268bd2', info: '#2aa198',
        code: { keyword: '#859900', string: '#2aa198', function: '#268bd2', type: '#b58900', number: '#d33682', property: '#6c71c4', comment: '#93a1a1', muted: '#93a1a1' },
        backdrop: { base: '#eee8d5', glowPrimary: '#f5e6b8', glowSecondary: '#fdf6e3' },
      },
      dark: {
        canvas: '#002b36', sidebar: '#073642', surface: '#073642', overlay: '#073642',
        text: '#93a1a1', text2: '#839496', text3: '#586e75', accent: '#268bd2', info: '#2aa198',
        code: { keyword: '#859900', string: '#2aa198', function: '#268bd2', type: '#b58900', number: '#d33682', property: '#6c71c4', comment: '#586e75', muted: '#586e75' },
        backdrop: { base: '#002b36', glowPrimary: '#0b4555', glowSecondary: '#073642' },
      },
    },
  },
  {
    id: 'github',
    label: 'GitHub',
    description: 'GitHub Primer 公开色板：Light 与 Dark。',
    recipe: { elevation: 'flat', shape: { controlRadius: 6, surfaceRadius: 8, composerRadius: 12, messageRadius: 12 } },
    fonts: { code: mono('SF Mono') },
    modes: {
      light: {
        canvas: '#ffffff', sidebar: '#f6f8fa', surface: '#ffffff', overlay: '#ffffff', tertiary: '#eaeef2',
        text: '#1f2328', text2: '#656d76', text3: '#6e7781', accent: '#0969da', info: '#0969da',
        border: '#d0d7de', borderLight: '#d8dee4', borderHeavy: '#6e7781',
        code: { keyword: '#cf222e', string: '#0a3069', function: '#8250df', type: '#953800', number: '#0550ae', property: '#116329', comment: '#6e7781', muted: '#6e7781' },
        backdrop: { base: '#f6f8fa', glowPrimary: '#ddf4ff', glowSecondary: '#ffffff' },
      },
      dark: {
        canvas: '#0d1117', sidebar: '#010409', surface: '#161b22', overlay: '#161b22', tertiary: '#21262d',
        text: '#e6edf3', text2: '#7d8590', text3: '#6e7681', accent: '#2f81f7', info: '#2f81f7',
        border: '#30363d', borderLight: '#21262d', borderHeavy: '#6e7681',
        code: { keyword: '#ff7b72', string: '#a5d6ff', function: '#d2a8ff', type: '#ffa657', number: '#79c0ff', property: '#7ee787', comment: '#8b949e', muted: '#8b949e' },
        backdrop: { base: '#010409', glowPrimary: '#0c2d6b', glowSecondary: '#0d1117' },
      },
    },
  },
  {
    id: 'one',
    label: 'One',
    description: 'Atom One 色板：One Light 与 One Dark。',
    recipe: { elevation: 'soft', shape: { controlRadius: 6, surfaceRadius: 10, composerRadius: 14, messageRadius: 12 } },
    fonts: { code: mono('Fira Code') },
    modes: {
      light: {
        canvas: '#fafafa', sidebar: '#eaeaeb', surface: '#ffffff', overlay: '#ffffff', tertiary: '#e5e5e6',
        text: '#383a42', text2: '#696c77', text3: '#a0a1a7', accent: '#4078f2', info: '#0184bc',
        code: { keyword: '#a626a4', string: '#50a14f', function: '#4078f2', type: '#c18401', number: '#986801', property: '#e45649', comment: '#a0a1a7', muted: '#a0a1a7' },
        backdrop: { base: '#eaeaeb', glowPrimary: '#d9e3fb', glowSecondary: '#fafafa' },
      },
      dark: {
        canvas: '#282c34', sidebar: '#21252b', surface: '#2c313a', overlay: '#2c313a', tertiary: '#3e4451',
        text: '#abb2bf', text2: '#9da5b4', text3: '#5c6370', accent: '#61afef', info: '#56b6c2',
        code: { keyword: '#c678dd', string: '#98c379', function: '#61afef', type: '#e5c07b', number: '#d19a66', property: '#e06c75', comment: '#5c6370', muted: '#5c6370' },
        backdrop: { base: '#21252b', glowPrimary: '#2b3a50', glowSecondary: '#282c34' },
      },
    },
  },
  {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    description: 'Tokyo Night 色板：亮色 Day，暗色 Night。',
    recipe: { elevation: 'soft', shape: { controlRadius: 8, surfaceRadius: 12, composerRadius: 18, messageRadius: 14 } },
    fonts: { code: mono('JetBrains Mono') },
    modes: {
      light: {
        canvas: '#e1e2e7', sidebar: '#d0d5e3', surface: '#e1e2e7', overlay: '#e1e2e7', tertiary: '#c4c8da',
        text: '#3760bf', text2: '#6172b0', text3: '#848cb5', accent: '#2e7de9', info: '#007197',
        border: '#c4c8da', borderLight: '#d0d5e3', borderHeavy: '#8990b3',
        code: { keyword: '#9854f1', string: '#587539', function: '#2e7de9', type: '#007197', number: '#b15c00', property: '#387068', comment: '#848cb5', muted: '#848cb5' },
        backdrop: { base: '#d0d5e3', glowPrimary: '#b7c1e3', glowSecondary: '#e1e2e7' },
      },
      dark: {
        canvas: '#1a1b26', sidebar: '#16161e', surface: '#292e42', overlay: '#292e42', tertiary: '#292e42',
        text: '#c0caf5', text2: '#a9b1d6', text3: '#565f89', accent: '#7aa2f7', info: '#7dcfff',
        border: '#292e42', borderLight: '#1f2335', borderHeavy: '#545c7e',
        code: { keyword: '#bb9af7', string: '#9ece6a', function: '#7aa2f7', type: '#7dcfff', number: '#ff9e64', property: '#73daca', comment: '#565f89', muted: '#565f89' },
        backdrop: { base: '#16161e', glowPrimary: '#283457', glowSecondary: '#1a1b26' },
      },
    },
  },
  {
    id: 'gruvbox',
    label: 'Gruvbox',
    description: 'Gruvbox 官方色板：Light 与 Dark。',
    recipe: { elevation: 'flat', shape: { controlRadius: 4, surfaceRadius: 6, composerRadius: 10, messageRadius: 8 } },
    fonts: { code: mono('JetBrains Mono') },
    modes: {
      light: {
        canvas: '#fbf1c7', sidebar: '#f2e5bc', surface: '#f9f5d7', overlay: '#f9f5d7', tertiary: '#ebdbb2',
        text: '#3c3836', text2: '#665c54', text3: '#928374', accent: '#af3a03', info: '#076678',
        border: '#d5c4a1', borderLight: '#ebdbb2', borderHeavy: '#7c6f64',
        code: { keyword: '#9d0006', string: '#79740e', function: '#427b58', type: '#b57614', number: '#8f3f71', property: '#076678', comment: '#928374', muted: '#928374' },
        backdrop: { base: '#f2e5bc', glowPrimary: '#f4d7a8', glowSecondary: '#fbf1c7' },
      },
      dark: {
        canvas: '#282828', sidebar: '#1d2021', surface: '#3c3836', overlay: '#3c3836', tertiary: '#504945',
        text: '#ebdbb2', text2: '#bdae93', text3: '#928374', accent: '#fe8019', info: '#83a598',
        border: '#504945', borderLight: '#3c3836', borderHeavy: '#7c6f64',
        code: { keyword: '#fb4934', string: '#b8bb26', function: '#8ec07c', type: '#fabd2f', number: '#d3869b', property: '#83a598', comment: '#928374', muted: '#928374' },
        backdrop: { base: '#1d2021', glowPrimary: '#3f2d1f', glowSecondary: '#282828' },
      },
    },
  },
  {
    id: 'rose-pine',
    label: 'Rosé Pine',
    description: 'Rosé Pine 官方色板：亮色 Dawn，暗色 Main。',
    recipe: { elevation: 'soft', shape: { controlRadius: 10, surfaceRadius: 14, composerRadius: 20, messageRadius: 16 } },
    fonts: { code: mono('JetBrains Mono') },
    modes: {
      light: {
        canvas: '#faf4ed', sidebar: '#f2e9e1', surface: '#fffaf3', overlay: '#fffaf3', tertiary: '#f4ede8',
        text: '#575279', text2: '#797593', text3: '#9893a5', accent: '#907aa9', info: '#56949f',
        border: '#dfdad9', borderLight: '#f4ede8', borderHeavy: '#9893a5',
        code: { keyword: '#286983', string: '#ea9d34', function: '#d7827e', type: '#56949f', number: '#b4637a', property: '#907aa9', comment: '#9893a5', muted: '#9893a5' },
        backdrop: { base: '#f2e9e1', glowPrimary: '#ebd8e4', glowSecondary: '#faf4ed' },
      },
      dark: {
        canvas: '#191724', sidebar: '#1f1d2e', surface: '#1f1d2e', overlay: '#26233a', tertiary: '#26233a',
        text: '#e0def4', text2: '#908caa', text3: '#6e6a86', accent: '#c4a7e7', info: '#9ccfd8',
        border: '#403d52', borderLight: '#21202e', borderHeavy: '#6e6a86',
        code: { keyword: '#31748f', string: '#f6c177', function: '#ebbcba', type: '#9ccfd8', number: '#eb6f92', property: '#c4a7e7', comment: '#6e6a86', muted: '#6e6a86' },
        backdrop: { base: '#191724', glowPrimary: '#2d2540', glowSecondary: '#1f1d2e' },
      },
    },
  },
];
