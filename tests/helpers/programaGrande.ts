export function programaGrande(n: number): string {
  const lineas: string[] = []
  for (let i = 0; i < n; i++)
    lineas.push(
      `va ent a${i} = ${i} + 2 * 3, b${i} = (a${i} - 1) * 2`,
      `si a${i} > b${i} di "mayor" no di a${i} + b${i}`,
      `rep 2 b${i} = b${i} + a${i}`,
      `di b${i}`,
    )
  return `${lineas.join('\n')}\n`
}
