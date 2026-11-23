export function SpacerRow({ height, cols }: { height: number; cols: number }) {
  if (height <= 0) return null
  return (
    <tr aria-hidden style={{ height }}>
      <td colSpan={cols} className="p-0" />
    </tr>
  )
}

export function SpacerItem({ height }: { height: number }) {
  if (height <= 0) return null
  return <li aria-hidden style={{ height }} />
}

export function SpacerBlock({ height }: { height: number }) {
  if (height <= 0) return null
  return <div aria-hidden style={{ height }} />
}
