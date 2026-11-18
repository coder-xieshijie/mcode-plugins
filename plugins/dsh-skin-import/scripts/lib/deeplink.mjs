// Deep links into the running MiniMax Code build, shared by open-details.mjs and open-boot.mjs.
//
// The URL scheme depends on the build: "minimax" (international), "minimax-cn" (China), with
// "-test" / "-staging" suffixes for test and pre-release builds. MiniMax Code puts its own scheme
// in the environment variable MCODE_APP_SCHEME of every command an Agent runs; --scheme overrides
// it. Without a scheme nothing is opened.
//
// The OS only reports that some app accepted a link, never that the running MiniMax Code acted on
// it, so the result says "launched", never "opened".
import { spawnSync } from 'node:child_process';

export const PLUGIN_NAME = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;
const SCHEME = /^minimax(?:-[a-z]+)*$/u;

/** --scheme value, else MCODE_APP_SCHEME; null when neither is a MiniMax Code scheme. */
export function resolveScheme(args, env = process.env) {
  const given = args.includes('--scheme') ? args[args.indexOf('--scheme') + 1] : env.MCODE_APP_SCHEME;
  return given && SCHEME.test(given) ? given : null;
}

/** The first argument that is not an option or an option's value. */
export function positional(args) {
  return args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--scheme');
}

export function buildUrl(scheme, action, name) {
  return scheme + '://plugin/' + action + '?name=' + encodeURIComponent(name);
}

/** Hands the URL to the OS URL opener; true when the opener accepted it. */
export function launch(url) {
  const [cmd, cmdArgs] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
    : ['xdg-open', [url]];
  const r = spawnSync(cmd, cmdArgs, { stdio: 'ignore', timeout: 10000, windowsVerbatimArguments: process.platform === 'win32' });
  return !r.error && r.status === 0;
}
