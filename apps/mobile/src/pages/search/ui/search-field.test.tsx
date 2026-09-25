import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode, Ref } from 'react';
import { useImperativeHandle } from 'react';
import { t } from '#i18n';
import type { FieldHandle } from '#primitives/text-field';
import { SearchField } from './search-field';

/** Every time the line is asked for the caret: no runner has a caret to move, so the asking is what is counted. */
const mockCaret = jest.fn();

/** The line as its double draws it: nothing at all, and a handle that counts. */
function MockLine({ ref }: Readonly<{ ref?: Ref<FieldHandle> }>): ReactNode {
  useImperativeHandle(ref, () => ({ focus: mockCaret }));
  return null;
}

// The line itself is the primitive's, whose own test proves that a field asked for the caret takes it. What is proven
// here is that the cross asks.
jest.mock('#primitives/text-field', () => ({ __esModule: true, TextField: MockLine }));

describe('SearchField', () => {
  /**
   * Clearing a question is making room for another. With the keyboard put away — a list scrolled puts it away — the
   * cross left an empty line and a second press to make on it before anything could be typed.
   */
  it('vide la ligne et y rend le curseur', async () => {
    const onChange = jest.fn();
    await render(<SearchField value="jeunes" onChange={onChange} busy={false} />);
    await fireEvent.press(screen.getByLabelText(t('search.clear')));
    expect(onChange).toHaveBeenCalledWith('');
    expect(mockCaret).toHaveBeenCalledTimes(1);
  });

  it('ne dresse la croix que lorsqu’il y a quelque chose à effacer', async () => {
    await render(<SearchField value="" onChange={jest.fn()} busy={false} />);
    expect(screen.queryByLabelText(t('search.clear'))).toBeNull();
  });
});
