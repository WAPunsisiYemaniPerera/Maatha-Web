import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    timeout: 30 * 1000,
    expect: {
        timeout: 5000
    },
    fullyParallel: true,
    reporter: 'html', 
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome']},
        },
    ],

    //automatically run the development server
    webServer:{
        command: 'npm start',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120 * 1000,
    },
});