import type { Position } from '@huma/kit/diagnostics';
import type { Nodes } from 'mdast';
import type { CheckDetails, ScopedCode } from '../spec/checks.ts';

export type FileCode = ScopedCode<'file'>;

/** How a file check records a finding: its code, where it is, and the values of its message. */
export type FileReport = <Code extends FileCode>(code: Code, at: Nodes | Position, details: CheckDetails<Code>) => void;
