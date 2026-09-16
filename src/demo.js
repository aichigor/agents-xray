/* Synthetic demo: deliberately contains stale references and repeated rules. */
(function (root) {
  'use strict';
  const shared = 'Never commit API keys, passwords, or private customer data.';
  const files = [
    { path: 'AGENTS.md', content: '# Project instructions\n\nYou are a highly experienced software engineer.\nPlease think step by step.\n\n## Working agreements\n- ' + shared + '\n- ' + shared + '\n- Run `npm run lint` before proposing a change.\n- Read [old architecture](docs/old-architecture.md).\n- The source entry point is `apps/web/app.js`.\n\n## Progress log\n- Monday: created the first prototype.\n- Tuesday: discussed naming.\n- Wednesday: tried a blue button.\n- Thursday: reverted the button.\n- Friday: moved a menu.\n- Saturday: wrote a recap.\n' },
    { path: 'package.json', content: '{"name":"demo-root","private":true,"scripts":{"test":"node --test"}}' },
    { path: 'apps/web/AGENTS.md', content: '# Old web rules\nUse the old design system.\n' },
    { path: 'apps/web/AGENTS.override.md', content: '# Web working agreements\n- ' + shared + '\n- Run `npm run build` to check the web bundle.\n- Keep keyboard navigation working.\n' },
    { path: 'apps/web/package.json', content: '{"name":"demo-web","private":true,"scripts":{"build":"echo synthetic demo only","test":"echo synthetic demo only"}}' },
    { path: 'apps/web/app.js' },
    { path: 'docs/architecture.md' }
  ];
  if (typeof module === 'object' && module.exports) module.exports = files;
  else root.AgentsXrayDemo = files;
})(typeof globalThis !== 'undefined' ? globalThis : this);
