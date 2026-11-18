import { defineConfig } from '@playwright/test';

const port=Number(process.env.BLOOM_E2E_PORT || 4199);
const browser=process.env.BLOOM_TEST_BROWSER || (process.platform==='win32'?'msedge':undefined);
const baseURL='http://127.0.0.1:'+port;
export default defineConfig({
  testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:45_000,
  expect:{timeout:7000},
  use:{baseURL,channel:browser,reducedMotion:'reduce',trace:'retain-on-failure'},
  webServer:{command:'node --import tsx scripts/test-server.ts',url:baseURL+'/api/health',timeout:40_000,reuseExistingServer:false,
    env:{BLOOM_E2E_PORT:String(port)}},
});
