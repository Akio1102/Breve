const BG = ['bg-h0', 'bg-h1', 'bg-h2', 'bg-h3', 'bg-h4'] as const
const BORDER = [
  'border-h0',
  'border-h1',
  'border-h2',
  'border-h3',
  'border-h4',
] as const

export const heapBg = (id: number) => BG[id % 5]
export const heapBorder = (id: number) => BORDER[id % 5]
