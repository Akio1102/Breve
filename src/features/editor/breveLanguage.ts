import { LanguageSupport, StreamLanguage } from '@codemirror/language'
import { RESERVADAS } from '@engine/lenguaje'

const breveLanguage = StreamLanguage.define<null>({
  name: 'breve',
  token(stream) {
    if (stream.eatSpace()) return null
    if (stream.match('//')) {
      stream.skipToEnd()
      return 'comment'
    }
    if (stream.match(/^"[^"\n]*"?/)) return 'string'
    if (stream.match(/^[0-9]+(\.[0-9]+)?/)) return 'number'
    const word = stream.match(/^[a-zA-Z][a-zA-Z0-9_]*/)
    if (word && typeof word !== 'boolean') {
      const tipo = RESERVADAS.get(word[0])
      if (!tipo) return 'variableName'
      if (tipo.startsWith('T_')) return 'typeName'
      if (tipo === 'VERDADERO' || tipo === 'FALSO') return 'bool'
      return 'keyword'
    }
    if (stream.match(/^(>=|<=|==|!=|[><=+\-*/])/)) return 'operator'
    if (stream.match(/^[(),]/)) return 'punctuation'
    stream.next()
    return 'invalid'
  },
  languageData: { commentTokens: { line: '//' } },
})

export const breve = () => new LanguageSupport(breveLanguage)
