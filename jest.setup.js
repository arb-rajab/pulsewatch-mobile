// React 18+'s act() checks this flag before deciding whether it's safe to
// batch/flush state updates synchronously. Without it, RNTL's render()
// can return before its own mount effects have actually committed, which
// surfaces as flaky "render() has not been called" / stale-screen
// failures in whichever test happens to run first.
global.IS_REACT_ACT_ENVIRONMENT = true;

require('@testing-library/react-native/matchers');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest')
);
