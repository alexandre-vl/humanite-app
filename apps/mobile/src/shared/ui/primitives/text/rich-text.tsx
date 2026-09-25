import type { DisplayText } from '@huma/contracts';
import type { RunFace, TextTone, TextVariant } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Text as NativeText } from 'react-native';
import type { TextAlign } from '../../../lib/styles';
import { runStyle, textStyle, useTheme, useTypesetting } from '../../../lib/styles';

/** One stretch of a sentence: its words, the face that sets it apart, and what a press on it does. */
export type TextRun = Readonly<{ text: DisplayText; face?: RunFace; onPress?: () => void }>;

export type RichTextProps = Readonly<{
  runs: readonly TextRun[];
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextAlign;
}>;

/** A run and where it starts in the sentence — the one thing about a run that is its own, so the one thing to key on. */
type PlacedRun = Readonly<{ at: number; run: TextRun }>;

const place = (runs: readonly TextRun[]): readonly PlacedRun[] => {
  const placed: PlacedRun[] = [];
  let at = 0;
  for (const run of runs) {
    placed.push({ at, run });
    at += run.text.length;
  }
  return placed;
};

/**
 * A sentence whose parts do not all read alike: a slanted word, a link, plain words between them. Each run is nested
 * inside the sentence rather than laid beside it, which is what makes React Native flow them as one paragraph and let
 * each inherit the size, the line height and the colour the variant sets — a run states only how it differs.
 */
export function RichText({ runs, variant = 'prose', tone, align }: RichTextProps): ReactNode {
  const theme = useTheme();
  const typesetting = useTypesetting();
  return (
    // Set at the phone's text size already, as a Text is; the runs inherit it and the refusal to scale again.
    <NativeText allowFontScaling={false} style={textStyle(variant, theme, typesetting, tone, align)}>
      {place(runs).map(({ at, run }) => (
        <NativeText
          key={at}
          onPress={run.onPress}
          style={runStyle(run.face, run.onPress !== undefined, theme, typesetting.faces)}
        >
          {run.text}
        </NativeText>
      ))}
    </NativeText>
  );
}
