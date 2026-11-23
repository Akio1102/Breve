import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

const v = (name: string, alpha?: number) =>
  alpha === undefined ? `rgb(var(--${name}))` : `rgb(var(--${name}) / ${alpha})`

export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: v('editor'),
    color: v('text'),
    fontSize: '14px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6' },
  '.cm-content': { caretColor: v('accent') },
  '.cm-gutters': {
    backgroundColor: v('editor'),
    color: v('muted'),
    borderRight: `1px solid ${v('border')}`,
  },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: v('text') },
  '.cm-activeLine': { backgroundColor: v('text', 0.035) },
  '&:not(.cm-focused) .cm-activeLine': { backgroundColor: 'transparent' },
  '&:not(.cm-focused) .cm-activeLineGutter': { color: v('muted') },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: v('accent') },
  '.cm-selectionBackground': { backgroundColor: v('val', 0.18) },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: v('val', 0.32),
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: v('accent', 0.2),
    outline: 'none',
  },
  '.cm-exec-line, .cm-activeLine.cm-exec-line': {
    backgroundColor: v('curline', 0.08),
    boxShadow: `inset 2px 0 0 ${v('accent')}`,
  },
  '.cm-exec-line.cm-exec-error': {
    backgroundColor: v('danger', 0.14),
    boxShadow: `inset 2px 0 0 ${v('danger')}`,
  },
  '.cm-exec-fragment': {
    backgroundColor: v('accent', 0.22),
    borderRadius: '2px',
    boxShadow: `0 1px 0 ${v('accent')}`,
  },
  '.cm-exec-error .cm-exec-fragment': {
    backgroundColor: v('danger', 0.25),
    boxShadow: `0 1px 0 ${v('danger')}`,
  },
  '.cm-tree-fragment': {
    backgroundColor: v('fn', 0.16),
    borderRadius: '2px',
    outline: `1px dashed ${v('fn', 0.7)}`,
  },
  '.cm-exec-widget': {
    marginLeft: '1.5rem',
    padding: '0 0.4rem',
    borderRadius: '4px',
    fontSize: '12px',
    color: v('muted'),
    backgroundColor: v('surface-2'),
    whiteSpace: 'pre',
  },
  '.cm-exec-widget b': { color: v('val'), fontWeight: '500' },
  '.cm-breakpoint-gutter': { width: '18px' },
  '.cm-breakpoint-gutter .cm-gutterElement': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  '.cm-breakpoint-gutter .cm-gutterElement:hover:not(:has(.cm-bp-marker))::after':
    {
      content: '""',
      width: '9px',
      height: '9px',
      borderRadius: '50%',
      backgroundColor: v('danger', 0.35),
    },
  '.cm-bp-marker': {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: v('danger'),
  },
  '.cm-lintRange-error': {
    backgroundImage: 'none',
    textDecoration: `wavy underline ${v('danger')}`,
    textUnderlineOffset: '3px',
    textDecorationSkipInk: 'none',
  },
  '.cm-lintRange-warning': {
    backgroundImage: 'none',
    textDecoration: `wavy underline ${v('warn')}`,
    textUnderlineOffset: '3px',
    textDecorationSkipInk: 'none',
  },
  '.cm-tooltip': {
    backgroundColor: v('surface-2'),
    color: v('text'),
    border: `1px solid ${v('border')}`,
    borderRadius: '6px',
  },
  '.cm-tooltip-lint': { padding: '0' },
  '.cm-diagnostic': {
    fontFamily: 'var(--font-sans)',
    fontSize: '13px',
    padding: '4px 8px',
  },
  '.cm-diagnostic-error': { borderLeftColor: v('danger') },
  '.cm-diagnostic-warning': { borderLeftColor: v('warn') },
  '.cm-diagnosticSource': { color: v('muted') },
})

export const breveHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: v('kw'), fontWeight: '600' },
    { tag: t.typeName, color: v('fn'), fontWeight: '600' },
    { tag: t.string, color: v('str') },
    { tag: [t.number, t.bool], color: v('num') },
    { tag: t.comment, color: v('comment'), fontStyle: 'italic' },
    { tag: [t.operator, t.punctuation], color: v('op') },
    { tag: t.invalid, color: v('danger'), textDecoration: 'underline' },
  ]),
)
