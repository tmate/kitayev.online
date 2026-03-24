const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  snapshotPathTemplate: '{testDir}/screenshots/{arg}{ext}',
  use: {
    browserName: 'chromium',
    baseURL: 'http://localhost:4000',
  },
  webServer: {
    command: 'python3 -m http.server 4000 --directory docs/new',
    url: 'http://localhost:4000',
    reuseExistingServer: true,
  },
});
