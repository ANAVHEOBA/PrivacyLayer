module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  // Ensure consistent module resolution between test and production builds
  // ts-jest automatically uses TypeScript's module resolution via tsconfig
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2020',
          module: 'CommonJS',
          declaration: true,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          moduleResolution: 'node',
        },
      },
    ],
  },
  // Test timeout configuration (can be overridden by environment variable)
  testTimeout: process.env.JEST_TIMEOUT ? parseInt(process.env.JEST_TIMEOUT, 10) : 30000,
  // JUnit XML reporter for CI/CD integration
  reporters: [
    'default',
    ...(process.env.CI === 'true' || process.env.JEST_JUNIT === 'true'
      ? [
          [
            'jest-junit',
            {
              outputDirectory: './test-results',
              outputName: 'junit.xml',
              classNameTemplate: '{classname}',
              titleTemplate: '{title}',
              ancestorSeparator: ' › ',
              usePathForSuiteName: true,
            },
          ],
        ]
      : []),
  ],
};
