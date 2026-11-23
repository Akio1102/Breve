import type {
  AccionTraza,
  Fase,
  IdPasada,
  PapelPaso,
  TipoToken,
} from '@engine/types'
import type { Rol } from '@/arbol/arbol'
import type { ExampleId } from '@/examples'
import type { AstMode, TraceKind } from '@/store/appStore'

export const es = {
  app: {
    name: 'Compilador Breve',
    description:
      'Compilador del lenguaje Breve: tokens, árbol sintáctico, tabla de símbolos, código de tres direcciones, tripletas, cuádruplas y ejecución.',
  },
  header: {
    examples: 'Ejemplos',
    exampleNames: {
      potencia: 'potencia.brv (válido)',
      tipos: 'Tipos y constantes (válido)',
      lexico: 'Con errores léxicos',
      sintactico: 'Con errores sintácticos',
      semantico: 'Con errores semánticos (tipos)',
      ejecucion: 'Con error de ejecución',
    } satisfies Record<ExampleId, string>,
    compile: 'Compilar',
    run: 'Ejecutar',
    runDisabled: 'Corrige los errores de compilación para ejecutar',
    tour: 'Tour guiado',
    export: 'Exportar',
    showInspector: 'Mostrar inspector',
    hideInspector: 'Ocultar inspector',
    shortcuts: 'Atajos de teclado',
  },
  prefs: {
    toLight: 'Cambiar a tema claro',
    toDark: 'Cambiar a tema oscuro',
    systemHint: ' (el del sistema)',
    change: 'cambiar',
    language: 'Idioma: español',
  },
  layout: {
    debugging: 'Recorrido de la traza',
    inspector: 'Inspector',
    bottomPanel: 'Resultados de la compilación',
    resizeEditor: 'Redimensionar editor y panel inferior',
    resizeInspector: 'Redimensionar editor e inspector',
    showErrors: (n: number) =>
      n === 1 ? 'Ver el error' : `Ver los ${n} errores`,
    tabs: {
      vars: 'Variables',
      mem: 'Memoria',
      watch: 'Vigiladas',
      console: 'Resultado',
      tokens: 'Tokens',
      ast: 'Árbol',
      symbols: 'Tabla de símbolos',
      intermediate: 'Código intermedio',
      problems: 'Errores',
      warnings: 'Advertencias',
      trace: 'Traza',
    },
  },
  debug: {
    toolbar: 'Controles de la traza',
    debug: 'Recorrer traza',
    play: 'Reproducir',
    pause: 'Pausar',
    back: 'Atrás',
    stepInto: 'Siguiente paso',
    stepOver: 'Siguiente línea',
    reset: 'Reiniciar',
    speed: 'Velocidad',
    speeds: { slow: 'Lenta', normal: 'Normal', fast: 'Rápida' },
    counter: (step: number, total: number) => `Paso ${step}/${total}`,
    traceKind: 'Qué traza recorrer',
    traceKinds: {
      semantic: 'Semántica',
      execution: 'Ejecución',
    } satisfies Record<TraceKind, string>,
    traceKindHint: {
      semantic:
        'La traza del análisis semántico: insertar, buscar, comprobar tipos…',
      execution:
        'La traza de la ejecución: cada cuádrupla ejecutada, con la memoria y la salida de cada paso',
    } satisfies Record<TraceKind, string>,
    announce: (step: number, line: number, desc: string) =>
      `Paso ${step}, línea ${line}: ${desc}`,
  },
  phases: {
    label: 'Fases de compilación',
    stale: 'cambios sin compilar',
    names: {
      lexico: 'Léxico',
      sintactico: 'Sintáctico',
      semantico: 'Semántico',
      intermedio: 'Intermedio',
      ejecucion: 'Ejecución',
    } satisfies Record<Fase, string>,
    status: {
      ok: 'correcta',
      error: 'con errores',
      pending: 'pendiente',
    },
    hint: {
      lexico: 'Ver los tokens',
      sintactico: 'Ver el árbol sintáctico',
      semantico: 'Ver la tabla de símbolos',
      intermedio: 'Ver el código de tres direcciones, tripletas y cuádruplas',
      ejecucion: 'Ver la salida de la ejecución',
    } satisfies Record<Fase, string>,
  },
  timeline: {
    label: 'Línea de tiempo',
    tramo: (linea: number, vuelta?: number, vueltas?: number) =>
      `L${linea}${
        vuelta === undefined
          ? ''
          : vuelta === 0
            ? ' · inicio'
            : vueltas !== undefined && vuelta > vueltas
              ? ' · fin'
              : ` · v${vuelta}`
      }`,
    legend: 'Qué significa cada color',
    otherActions: 'otras acciones (inicio, fin, leer)',
    empty: 'La línea de tiempo aparecerá al recorrer la traza semántica.',
    step: (step: number, line: number, title: string) =>
      `Paso ${step}, línea ${line}: ${title}`,
    stepOf: (step: number, total: number, line: number, title: string) =>
      `Paso ${step} de ${total}, línea ${line}: ${title}`,
    zoomIn: 'Acercar: ver menos pasos alrededor del actual',
    zoomOut: 'Alejar',
    range: (desde: number, hasta: number, total: number) =>
      `pasos ${desde}–${hasta} de ${total}`,
  },
  editor: {
    label: 'Editor',
    stale: 'sin compilar',
    codeLabel:
      'Código fuente. Se compila solo al dejar de escribir; Ctrl+Enter compila ya. Ctrl+Espacio sugiere palabras. F9 activa o quita un punto de interrupción en la línea del cursor.',
    completion: {
      keyword: 'palabra reservada',
      type: 'tipo',
      variable: 'variable',
      constant: 'constante',
      snippet: 'plantilla',
      keywords: {
        va: 'declara variables: va ent x = 1, y',
        cn: 'declara una constante: cn dec PI = 3.14',
        lee: 'lee un valor de la entrada',
        di: 'escribe un valor en la salida',
        si: 'si condición instrucción [no instrucción]',
        no: 'rama «si no» de un si',
        rep: 'repite una instrucción n veces',
      },
      siNo: 'si … no …',
    },
  },
  stepCard: {
    label: 'Paso actual',
    ready:
      'El programa compiló. Pulsa «Ejecutar» para correrlo con la entrada, o «Recorrer traza» para ver el análisis semántico paso a paso.',
    readyWithErrors:
      'Hay errores semánticos. Recorre la traza para ver en qué paso aparece cada uno.',
    fixErrors:
      'Corrige los errores léxicos o sintácticos para llegar al análisis semántico.',
    stale: 'Hay cambios sin compilar. Pulsa «Compilar» (Ctrl+Enter).',
    gives: 'da',
    quad: (n: number) => `cuádrupla ${n}`,
    papel: (p: PapelPaso): string => {
      switch (p.tipo) {
        case 'repInicio':
          return `Empieza el rep: el contador de vueltas ${p.contador} se pone en 0.`
        case 'repCondicion':
          return `Comprueba si ya se dieron todas las vueltas: compara el contador ${p.contador} con el número de vueltas.`
        case 'repIncremento':
          return `Terminó el cuerpo de esta vuelta: el contador ${p.contador} aumenta en 1.`
        case 'repSalida':
          return p.sale
            ? `No quedan vueltas por dar: sale del ciclo y sigue en la cuádrupla ${p.destino}.`
            : 'Quedan vueltas: entra al cuerpo del rep.'
        case 'repSigue':
          return p.sigue
            ? `Quedan vueltas: vuelve al principio del cuerpo (cuádrupla ${p.destino}).`
            : 'Ya no quedan vueltas: sale del ciclo.'
        case 'repVuelve':
          return `Fin de la vuelta: vuelve a la condición del rep (cuádrupla ${p.destino}) para ver si quedan vueltas.`
        case 'siCondicion':
          return `La condición del si (${p.condicion}) es ${p.verdadera ? 'verdadera' : 'falsa'}: ${p.salta ? `salta a la cuádrupla ${p.destino}` : 'sigue con la cuádrupla siguiente'}.`
        case 'siFin':
          return `Termina la rama que se ejecutó: salta al final del si (cuádrupla ${p.destino}).`
      }
    },
    vuelta: (v: number, total?: number) =>
      v === 0
        ? 'Preparación del rep'
        : total !== undefined && v > total
          ? 'Salida del rep'
          : `Vuelta ${v}${total === undefined ? '' : ` de ${total}`}`,
    quads: 'Cuádruplas de esta línea',
    quadsNow: 'se ejecuta ahora',
    quadsNext: 'la siguiente',
    quadsJump: (n: number, linea: number) =>
      `Después sigue en la cuádrupla ${n} (línea ${linea}).`,
    quadsMore: (n: number) => `… ${n} más`,
    changes: 'Lo que cambió en la tabla en este paso',
    becomes: 'pasa a',
    treeLabel: 'El nodo del árbol que analiza este paso',
    actions: {
      inicio: 'Inicio del análisis',
      insertar: 'Insertar en la tabla',
      buscar: 'Buscar en la tabla',
      operacion: 'Comprobación de tipos',
      asignar: 'Asignación',
      leer: 'Lectura (lee)',
      mostrar: 'Mostrar (di)',
      condicion: 'Condición (si)',
      repetir: 'Repetición (rep)',
      advertencia: 'Advertencia',
      error: 'Error semántico',
      fin: 'Fin del análisis',
      arranque: 'Inicio de la ejecución',
      copiar: 'Copia (=)',
      calcular: 'Operación',
      leerEntrada: 'Lectura (read)',
      escribir: 'Escritura (write)',
      saltar: 'Salto',
      terminar: 'Fin de la ejecución',
      errorEjecucion: 'Error de ejecución',
    } satisfies Record<AccionTraza, string>,
    explain: {
      inicio:
        'El analizador semántico empieza a recorrer el árbol sintáctico, instrucción por instrucción.',
      insertar:
        'Se declara un identificador: se inserta en la tabla de símbolos (tabla hash) con su tipo, categoría, tamaño y dirección.',
      buscar:
        'Se usa un identificador: se busca en la tabla para comprobar que esté declarado, obtener su tipo y anotar la línea de referencia.',
      operacion:
        'Se comprueba que los tipos de los operandos sean compatibles con el operador y se calcula el tipo del resultado (atributo sintetizado).',
      asignar:
        'Se comprueba que el tipo de la expresión se pueda asignar al tipo del destino. Si es un literal, queda como valor inicial; si no, el valor se calcula al ejecutar.',
      leer: 'lee solo se permite sobre una variable declarada (no una constante). El valor llega del panel Entrada al ejecutar.',
      mostrar:
        'La expresión de di tiene tipos válidos. El valor se escribe en la salida al ejecutar.',
      condicion:
        'La condición de si debe ser bool. Las dos ramas se analizan; cuál se ejecuta se decide al ejecutar.',
      repetir:
        'La expresión de rep debe ser ent (y mayor que 0 si es un literal). El número de vueltas se conoce al ejecutar.',
      advertencia:
        'Algo sospechoso que no impide compilar: se informa como advertencia.',
      error:
        'Se viola una regla semántica: se registra el error y el análisis continúa.',
      fin: 'El recorrido terminó. Si no hubo errores, sigue la generación del código intermedio.',
      arranque:
        'El intérprete crea la memoria: cada variable y constante empieza con el valor por defecto de su tipo. El contador de programa apunta a la cuádrupla 0.',
      copiar:
        'La cuádrupla (=, a, –, x) copia el valor de a en x. Es la única conversión implícita: un ent guardado en un dec no cambia de valor.',
      calcular:
        'Se calcula a op b con los valores de la memoria y el resultado se guarda en su destino, con las reglas de desbordamiento del tipo.',
      leerEntrada:
        'read toma el siguiente valor del panel Entrada y lo convierte al tipo de la variable.',
      escribir: 'write agrega una línea a la salida con el valor del operando.',
      saltar:
        'if salta si la condición es verdadera; ifFalse, si es falsa; goto salta siempre. Si no salta, sigue con la cuádrupla siguiente.',
      terminar:
        'halt detiene el programa. La memoria queda con los valores finales.',
      errorEjecucion:
        'La cuádrupla no se pudo ejecutar: el programa se detiene aquí y el error se muestra con su línea.',
    } satisfies Record<AccionTraza, string>,
  },
  vars: {
    empty: 'La tabla de cada paso aparecerá al recorrer la traza.',
    title: 'Tabla de símbolos en este paso',
    none: 'La tabla de símbolos todavía está vacía.',
    new: 'nueva',
    changed: 'modificada',
    constant: 'constante',
    address: (n: number) => `dir ${n}`,
    watch: (name: string) => `Vigilar ${name}`,
    variables: 'Variables y constantes',
    temps: (n: number) => `Temporales y contadores (${n})`,
    tempChanged: (resumen: string) => `cambió: ${resumen}`,
  },
  memory: {
    empty: 'La memoria aparecerá al recorrer la traza.',
    title: 'Memoria simulada',
    hint: 'Cada símbolo ocupa los bytes de su tipo (ent 4, dec 8, txt 4, bool 1) a partir de su dirección.',
    bytes: (n: number) => `${n} byte${n === 1 ? '' : 's'}`,
    total: (n: number) => `${n} bytes ocupados`,
    noSymbols: 'Todavía no hay símbolos en memoria.',
  },
  watches: {
    history: (nombre: string, n: number) =>
      `Valores de ${nombre} hasta este paso (${n})`,
    atStep: (paso: number) => `desde el paso ${paso}`,
    inputLabel: 'Nuevo identificador vigilado',
    placeholder: 'p. ej. edad',
    add: 'Vigilar',
    empty: 'Añade un identificador para ver cómo cambia su valor en cada paso.',
    changed: 'cambió',
    pending: 'Se evaluará al recorrer la traza.',
    before: (v: string) => `antes: ${v}`,
    remove: (w: string) => `Quitar ${w}`,
    errors: {
      noStep: 'No hay ningún paso seleccionado.',
      onlyNames: 'Solo se pueden vigilar identificadores.',
      undeclared: 'No está en la tabla de símbolos en este paso.',
    },
  },
  console: {
    walking: (n: number, total: number) =>
      `Recorriendo la ejecución: ${n} de ${total} ${total === 1 ? 'línea escrita' : 'líneas escritas'}; el resto aparece al avanzar.`,
    waiting: 'La salida aparecerá cuando el programa compile y se ejecute.',
    compileFirst:
      'El programa tiene errores de compilación: corrígelos para poder ejecutarlo.',
    runFirst:
      'El programa compiló. Escribe los datos en «Entrada» (un valor por línea) y pulsa «Ejecutar».',
    output: 'Salida del programa',
    noOutput: '(sin salida)',
    runtimeError: (msg: string, line: number, quad: number) =>
      `ERROR de ejecución: ${msg} en línea ${line} (cuádrupla ${quad})`,
    executed: (n: number) =>
      `${n} ${n === 1 ? 'instrucción ejecutada' : 'instrucciones ejecutadas'} (límite 100 000)`,
  },
  input: {
    label: 'Entrada (un valor por línea)',
    placeholder: 'p. ej.\nAna\n2\n5',
    presets: 'Entradas de ejemplo',
    usePreset: 'Usar esta entrada',
  },
  intermediate: {
    label: 'Representación del código intermedio',
    empty:
      'El código intermedio se genera cuando el programa pasa el análisis semántico sin errores.',
    views: {
      tac: 'Tres direcciones',
      triplets: 'Tripletas',
      quads: 'Cuádruplas',
      blocks: 'Bloques básicos',
    },
    optimized: 'Optimizado',
    optimizedHint:
      'Muestra el código después del optimizador (pasadas O2 a O8). Sin marcar, el código es el del documento.',
    comparison: (antes: number, despues: number) =>
      `${antes} → ${despues} instrucciones`,
    executedComparison: (antes: number, despues: number) =>
      `ejecutadas: ${antes} → ${despues}`,
    executedAtLimit:
      'una ejecución llegó al límite de 100 000 instrucciones: no se comparan las ejecutadas',
    ownNumbering: (n: number) =>
      `${n} tripletas con su propia numeración: una operación con una variable como destino (x = a op b) son dos tripletas, la operación y la asignación de su resultado, (=, x, (k)).`,
    passesLabel: 'Pasadas del optimizador',
    passes: {
      O2: 'O2 constantes',
      O3: 'O3 algebraica',
      O4: 'O4 copias',
      O5: 'O5 subexpresiones comunes',
      O6: 'O6 código muerto',
      O7: 'O7 saltos',
      O8: 'O8 reutilizar temporales',
      G1: 'G1 saltos con comparación',
      G2: 'G2 ciclos invertidos',
      G3: 'G3 sacar del ciclo lo que no cambia',
      G4: 'G4 desenrollar rep',
    } satisfies Record<IdPasada, string>,
    passCount: (n: number) => `${n} ${n === 1 ? 'cambio' : 'cambios'}`,
    rounds: (n: number) =>
      `Hasta que ninguna pasada cambió nada: ${n} ${n === 1 ? 'ronda' : 'rondas'}.`,
    noOptimized: 'No hay código optimizado para este programa.',
    blocks: {
      label: 'Grafo de flujo de los bloques básicos',
      count: (n: number) => `${n} ${n === 1 ? 'bloque' : 'bloques'}`,
      range: (a: number, b: number) =>
        a === b ? `instrucción ${a}` : `instrucciones ${a} a ${b}`,
      from: 'llega desde',
      to: 'sigue con',
      entry: 'inicio del programa',
      end: 'fin del programa',
      hint: 'Un bloque básico se ejecuta siempre completo: solo se entra por su primera instrucción (un líder) y solo se sale por la última.',
    },
    columns: {
      n: 'N°',
      instruction: 'Instrucción',
      op: 'op',
      arg1: 'arg1',
      arg2: 'arg2',
      result: 'resultado',
    },
    count: (n: number) => `${n} instrucciones (0 a ${n - 1})`,
    fromLine: (l: number) => `Línea ${l} del programa`,
    jumpTarget: 'destino de un salto',
    jumpLands: 'aquí llega el salto del paso actual',
    legendLabel: 'Colores',
    legend: {
      asig: 'asignación',
      bin: 'operación',
      io: 'read / write',
      jump: 'if / goto',
      halt: 'halt',
      temp: 'temporal o contador',
    },
  },
  tokens: {
    empty: 'No hay tokens: compila el programa o carga un ejemplo.',
    label: 'Tabla de tokens',
    count: (n: number) => `${n} token${n === 1 ? '' : 's'}`,
    columns: {
      n: 'N°',
      tipo: 'Componente léxico',
      lexema: 'Lexema',
      valor: 'Valor',
      linea: 'Línea',
      columna: 'Columna',
    },
    groups: {
      reservada: 'palabra reservada',
      tipo: 'tipo de dato',
      literal: 'literal',
      id: 'identificador',
      operador: 'operador',
      salto: 'fin de línea',
    },
    names: {
      VA: 'VA',
      CN: 'CN',
      LEE: 'LEE',
      DI: 'DI',
      SI: 'SI',
      NO: 'NO',
      REP: 'REP',
      T_ENT: 'T_ENT',
      T_DEC: 'T_DEC',
      T_TXT: 'T_TXT',
      T_BOOL: 'T_BOOL',
      VERDADERO: 'VERDADERO',
      FALSO: 'FALSO',
      ID: 'ID',
      ENTERO: 'ENTERO',
      DECIMAL: 'DECIMAL',
      CADENA: 'CADENA',
      IGUAL: 'IGUAL',
      COMA: 'COMA',
      MAS: 'MAS',
      MENOS: 'MENOS',
      POR: 'POR',
      ENTRE: 'ENTRE',
      PAR_ABRE: 'PAR_ABRE',
      PAR_CIERRA: 'PAR_CIERRA',
      COMP: 'COMP',
      SALTO: 'SALTO',
    } satisfies Record<TipoToken, string>,
  },
  ast: {
    label: 'Árbol sintáctico',
    empty: 'No hay árbol: corrige los errores léxicos o sintácticos.',
    showAttrs: 'Mostrar atributos',
    terminal: 'terminal',
    nonTerminal: 'no terminal',
    inherited: 'heredado',
    synthesized: 'sintetizado',
    modeLabel: 'Qué árbol mostrar',
    modes: { abstract: 'Abstracto', derivation: 'Derivación' } satisfies Record<
      AstMode,
      string
    >,
    modeHint: {
      abstract:
        'Árbol sintáctico abstracto: las instrucciones y los operadores con sus operandos, sin signos de puntuación.',
      derivation:
        'Árbol de derivación: cada regla de la gramática G aplicada, con todos los tokens.',
    } satisfies Record<AstMode, string>,
    derivationHint:
      'Cada nodo es un no terminal de la gramática G y sus hijos, la regla que se aplicó. La regla recursiva programa → instruccion SALTO programa se muestra como una lista de instrucciones.',
    roles: {
      cond: 'condición',
      whenTrue: 'si es verdadera',
      whenFalse: 'no',
      times: 'vueltas',
      body: 'cuerpo',
    } satisfies Record<Rol, string>,
    rolesShort: {
      cond: 'condición',
      whenTrue: 'sí',
      whenFalse: 'no',
      times: 'vueltas',
      body: 'cuerpo',
    } satisfies Record<Rol, string>,
    fit: 'Ajustar',
    discarded: (linea: number) => `L${linea} descartada`,
    partialHint: (n: number) =>
      `Hay errores sintácticos: el árbol tiene solo las líneas correctas (el parser descartó ${n === 1 ? 'una línea' : `${n} líneas`} en modo pánico).`,
    hasError: 'error semántico',
    hasWarning: 'advertencia',
    errorInside: 'Hay un error semántico dentro',
    warningInside: 'Hay una advertencia dentro',
    expandAll: 'Expandir todo',
    collapseAll: 'Plegar todo',
    showGraph: 'Dibujo',
    graphLabel: (linea: number) => `Dibujo del árbol de la línea ${linea}`,
    graphHint: (linea: number) =>
      `Línea ${linea}: los operadores arriba y los operandos abajo. Elige otra instrucción en la lista o mueve el cursor en el código.`,
  },
  symbols: {
    label: 'Tabla de símbolos',
    empty:
      'La tabla de símbolos aparece cuando el programa llega al análisis semántico.',
    columns: {
      numero: 'N°',
      nombre: 'Nombre',
      categoria: 'Categoría',
      tipo: 'Tipo',
      tamano: 'Tamaño',
      direccion: 'Dirección',
      valor: 'Valor',
      lineaDecl: 'Línea decl.',
      lineasRef: 'Líneas ref.',
    },
    categories: {
      variable: 'variable',
      constante: 'constante',
      temporal: 'temporal',
    },
    showTemps: (n: number) => `Mostrar temporales (${n})`,
    initialValues: 'Valores iniciales (tras compilar)',
    finalValues: 'Valores finales (tras ejecutar)',
  },
  files: {
    open: 'Abrir',
    openHint:
      'Abrir un archivo .brv del disco (también puedes arrastrarlo al editor)',
    dropHint: 'Suelta el archivo para abrirlo',
    errors: {
      tooBig: (nombre: string, kb: number) =>
        `No se abrió «${nombre}»: pesa más de ${kb} KB.`,
      notText: (nombre: string) =>
        `No se abrió «${nombre}»: no es un archivo de texto.`,
      readFailed: (nombre: string) => `No se pudo leer «${nombre}».`,
    },
  },
  crash: {
    title: 'La página encontró un error',
    body: 'Algo falló al mostrar el resultado. Tu código está guardado en el navegador; recupera una versión que funcione para seguir trabajando.',
    restore: 'Volver a la última versión sin errores',
    example: 'Cargar el ejemplo potencia.brv',
  },
  problems: {
    empty: 'No hay errores.',
    warningsEmpty: 'No hay advertencias.',
    error: 'Error',
    warning: 'Advertencia',
    restore: 'Volver a la última versión sin errores',
    phases: {
      lexico: 'Errores léxicos',
      sintactico: 'Errores sintácticos',
      semantico: 'Errores semánticos',
      intermedio: 'Errores del código intermedio',
      ejecucion: 'Errores de ejecución',
    } satisfies Record<Fase, string>,
    phaseShort: {
      lexico: 'léxico',
      sintactico: 'sintáctico',
      semantico: 'semántico',
      intermedio: 'intermedio',
      ejecucion: 'ejecución',
    } satisfies Record<Fase, string>,
  },
  trace: {
    label: 'Traza semántica',
    labelExecution: 'Traza de la ejecución',
    empty: 'No hay traza: el análisis semántico no se ejecutó.',
    emptyExecution:
      'La traza de la ejecución aparece al ejecutar el programa (Ctrl+Shift+Enter).',
    filterLabel: 'Mostrar solo una acción',
    all: 'Todas',
    only: (accion: string) => `Mostrar solo: ${accion}`,
    steps: (n: number) => `${n} ${n === 1 ? 'paso' : 'pasos'}`,
    detail: 'Detalle de la traza semántica',
    detailFull: 'Completa',
    detailSummary: 'Resumida',
    detailHint: {
      full: 'Todos los pasos, también cada búsqueda en la tabla.',
      summary:
        'Sin las búsquedas en la tabla: solo lo que inserta, comprueba o cambia algo (un identificador que no existe sigue apareciendo como error). Los controles también se las saltan.',
    },
  },
  exportMenu: {
    source: 'Código fuente',
    output: 'Salida del programa',
    symbols: 'Tabla de símbolos',
    intermediate: 'Código intermedio',
    traceJson: 'Resultado completo (JSON)',
    traceCsv: 'Traza semántica',
    report: 'Informe completo (para imprimir o PDF)',
    zip: 'Todo en un archivo comprimido',
    tokens: 'Tokens',
    diagnostics: 'Errores y advertencias',
    treeText: 'Árbol (texto)',
    treeSvg: 'Árbol (imagen)',
    blocks: 'Bloques básicos (imagen)',
    documentsGroup: 'Documentos',
    sheetsGroup: 'Hojas de cálculo',
    codeGroup: 'Árbol y código',
    copyGroup: 'Copiar en Markdown (para pegar en un informe)',
    copyIntermediate: 'Código intermedio',
    copySymbols: 'Tabla de símbolos',
    copied: 'Copiado al portapapeles',
    copyFailed: 'No se pudo copiar: el navegador no lo permitió',
    reasons: {
      stale: 'Hay cambios sin compilar: compila primero',
      run: 'Ejecuta el programa para tener su salida',
      syntax: 'Corrige los errores léxicos y sintácticos para tener el árbol',
      semantic:
        'Corrige los errores léxicos y sintácticos para llegar al análisis semántico',
      compile: 'Corrige los errores para tener código intermedio',
    },
  },
  export: {
    tokensSuffix: 'tokens',
    diagnosticsSuffix: 'diagnosticos',
    treeSuffix: 'arbol',
    blocksSuffix: 'bloques',
    reportSuffix: 'informe',
    zipSuffix: 'todo',
    tokensHeader: [
      'numero',
      'componente',
      'lexema',
      'valor',
      'linea',
      'columna',
    ],
    diagnosticsHeader: ['tipo', 'fase', 'linea', 'columna', 'mensaje'],
    errorKind: 'error',
    warningKind: 'advertencia',
    withQuad: (mensaje: string, cuadrupla: number) =>
      `${mensaje} (cuádrupla ${cuadrupla})`,
    traceSuffix: 'traza',
    outputSuffix: 'salida',
    symbolsSuffix: 'simbolos',
    resultSuffix: 'resultado',
    intermediateSuffix: 'intermedio',
    optimizedSuffix: 'optimizado',
    csvSeparator: ';',
    yes: 'sí',
    no: 'no',
    outputInput: 'Entrada:',
    outputTitle: 'Salida:',
    noInput: '(sin entrada)',
    runtimeError: (msg: string, line: number, quad: number) =>
      `ERROR de ejecución: ${msg} en línea ${line} (cuádrupla ${quad})`,
    optimizedTitle: 'Código optimizado',
    optimizedSummary: (antes: number, despues: number) =>
      `${antes} → ${despues} instrucciones. Cambios de cada pasada:`,
    blocksHeader: 'Bloques básicos',
    block: (b: string, desde: number, hasta: number, de: string, a: string) =>
      `${b} (${desde === hasta ? `instrucción ${desde}` : `instrucciones ${desde} a ${hasta}`}) · llega desde: ${de} · sigue con: ${a}`,
    blockEntry: 'inicio del programa',
    blockEnd: 'fin del programa',
    finalValueHeader: 'valor_final',
    markdownIntermediateHeader: [
      'N°',
      'Tres direcciones',
      'Tripleta',
      'Cuádrupla',
    ],
    intermediateHeaders: [
      'Código de tres direcciones',
      'Tripletas (op, arg1, arg2)',
      'Cuádruplas (op, arg1, arg2, resultado)',
    ],
    tripletsOwnNumbering:
      'Las tripletas tienen su propia numeración: x = a op b son dos, (op, a, b) y (=, x, (k)).',
    csvHeader: [
      'paso',
      'linea',
      'columna',
      'instruccion',
      'accion',
      'detalle',
      'resultado',
      'cambios',
    ],
    traceNew: (nombre: string) => `${nombre} nueva`,
    symbolsHeader: [
      'numero',
      'nombre',
      'categoria',
      'tipo',
      'tamano',
      'direccion',
      'valor_inicial',
      'linea_declaracion',
      'lineas_referencia',
      'usado',
      'inicializado',
    ],
  },
  report: {
    title: (file: string) => `Informe de compilación: ${file}`,
    generated: (fecha: string, version: string) =>
      `Generado el ${fecha} con ${version}.`,
    printHint:
      'Para guardarlo como PDF, ábrelo en el navegador y usa Imprimir → Guardar como PDF.',
    contents: 'Contenido',
    sections: {
      source: 'Código fuente',
      lexical: 'Análisis léxico: tokens',
      syntax: 'Análisis sintáctico: árbol',
      semantic: 'Análisis semántico: tabla de símbolos',
      intermediate: 'Código intermedio',
      execution: 'Ejecución',
      diagnostics: 'Errores y advertencias',
    },
    none: 'Ninguno.',
    noTree: 'No hay árbol: el programa tiene errores léxicos o sintácticos.',
    treeCaption: (modo: string) =>
      `Árbol ${String(modo).toLowerCase()} del programa.`,
    treeTooBig: (n: number) =>
      `El programa tiene más de ${n} instrucciones: el árbol va solo como texto.`,
    noSymbols:
      'No hay tabla de símbolos: el programa no llegó al análisis semántico.',
    initialValue: 'Valor inicial',
    finalValue: 'Valor final',
    notRun: 'El programa no se ejecutó.',
    input: 'Entrada',
    output: 'Salida',
    noOutput: '(sin salida)',
    executed: (n: number) => `${n} instrucciones ejecutadas.`,
    phase: 'Fase',
    line: 'Línea',
    column: 'Columna',
    message: 'Mensaje',
    errors: (n: number) => `Errores (${n})`,
    warnings: (n: number) => `Advertencias (${n})`,
  },
  shortcuts: {
    title: 'Atajos de teclado',
    close: 'Cerrar',
    items: [
      { keys: 'Ctrl+Enter', desc: 'Compilar' },
      { keys: 'Ctrl+Shift+Enter', desc: 'Ejecutar' },
      { keys: 'F5', desc: 'Reproducir / pausar la traza' },
      { keys: 'F11', desc: 'Siguiente paso' },
      { keys: 'F10', desc: 'Siguiente línea' },
      { keys: 'F8', desc: 'Paso anterior' },
      { keys: 'F9', desc: 'Punto de interrupción (en el editor)' },
      { keys: '← → Inicio Fin', desc: 'Línea de tiempo, pestañas y listas' },
      { keys: 'Esc', desc: 'Cerrar paneles y diálogos' },
      { keys: '?', desc: 'Mostrar esta ayuda' },
    ],
  },
  tour: {
    progress: (n: number, total: number) => `${n} de ${total}`,
    close: 'Cerrar el tour',
    prev: 'Anterior',
    next: 'Siguiente',
    finish: 'Terminar',
    steps: [
      {
        title: 'Escribe tu programa',
        body: 'Usa las instrucciones va, cn, lee, di, si y rep con los tipos ent, dec, txt y bool. Pulsa «Compilar» o Ctrl+Enter. En «Ejemplos» hay programas válidos y uno con errores por cada fase.',
      },
      {
        title: 'Entrada y ejecución',
        body: 'Escribe aquí los datos que leerá cada lee, un valor por línea, y pulsa «Ejecutar» (Ctrl+Shift+Enter). Los botones cargan las entradas de ejemplo.',
      },
      {
        title: 'Fases de compilación',
        body: 'El código pasa por el análisis léxico, el sintáctico y el semántico, se traduce a código intermedio y se ejecuta. Aquí ves cuál fue correcta, cuál tuvo errores y cuál quedó pendiente. Haz clic en una fase para ver su resultado.',
      },
      {
        title: 'Recorre la traza semántica',
        body: '«Recorrer traza» muestra, paso a paso, cada acción del analizador: insertar, buscar, comprobar tipos, asignar… Siguiente paso (F11), Siguiente línea (F10) y Atrás (F8).',
      },
      {
        title: 'Línea de tiempo',
        body: 'Cada marca es un paso de la traza. Haz clic en cualquiera para saltar a él o usa las flechas del teclado.',
      },
      {
        title: 'Qué acaba de pasar',
        body: 'La tarjeta explica el paso actual y muestra lo que se evaluó y su resultado.',
      },
      {
        title: 'Variables, memoria y vigiladas',
        body: 'La tabla de símbolos de cada paso, con lo nuevo y lo modificado marcado; la memoria simulada con la dirección y el tamaño de cada símbolo; y los identificadores que vigiles.',
      },
      {
        title: 'Resultados de cada fase',
        body: 'Resultado de la ejecución, tabla de tokens, árbol sintáctico (con sus atributos), tabla de símbolos (con temporales), código intermedio en tres vistas, errores por fase, advertencias y la traza completa.',
      },
      {
        title: 'Exportar',
        body: 'Descarga el código, la salida, la tabla de símbolos, el código intermedio o la traza.',
      },
    ],
  },
}

export type Messages = typeof es
