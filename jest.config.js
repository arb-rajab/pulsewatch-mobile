/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  // Jest's 5000ms default has been observed to intermittently trip on CI
  // (not locally) for RNTL component tests that do a couple of real
  // waitFor()/render() round-trips, purely from shared-runner worker
  // contention — confirmed by capturing an actual failing CI run's output,
  // which showed "Exceeded timeout of 5000 ms" on an otherwise-unmodified,
  // passing-when-run-alone test. A same-commit re-run with no code change
  // passes cleanly. Doubling the default gives real margin without masking
  // a genuinely hung test (10s is still well short of a stuck promise).
  testTimeout: 10000,
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
