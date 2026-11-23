import type { Messages } from './es'

export const en: Messages = {
  app: {
    name: 'Breve Compiler',
    description:
      'Compiler for the Breve language: tokens, syntax tree, symbol table, three-address code, triples, quadruples and execution.',
  },
  header: {
    examples: 'Examples',
    exampleNames: {
      potencia: 'potencia.brv (valid)',
      tipos: 'Types and constants (valid)',
      lexico: 'With lexical errors',
      sintactico: 'With syntax errors',
      semantico: 'With semantic (type) errors',
      ejecucion: 'With a runtime error',
    },
    compile: 'Compile',
    run: 'Run',
    runDisabled: 'Fix the compilation errors to run',
    tour: 'Guided tour',
    export: 'Export',
    showInspector: 'Show inspector',
    hideInspector: 'Hide inspector',
    shortcuts: 'Keyboard shortcuts',
  },
  prefs: {
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    systemHint: ' (system)',
    change: 'change',
    language: 'Language: English',
  },
  layout: {
    debugging: 'Trace walkthrough',
    inspector: 'Inspector',
    bottomPanel: 'Compilation results',
    resizeEditor: 'Resize editor and bottom panel',
    resizeInspector: 'Resize editor and inspector',
    showErrors: (n: number) =>
      n === 1 ? 'Show the error' : `Show the ${n} errors`,
    tabs: {
      vars: 'Variables',
      mem: 'Memory',
      watch: 'Watches',
      console: 'Output',
      tokens: 'Tokens',
      ast: 'Tree',
      symbols: 'Symbol table',
      intermediate: 'Intermediate code',
      problems: 'Errors',
      warnings: 'Warnings',
      trace: 'Trace',
    },
  },
  debug: {
    toolbar: 'Trace controls',
    debug: 'Walk trace',
    play: 'Play',
    pause: 'Pause',
    back: 'Back',
    stepInto: 'Next step',
    stepOver: 'Next line',
    reset: 'Restart',
    speed: 'Speed',
    speeds: { slow: 'Slow', normal: 'Normal', fast: 'Fast' },
    counter: (step: number, total: number) => `Step ${step}/${total}`,
    traceKind: 'Which trace to walk',
    traceKinds: { semantic: 'Semantic', execution: 'Execution' },
    traceKindHint: {
      semantic: 'The semantic analysis trace: insert, look up, check types…',
      execution:
        'The execution trace: every quadruple executed, with the memory and output of each step',
    },
    announce: (step: number, line: number, desc: string) =>
      `Step ${step}, line ${line}: ${desc}`,
  },
  phases: {
    label: 'Compilation phases',
    stale: 'uncompiled changes',
    names: {
      lexico: 'Lexical',
      sintactico: 'Syntax',
      semantico: 'Semantic',
      intermedio: 'Intermediate',
      ejecucion: 'Execution',
    },
    status: {
      ok: 'passed',
      error: 'has errors',
      pending: 'pending',
    },
    hint: {
      lexico: 'Show the tokens',
      sintactico: 'Show the syntax tree',
      semantico: 'Show the symbol table',
      intermedio: 'Show the three-address code, triples and quadruples',
      ejecucion: 'Show the execution output',
    },
  },
  timeline: {
    label: 'Timeline',
    tramo: (linea, vuelta, vueltas) =>
      `L${linea}${
        vuelta === undefined
          ? ''
          : vuelta === 0
            ? ' · setup'
            : vueltas !== undefined && vuelta > vueltas
              ? ' · exit'
              : ` · lap ${vuelta}`
      }`,
    legend: 'What each color means',
    otherActions: 'other actions (start, end, read)',
    empty: 'The timeline appears when you walk the semantic trace.',
    step: (step: number, line: number, title: string) =>
      `Step ${step}, line ${line}: ${title}`,
    stepOf: (step: number, total: number, line: number, title: string) =>
      `Step ${step} of ${total}, line ${line}: ${title}`,
    zoomIn: 'Zoom in: show fewer steps around the current one',
    zoomOut: 'Zoom out',
    range: (from: number, to: number, total: number) =>
      `steps ${from}–${to} of ${total}`,
  },
  editor: {
    label: 'Editor',
    stale: 'not compiled',
    codeLabel:
      'Source code. It compiles by itself when you stop typing; Ctrl+Enter compiles now. Ctrl+Space suggests words. F9 toggles a breakpoint on the cursor line.',
    completion: {
      keyword: 'keyword',
      type: 'type',
      variable: 'variable',
      constant: 'constant',
      snippet: 'template',
      keywords: {
        va: 'declares variables: va ent x = 1, y',
        cn: 'declares a constant: cn dec PI = 3.14',
        lee: 'reads a value from the input',
        di: 'writes a value to the output',
        si: 'si condition statement [no statement]',
        no: '“else” branch of a si',
        rep: 'repeats a statement n times',
      },
      siNo: 'si … no … (if … else …)',
    },
  },
  stepCard: {
    label: 'Current step',
    ready:
      'The program compiled. Press “Run” to execute it with the input, or “Walk trace” to follow the semantic analysis step by step.',
    readyWithErrors:
      'There are semantic errors. Walk the trace to see the step where each one appears.',
    fixErrors:
      'Fix the lexical or syntax errors to reach the semantic analysis.',
    stale: 'There are uncompiled changes. Press “Compile” (Ctrl+Enter).',
    gives: 'gives',
    quad: (n: number) => `quadruple ${n}`,
    papel: (p) => {
      switch (p.tipo) {
        case 'repInicio':
          return `The rep starts: the loop counter ${p.contador} is set to 0.`
        case 'repCondicion':
          return `Checks whether all the laps are done: compares the counter ${p.contador} with the number of laps.`
        case 'repIncremento':
          return `The body of this lap is done: the counter ${p.contador} goes up by 1.`
        case 'repSalida':
          return p.sale
            ? `No laps left: leaves the loop and continues at quadruple ${p.destino}.`
            : 'There are laps left: enters the body of the rep.'
        case 'repSigue':
          return p.sigue
            ? `There are laps left: goes back to the start of the body (quadruple ${p.destino}).`
            : 'No laps left: leaves the loop.'
        case 'repVuelve':
          return `End of the lap: goes back to the rep condition (quadruple ${p.destino}) to see if there are laps left.`
        case 'siCondicion':
          return `The si condition (${p.condicion}) is ${p.verdadera ? 'true' : 'false'}: ${p.salta ? `jumps to quadruple ${p.destino}` : 'continues with the next quadruple'}.`
        case 'siFin':
          return `The branch that ran is done: jumps to the end of the si (quadruple ${p.destino}).`
      }
    },
    vuelta: (v, total) =>
      v === 0
        ? 'Rep setup'
        : total !== undefined && v > total
          ? 'Rep exit'
          : `Lap ${v}${total === undefined ? '' : ` of ${total}`}`,
    quads: 'Quadruples of this line',
    quadsNow: 'runs now',
    quadsNext: 'next',
    quadsJump: (n, linea) =>
      `Then it continues at quadruple ${n} (line ${linea}).`,
    quadsMore: (n) => `… ${n} more`,
    changes: 'What changed in the table in this step',
    becomes: 'becomes',
    treeLabel: 'The tree node this step analyzes',
    actions: {
      inicio: 'Analysis starts',
      insertar: 'Insert into table',
      buscar: 'Look up in table',
      operacion: 'Type check',
      asignar: 'Assignment',
      leer: 'Read (lee)',
      mostrar: 'Show (di)',
      condicion: 'Condition (si)',
      repetir: 'Repetition (rep)',
      advertencia: 'Warning',
      error: 'Semantic error',
      fin: 'Analysis ends',
      arranque: 'Start of execution',
      copiar: 'Copy (=)',
      calcular: 'Operation',
      leerEntrada: 'Read (read)',
      escribir: 'Write (write)',
      saltar: 'Jump',
      terminar: 'End of execution',
      errorEjecucion: 'Runtime error',
    },
    explain: {
      inicio:
        'The semantic analyzer starts walking the syntax tree, one statement at a time.',
      insertar:
        'An identifier is declared: it is inserted into the symbol table (hash table) with its type, category, size and address.',
      buscar:
        'An identifier is used: it is looked up in the table to check it is declared, get its type and record the reference line.',
      operacion:
        'The operand types are checked against the operator and the result type is computed (synthesized attribute).',
      asignar:
        'The expression type is checked against the target type. A literal becomes the initial value; any other value is computed at run time.',
      leer: 'lee is only allowed on a declared variable (not a constant). The value comes from the Input panel at run time.',
      mostrar:
        'The di expression has valid types. Its value is written to the output at run time.',
      condicion:
        'The condition of si must be bool. Both branches are analyzed; which one runs is decided at run time.',
      repetir:
        'The expression of rep must be ent (and greater than 0 if it is a literal). The number of iterations is known at run time.',
      advertencia:
        'Something suspicious that does not stop compilation: it is reported as a warning.',
      error:
        'A semantic rule is broken: the error is recorded and the analysis continues.',
      fin: 'The walk is over. Without errors, intermediate code generation follows.',
      arranque:
        'The interpreter creates the memory: every variable and constant starts with its type’s default value. The program counter points to quadruple 0.',
      copiar:
        'The quadruple (=, a, –, x) copies the value of a into x. It is the only implicit conversion: an ent stored in a dec keeps its value.',
      calcular:
        'a op b is computed with the values in memory and the result is stored in its target, with the overflow rules of its type.',
      leerEntrada:
        'read takes the next value from the Input panel and converts it to the variable’s type.',
      escribir: 'write appends a line with the operand’s value to the output.',
      saltar:
        'if jumps when the condition is true; ifFalse, when it is false; goto always jumps. Otherwise execution goes on with the next quadruple.',
      terminar: 'halt stops the program. Memory keeps the final values.',
      errorEjecucion:
        'The quadruple could not be executed: the program stops here and the error is shown with its line.',
    },
  },
  vars: {
    empty: 'The table for each step appears when you walk the trace.',
    title: 'Symbol table at this step',
    none: 'The symbol table is still empty.',
    new: 'new',
    changed: 'changed',
    constant: 'constant',
    address: (n: number) => `addr ${n}`,
    watch: (name: string) => `Watch ${name}`,
    variables: 'Variables and constants',
    temps: (n: number) => `Temporaries and counters (${n})`,
    tempChanged: (resumen: string) => `changed: ${resumen}`,
  },
  memory: {
    empty: 'Memory appears when you walk the trace.',
    title: 'Simulated memory',
    hint: 'Each symbol takes the bytes of its type (ent 4, dec 8, txt 4, bool 1) starting at its address.',
    bytes: (n: number) => `${n} byte${n === 1 ? '' : 's'}`,
    total: (n: number) => `${n} bytes used`,
    noSymbols: 'No symbols in memory yet.',
  },
  watches: {
    history: (name: string, n: number) =>
      `Values of ${name} up to this step (${n})`,
    atStep: (step: number) => `since step ${step}`,
    inputLabel: 'New watched identifier',
    placeholder: 'e.g. edad',
    add: 'Watch',
    empty: 'Add an identifier to see how its value changes at each step.',
    changed: 'changed',
    pending: 'It will be evaluated when you walk the trace.',
    before: (v: string) => `before: ${v}`,
    remove: (w: string) => `Remove ${w}`,
    errors: {
      noStep: 'No step is selected.',
      onlyNames: 'Only identifiers can be watched.',
      undeclared: 'Not in the symbol table at this step.',
    },
  },
  console: {
    walking: (n: number, total: number) =>
      `Walking the execution: ${n} of ${total} ${total === 1 ? 'line' : 'lines'} written; the rest appears as you step.`,
    waiting: 'The output appears when the program compiles and runs.',
    compileFirst:
      'The program has compilation errors: fix them to be able to run it.',
    runFirst:
      'The program compiled. Type the data in “Input” (one value per line) and press “Run”.',
    output: 'Program output',
    noOutput: '(no output)',
    runtimeError: (msg: string, line: number, quad: number) =>
      `Runtime ERROR: ${msg} at line ${line} (quadruple ${quad})`,
    executed: (n: number) =>
      `${n} instruction${n === 1 ? '' : 's'} executed (limit 100,000)`,
  },
  input: {
    label: 'Input (one value per line)',
    placeholder: 'e.g.\nAna\n2\n5',
    presets: 'Sample inputs',
    usePreset: 'Use this input',
  },
  intermediate: {
    label: 'Intermediate code representation',
    empty:
      'Intermediate code is generated once the program passes the semantic analysis without errors.',
    views: {
      tac: 'Three-address',
      triplets: 'Triples',
      quads: 'Quadruples',
      blocks: 'Basic blocks',
    },
    optimized: 'Optimized',
    optimizedHint:
      'Shows the code after the optimizer (passes O2 to O8). Unchecked, the code is the one in the document.',
    comparison: (before: number, after: number) =>
      `${before} → ${after} instructions`,
    executedComparison: (before: number, after: number) =>
      `executed: ${before} → ${after}`,
    executedAtLimit:
      'a run hit the 100,000-instruction limit: executed counts are not compared',
    ownNumbering: (n: number) =>
      `${n} triples with their own numbering: an operation whose target is a variable (x = a op b) becomes two triples, the operation and the assignment of its result, (=, x, (k)).`,
    passesLabel: 'Optimizer passes',
    passes: {
      O2: 'O2 constants',
      O3: 'O3 algebraic',
      O4: 'O4 copies',
      O5: 'O5 common subexpressions',
      O6: 'O6 dead code',
      O7: 'O7 jumps',
      O8: 'O8 temporary reuse',
      G1: 'G1 compare-and-jump',
      G2: 'G2 loop inversion',
      G3: 'G3 loop-invariant code motion',
      G4: 'G4 rep unrolling',
    },
    passCount: (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`,
    rounds: (n: number) =>
      `Until no pass changed anything: ${n} ${n === 1 ? 'round' : 'rounds'}.`,
    noOptimized: 'There is no optimized code for this program.',
    blocks: {
      label: 'Flow graph of the basic blocks',
      count: (n: number) => `${n} ${n === 1 ? 'block' : 'blocks'}`,
      range: (a: number, b: number) =>
        a === b ? `instruction ${a}` : `instructions ${a} to ${b}`,
      from: 'comes from',
      to: 'continues to',
      entry: 'program start',
      end: 'program end',
      hint: 'A basic block always runs whole: it is entered only through its first instruction (a leader) and left only through its last.',
    },
    columns: {
      n: '#',
      instruction: 'Instruction',
      op: 'op',
      arg1: 'arg1',
      arg2: 'arg2',
      result: 'result',
    },
    count: (n: number) => `${n} instructions (0 to ${n - 1})`,
    fromLine: (l: number) => `Program line ${l}`,
    jumpTarget: 'jump target',
    jumpLands: 'the current step jumps here',
    legendLabel: 'Colors',
    legend: {
      asig: 'assignment',
      bin: 'operation',
      io: 'read / write',
      jump: 'if / goto',
      halt: 'halt',
      temp: 'temporary or counter',
    },
  },
  tokens: {
    empty: 'No tokens: compile the program or load an example.',
    label: 'Token table',
    count: (n: number) => `${n} token${n === 1 ? '' : 's'}`,
    columns: {
      n: '#',
      tipo: 'Token',
      lexema: 'Lexeme',
      valor: 'Value',
      linea: 'Line',
      columna: 'Column',
    },
    groups: {
      reservada: 'reserved word',
      tipo: 'data type',
      literal: 'literal',
      id: 'identifier',
      operador: 'operator',
      salto: 'end of line',
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
    },
  },
  ast: {
    label: 'Syntax tree',
    empty: 'No tree: fix the lexical or syntax errors.',
    showAttrs: 'Show attributes',
    terminal: 'terminal',
    nonTerminal: 'non-terminal',
    inherited: 'inherited',
    synthesized: 'synthesized',
    modeLabel: 'Which tree to show',
    modes: { abstract: 'Abstract', derivation: 'Derivation' },
    modeHint: {
      abstract:
        'Abstract syntax tree: statements and operators with their operands, without punctuation.',
      derivation:
        'Derivation tree: every rule of grammar G that was applied, with all the tokens.',
    },
    derivationHint:
      'Each node is a non-terminal of grammar G and its children are the rule that was applied. The recursive rule programa → instruccion SALTO programa is shown as a list of statements.',
    roles: {
      cond: 'condition',
      whenTrue: 'if true',
      whenFalse: 'else',
      times: 'times',
      body: 'body',
    },
    rolesShort: {
      cond: 'condition',
      whenTrue: 'yes',
      whenFalse: 'no',
      times: 'times',
      body: 'body',
    },
    fit: 'Fit',
    discarded: (line: number) => `L${line} discarded`,
    partialHint: (n: number) =>
      `There are syntax errors: the tree only has the correct lines (the parser discarded ${n === 1 ? 'one line' : `${n} lines`} in panic mode).`,
    hasError: 'semantic error',
    hasWarning: 'warning',
    errorInside: 'There is a semantic error inside',
    warningInside: 'There is a warning inside',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    showGraph: 'Drawing',
    graphLabel: (line: number) => `Tree drawing for line ${line}`,
    graphHint: (line: number) =>
      `Line ${line}: operators on top, operands below. Pick another statement in the list or move the cursor in the code.`,
  },
  symbols: {
    label: 'Symbol table',
    empty:
      'The symbol table appears once the program reaches the semantic analysis.',
    columns: {
      numero: '#',
      nombre: 'Name',
      categoria: 'Category',
      tipo: 'Type',
      tamano: 'Size',
      direccion: 'Address',
      valor: 'Value',
      lineaDecl: 'Decl. line',
      lineasRef: 'Ref. lines',
    },
    categories: {
      variable: 'variable',
      constante: 'constant',
      temporal: 'temporary',
    },
    showTemps: (n: number) => `Show temporaries (${n})`,
    initialValues: 'Initial values (after compiling)',
    finalValues: 'Final values (after running)',
  },
  files: {
    open: 'Open',
    openHint:
      'Open a .brv file from disk (you can also drag it onto the editor)',
    dropHint: 'Drop the file to open it',
    errors: {
      tooBig: (name: string, kb: number) =>
        `«${name}» was not opened: it is larger than ${kb} KB.`,
      notText: (name: string) =>
        `«${name}» was not opened: it is not a text file.`,
      readFailed: (name: string) => `«${name}» could not be read.`,
    },
  },
  crash: {
    title: 'The page ran into an error',
    body: 'Something failed while showing the result. Your code is saved in the browser; restore a working version to keep going.',
    restore: 'Go back to the last version without errors',
    example: 'Load the potencia.brv example',
  },
  problems: {
    empty: 'No errors.',
    warningsEmpty: 'No warnings.',
    error: 'Error',
    warning: 'Warning',
    restore: 'Go back to the last version without errors',
    phases: {
      lexico: 'Lexical errors',
      sintactico: 'Syntax errors',
      semantico: 'Semantic errors',
      intermedio: 'Intermediate code errors',
      ejecucion: 'Runtime errors',
    },
    phaseShort: {
      lexico: 'lexical',
      sintactico: 'syntax',
      semantico: 'semantic',
      intermedio: 'intermediate',
      ejecucion: 'runtime',
    },
  },
  trace: {
    filterLabel: 'Show a single action',
    all: 'All',
    only: (action: string) => `Show only: ${action}`,
    steps: (n: number) => `${n} ${n === 1 ? 'step' : 'steps'}`,
    detail: 'Semantic trace detail',
    detailFull: 'Full',
    detailSummary: 'Summary',
    detailHint: {
      full: 'Every step, including each table lookup.',
      summary:
        'Without the table lookups: only what inserts, checks or changes something (an identifier that does not exist still shows up as an error). The controls skip them too.',
    },
    label: 'Semantic trace',
    labelExecution: 'Execution trace',
    emptyExecution:
      'The execution trace appears once you run the program (Ctrl+Shift+Enter).',
    empty: 'No trace: the semantic analysis did not run.',
  },
  exportMenu: {
    source: 'Source code',
    output: 'Program output',
    symbols: 'Symbol table',
    intermediate: 'Intermediate code',
    traceJson: 'Full result (JSON)',
    traceCsv: 'Semantic trace',
    report: 'Full report (to print or save as PDF)',
    zip: 'Everything in a compressed file',
    tokens: 'Tokens',
    diagnostics: 'Errors and warnings',
    treeText: 'Tree (text)',
    treeSvg: 'Tree (image)',
    blocks: 'Basic blocks (image)',
    documentsGroup: 'Documents',
    sheetsGroup: 'Spreadsheets',
    codeGroup: 'Tree and code',
    copyGroup: 'Copy as Markdown (to paste into a report)',
    copyIntermediate: 'Intermediate code',
    copySymbols: 'Symbol table',
    copied: 'Copied to the clipboard',
    copyFailed: 'Could not copy: the browser did not allow it',
    reasons: {
      stale: 'There are uncompiled changes: compile first',
      run: 'Run the program to get its output',
      syntax: 'Fix the lexical and syntax errors to get the tree',
      semantic: 'Fix the lexical and syntax errors to reach semantic analysis',
      compile: 'Fix the errors to get intermediate code',
    },
  },
  export: {
    tokensSuffix: 'tokens',
    diagnosticsSuffix: 'diagnostics',
    treeSuffix: 'tree',
    blocksSuffix: 'blocks',
    reportSuffix: 'report',
    zipSuffix: 'all',
    tokensHeader: ['number', 'token', 'lexeme', 'value', 'line', 'column'],
    diagnosticsHeader: ['kind', 'phase', 'line', 'column', 'message'],
    errorKind: 'error',
    warningKind: 'warning',
    withQuad: (message: string, quad: number) =>
      `${message} (quadruple ${quad})`,
    traceSuffix: 'trace',
    outputSuffix: 'output',
    symbolsSuffix: 'symbols',
    resultSuffix: 'result',
    intermediateSuffix: 'intermediate',
    optimizedSuffix: 'optimized',
    csvSeparator: ',',
    yes: 'yes',
    no: 'no',
    outputInput: 'Input:',
    outputTitle: 'Output:',
    noInput: '(no input)',
    runtimeError: (msg: string, line: number, quad: number) =>
      `Runtime ERROR: ${msg} at line ${line} (quadruple ${quad})`,
    optimizedTitle: 'Optimized code',
    optimizedSummary: (before: number, after: number) =>
      `${before} → ${after} instructions. Changes made by each pass:`,
    blocksHeader: 'Basic blocks',
    block: (b: string, from: number, to: number, pre: string, next: string) =>
      `${b} (${from === to ? `instruction ${from}` : `instructions ${from} to ${to}`}) · comes from: ${pre} · continues to: ${next}`,
    blockEntry: 'program start',
    blockEnd: 'program end',
    finalValueHeader: 'final_value',
    markdownIntermediateHeader: ['#', 'Three-address', 'Triple', 'Quadruple'],
    intermediateHeaders: [
      'Three-address code',
      'Triples (op, arg1, arg2)',
      'Quadruples (op, arg1, arg2, result)',
    ],
    tripletsOwnNumbering:
      'Triples have their own numbering: x = a op b becomes two, (op, a, b) and (=, x, (k)).',
    csvHeader: [
      'step',
      'line',
      'column',
      'instruction',
      'action',
      'detail',
      'result',
      'changes',
    ],
    traceNew: (name: string) => `${name} new`,
    symbolsHeader: [
      'number',
      'name',
      'category',
      'type',
      'size',
      'address',
      'initial_value',
      'declaration_line',
      'reference_lines',
      'used',
      'initialized',
    ],
  },
  report: {
    title: (file: string) => `Compilation report: ${file}`,
    generated: (date: string, version: string) =>
      `Generated on ${date} with ${version}.`,
    printHint:
      'To save it as a PDF, open it in the browser and use Print → Save as PDF.',
    contents: 'Contents',
    sections: {
      source: 'Source code',
      lexical: 'Lexical analysis: tokens',
      syntax: 'Syntax analysis: tree',
      semantic: 'Semantic analysis: symbol table',
      intermediate: 'Intermediate code',
      execution: 'Execution',
      diagnostics: 'Errors and warnings',
    },
    none: 'None.',
    noTree: 'No tree: the program has lexical or syntax errors.',
    treeCaption: (mode: string) => `${mode} tree of the program.`,
    treeTooBig: (n: number) =>
      `The program has more than ${n} statements: the tree is included as text only.`,
    noSymbols: 'No symbol table: the program did not reach semantic analysis.',
    initialValue: 'Initial value',
    finalValue: 'Final value',
    notRun: 'The program was not run.',
    input: 'Input',
    output: 'Output',
    noOutput: '(no output)',
    executed: (n: number) => `${n} instructions executed.`,
    phase: 'Phase',
    line: 'Line',
    column: 'Column',
    message: 'Message',
    errors: (n: number) => `Errors (${n})`,
    warnings: (n: number) => `Warnings (${n})`,
  },
  shortcuts: {
    title: 'Keyboard shortcuts',
    close: 'Close',
    items: [
      { keys: 'Ctrl+Enter', desc: 'Compile' },
      { keys: 'Ctrl+Shift+Enter', desc: 'Run' },
      { keys: 'F5', desc: 'Play / pause the trace' },
      { keys: 'F11', desc: 'Next step' },
      { keys: 'F10', desc: 'Next line' },
      { keys: 'F8', desc: 'Previous step' },
      { keys: 'F9', desc: 'Breakpoint (in the editor)' },
      { keys: '← → Home End', desc: 'Timeline, tabs and lists' },
      { keys: 'Esc', desc: 'Close panels and dialogs' },
      { keys: '?', desc: 'Show this help' },
    ],
  },
  tour: {
    progress: (n: number, total: number) => `${n} of ${total}`,
    close: 'Close the tour',
    prev: 'Previous',
    next: 'Next',
    finish: 'Finish',
    steps: [
      {
        title: 'Write your program',
        body: 'Use the va, cn, lee, di, si and rep statements with the ent, dec, txt and bool types. Press “Compile” or Ctrl+Enter. “Examples” has valid programs and one with errors for each phase.',
      },
      {
        title: 'Input and execution',
        body: 'Type the data each lee will read here, one value per line, and press “Run” (Ctrl+Shift+Enter). The buttons load the sample inputs.',
      },
      {
        title: 'Compilation phases',
        body: 'The code goes through lexical, syntax and semantic analysis, is translated to intermediate code and runs. Here you see which passed, which had errors and which is pending. Click a phase to see its result.',
      },
      {
        title: 'Walk the semantic trace',
        body: '“Walk trace” shows each action of the analyzer step by step: insert, look up, type check, assign… Next step (F11), Next line (F10) and Back (F8).',
      },
      {
        title: 'Timeline',
        body: 'Each mark is a step of the trace. Click any of them to jump to it, or use the arrow keys.',
      },
      {
        title: 'What just happened',
        body: 'The card explains the current step and shows what was evaluated and its result.',
      },
      {
        title: 'Variables, memory and watches',
        body: 'The symbol table at each step with new and changed entries marked; simulated memory with each symbol’s address and size; and the identifiers you watch.',
      },
      {
        title: 'Results of each phase',
        body: 'Execution output, token table, syntax tree (with its attributes), symbol table (with temporaries), intermediate code in three views, errors by phase, warnings and the full trace.',
      },
      {
        title: 'Export',
        body: 'Download the code, the output, the symbol table, the intermediate code or the trace.',
      },
    ],
  },
}
