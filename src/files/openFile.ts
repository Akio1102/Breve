export const MAX_BYTES = 1024 * 1024

export type ResultadoApertura =
  | { ok: true; nombre: string; texto: string }
  | { ok: false; error: 'tooBig' | 'notText' | 'readFailed'; nombre: string }

export interface ArchivoLeible {
  name: string
  size: number
  text(): Promise<string>
}

export async function leerArchivo(
  archivo: ArchivoLeible,
): Promise<ResultadoApertura> {
  const nombre = archivo.name
  if (archivo.size > MAX_BYTES) return { ok: false, error: 'tooBig', nombre }
  let texto: string
  try {
    texto = await archivo.text()
  } catch {
    return { ok: false, error: 'readFailed', nombre }
  }
  if (texto.includes('\u0000')) return { ok: false, error: 'notText', nombre }
  return { ok: true, nombre, texto }
}

export const llevaArchivos = (dt: DataTransfer | null) =>
  !!dt && Array.from(dt.types).includes('Files')
