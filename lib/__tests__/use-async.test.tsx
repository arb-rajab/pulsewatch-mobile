import React from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useAsync } from '../use-async';

function Harness({ fn }: { fn: () => Promise<string> }) {
  const { data, error, loading, refresh } = useAsync(fn, []);
  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="data">{data ?? ''}</Text>
      <Text testID="error">{error?.message ?? ''}</Text>
      <Pressable testID="refresh" onPress={refresh}>
        <Text>refresh</Text>
      </Pressable>
    </>
  );
}

describe('useAsync', () => {
  it('starts loading, then resolves with data', async () => {
    // A deferred promise, so the fetch is still in flight after the
    // initial render settles — render() awaits its own act(), which
    // would otherwise flush an already-resolved promise before this
    // test gets a chance to observe the loading state at all.
    let resolveFn!: (value: string) => void;
    const fn = jest.fn().mockReturnValue(new Promise<string>((resolve) => {
      resolveFn = resolve;
    }));

    await render(<Harness fn={fn} />);
    expect(screen.getByTestId('loading')).toHaveTextContent('true');

    resolveFn('hello');

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('data')).toHaveTextContent('hello');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('surfaces a rejected promise as an Error', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom'));
    await render(<Harness fn={fn} />);

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('boom'));
    expect(screen.getByTestId('data')).toHaveTextContent('');
  });

  it('wraps a non-Error rejection in an Error', async () => {
    const fn = jest.fn().mockRejectedValue('plain string rejection');
    await render(<Harness fn={fn} />);

    await waitFor(() =>
      expect(screen.getByTestId('error')).toHaveTextContent('plain string rejection')
    );
  });

  it('refetches on refresh()', async () => {
    const fn = jest.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');
    await render(<Harness fn={fn} />);

    await waitFor(() => expect(screen.getByTestId('data')).toHaveTextContent('first'));

    fireEvent.press(screen.getByTestId('refresh'));

    await waitFor(() => expect(screen.getByTestId('data')).toHaveTextContent('second'));
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('clears a previous error once a refresh succeeds', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('first fails')).mockResolvedValueOnce('now ok');
    await render(<Harness fn={fn} />);

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('first fails'));

    fireEvent.press(screen.getByTestId('refresh'));

    await waitFor(() => expect(screen.getByTestId('data')).toHaveTextContent('now ok'));
    expect(screen.getByTestId('error')).toHaveTextContent('');
  });
});
