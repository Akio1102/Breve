# Compilador Breve

Compilador web, escrito en TypeScript, para **Breve** (`.brv`), un lenguaje propio con palabras reservadas en español. En la página escribes un programa, lo compilas y ves el resultado de cada fase: **tokens**, **árbol sintáctico**, **tabla de símbolos**, **código de tres direcciones**, **tripletas**, **cuádruplas** y la **ejecución** con los datos del panel Entrada. Todo corre en el navegador, sin servidor.

**Contenido:** [Qué hace](#qué-hace) · [El lenguaje](#el-lenguaje-breve) · [Las fases](#las-fases-del-compilador) · [La página](#la-página) · [Levantar el proyecto](#levantar-el-proyecto) · [Arquitectura](#arquitectura) · [Pruebas y calidad](#pruebas-y-calidad) · [Decisiones de diseño](#decisiones-de-diseño) · [Límites conocidos](#límites-conocidos)

---

## Qué hace

- **Cinco fases reales** en [src/engine/](src/engine/): léxica, sintáctica, semántica, código intermedio y ejecución. Ningún resultado está escrito a mano; todos se calculan para el programa que escribas.
- **Una fase opcional de optimización:** bloques básicos, el grafo de flujo y 11 pasadas sobre el código intermedio. El código del documento no cambia.
- **Errores en cada fase,** con línea, columna y lo que se esperaba. El compilador se recupera y reporta varios errores en una sola pasada.
- **Trazas paso a paso** del análisis semántico y de la ejecución, cuádrupla por cuádrupla, con la tabla de símbolos y la memoria de cada paso.
- **Exportaciones:** informe completo para entregar (HTML imprimible), CSV, SVG, TXT, JSON y un `.zip` con todo.
- **Cumple el criterio de aceptación del plan:** al compilar `potencia.brv`, la página produce exactamente las 22 instrucciones (0 a 21) de las Figuras 4, 6 y 7 del documento.

---

## El lenguaje Breve

### Tipos de datos

| Palabra | Tipo     | Literales            | Valor por defecto | Tamaño               |
| ------- | -------- | -------------------- | ----------------- | -------------------- |
| `ent`   | Entero   | `20`, `-5`           | `0`               | 4 bytes              |
| `dec`   | Decimal  | `3.14`               | `0.0`             | 8 bytes              |
| `txt`   | Texto    | `"Hola"`             | `""`              | 4 bytes (referencia) |
| `bool`  | Booleano | `verdadero`, `falso` | `falso`           | 1 byte               |

### Instrucciones

| Instrucción                         | Significado                                                  |
| ----------------------------------- | ------------------------------------------------------------ |
| `va TIPO x [= expr] [, y [= expr]]` | Declara una o varias variables                               |
| `cn TIPO x = expr`                  | Declara una constante                                        |
| `lee x`                             | Lee un valor del panel Entrada y lo guarda en `x`            |
| `di expr`                           | Escribe el resultado de una expresión                        |
| `si cond instr [no instr]`          | Condicional; `cond` debe ser `bool`                          |
| `rep expr instr`                    | Repite `instr` las veces que indique `expr` (de tipo `ent`)  |
| `x = expr`                          | Asignación                                                   |

- Dentro de `si` y `rep` va una sola instrucción simple: `di` o una asignación.
- **Operadores**, de menor a mayor precedencia: comparadores (`> < >= <= == !=`), `+ -`, `* /` y el menos unario. Se pueden usar paréntesis.
- `+` suma números o concatena textos. `ent / ent` da `dec`. La única conversión implícita es de `ent` a `dec`.
- **Palabras reservadas (13):** `va`, `cn`, `lee`, `di`, `si`, `no`, `rep`, `ent`, `dec`, `txt`, `bool`, `verdadero` y `falso`.
- Los comentarios empiezan con `//`. Un identificador no puede empezar por `_`, porque ese prefijo está reservado para los contadores internos (`_c1`).

### Programa de referencia: `potencia.brv`

```text
// potencia.brv : calcula base elevado a exponente
va txt nombre
va ent base, exponente
va ent potencia = 1
lee nombre
lee base
lee exponente
di "Hola " + nombre
rep exponente potencia = potencia * base
di "Resultado:"
di potencia
si potencia > 100 di "Resultado grande" no di "Resultado pequeño"
```

| Entrada        | Salida                                          |
| -------------- | ----------------------------------------------- |
| `Ana`, `2`, `5` | `Hola Ana`, `Resultado:`, `32`, `Resultado pequeño` |
| `Ana`, `3`, `5` | `Hola Ana`, `Resultado:`, `243`, `Resultado grande` |
| `Ana`, `2`, `0` | `Hola Ana`, `Resultado:`, `1`, `Resultado pequeño`  |

### Gramática

```text
programa    → instruccion SALTO programa | instruccion SALTO
instruccion → va tipo listaVars | cn tipo ID = expr
            | lee ID | di expr | ID = expr
            | si expr simple | si expr simple no simple
            | rep expr simple
simple      → di expr | ID = expr
tipo        → ent | dec | txt | bool
listaVars   → var , listaVars | var
var         → ID = expr | ID
expr        → aritm COMP aritm | aritm
aritm       → aritm + termino | aritm - termino | termino
termino     → termino * factor | termino / factor | factor
factor      → - factor | ( expr ) | ENTERO | DECIMAL | CADENA
            | verdadero | falso | ID
COMP        → > | < | >= | <= | == | !=
```

---

## Las fases del compilador

```text
fuente ─► léxico ─► sintáctico ─► semántico ─► intermedio ─► (optimización) ─► ejecución
          tokens    árbol         árbol anotado  tres direcciones               salida y
                                  tabla de       tripletas                      valores finales
                                  símbolos       cuádruplas
```

Si una fase encuentra errores, las siguientes no se ejecutan, pero la página muestra lo que sí se alcanzó a producir (por ejemplo, el árbol parcial de las líneas correctas).

| Fase | Archivo | Qué hace |
| ---- | ------- | -------- |
| 1. Léxica | [lexer.ts](src/engine/lexer.ts) | Tres AFD guiados por tablas (identificadores, números y cadenas). Distingue palabras reservadas, `ENTERO` y `DECIMAL`. Reporta caracteres no válidos, cadenas sin cerrar y números mal formados, y sigue analizando |
| 2. Sintáctica | [parser.ts](src/engine/parser.ts) | Descendente recursivo, una función por no terminal. La recursión izquierda se implementa con ciclos. Se recupera en modo pánico hasta el siguiente fin de línea |
| 3. Semántica | [semantico.ts](src/engine/semantico.ts), [tipos.ts](src/engine/tipos.ts), [tablaSimbolos.ts](src/engine/tablaSimbolos.ts) | Tabla de símbolos hash, declaración antes del uso, duplicados, constantes, reglas de tipos, atributos heredados (`dtype`) y sintetizados (`tipo`), y advertencias que no detienen la compilación |
| 4. Intermedio | [intermedio.ts](src/engine/intermedio.ts), [tripletas.ts](src/engine/tripletas.ts), [cuadruplas.ts](src/engine/cuadruplas.ts) | Código de tres direcciones con temporales `tN` y contadores `_cN`, y saltos rellenados en una segunda pasada. Después lo convierte en tripletas y cuádruplas |
| Optimización | [bloques.ts](src/engine/bloques.ts), [optimizador.ts](src/engine/optimizador.ts) | Bloques básicos, propagación y plegado de constantes, simplificación algebraica, subexpresiones comunes, código muerto, saltos, ciclo invertido, código invariante y desenrollado de `rep` cortos |
| 5. Ejecución | [ejecutor.ts](src/engine/ejecutor.ts) | Recorre las cuádruplas con un contador de programa y una memoria de nombre a valor. Lee la entrada y reporta errores de ejecución. Se detiene a las 100 000 instrucciones ejecutadas |

Código de tres direcciones de `potencia.brv`:

```text
 0: potencia = 1               11: t4 = _c1 + 1
 1: read nombre                12: _c1 = t4
 2: read base                  13: goto 7
 3: read exponente             14: write "Resultado:"
 4: t1 = "Hola " + nombre      15: write potencia
 5: write t1                   16: t5 = potencia > 100
 6: _c1 = 0                    17: if t5 goto 20
 7: t2 = _c1 >= exponente      18: write "Resultado pequeño"
 8: if t2 goto 14              19: goto 21
 9: t3 = potencia * base       20: write "Resultado grande"
10: potencia = t3              21: halt
```

---

## La página

- **Editor** con resaltado de Breve, autocompletado (Ctrl+Espacio), errores y advertencias subrayados, sugerencias del tipo «¿quisiste decir 'va'?» y puntos de interrupción (clic en el margen o F9).
- **Compilación automática:** compila sola 350 ms después de dejar de escribir (hasta 120 000 caracteres). Ctrl+Enter compila de inmediato y Ctrl+Shift+Enter ejecuta.
- **Ejemplos:** `potencia.brv`, `tipos.brv` (tipos y constantes) y un programa con errores por cada fase: `error-lexico.brv`, `error-sintactico.brv`, `error-semantico.brv` y `division.brv` (error al ejecutar).
- **Panel Entrada:** un valor por línea. Los botones cargan las entradas de ejemplo (`Ana · 2 · 5`, `Ana · 3 · 5`…).
- **Barra de fases:** muestra si cada fase salió bien, tiene errores o está pendiente. Un clic abre su resultado.
- **Pestañas:**
  - **Resultado:** salida del programa, error de ejecución y cantidad de instrucciones ejecutadas.
  - **Tokens:** número, componente léxico, lexema, valor, línea y columna.
  - **Árbol:** abstracto o de derivación, como lista plegable y como dibujo, con el interruptor «Mostrar atributos». Queda enlazado con el editor en los dos sentidos y también se muestra cuando hay errores.
  - **Tabla de símbolos:** todos los campos del símbolo, el valor inicial y el final después de ejecutar, y un interruptor para mostrar los temporales.
  - **Código intermedio:** tres direcciones, tripletas, cuádruplas y bloques básicos, con la casilla **Optimizado** para comparar el código antes y después de optimizar.
  - **Errores**, **Advertencias** y **Traza:** la traza puede ser la semántica o la de la ejecución, agrupada por instrucción y con filtro por acción.
- **Depurador:** recorre la traza paso a paso (siguiente paso, siguiente línea, atrás y reproducción automática). Incluye una línea de tiempo y un inspector con lo que cambió, la tabla de símbolos, la memoria y las variables vigiladas con su historia.
- **Archivos:** abrir un `.brv` (con el botón o arrastrándolo al editor) y exportar el código, un `.zip`, el informe, CSV, SVG, TXT y JSON.
- **Además:** tour guiado, tema claro u oscuro, español o inglés, diseño para escritorio, tablet y móvil, y el código guardado en el navegador.

### Atajos

| Tecla               | Acción                                                                          |
| ------------------- | ------------------------------------------------------------------------------- |
| Ctrl+Enter          | Compilar (en el panel Entrada: ejecutar)                                        |
| Ctrl+Shift+Enter    | Ejecutar                                                                        |
| Ctrl+Espacio        | Autocompletar                                                                   |
| F5 / F11 / F10 / F8 | Reproducir o pausar la traza / siguiente paso / siguiente línea / paso anterior |
| F9 (en el editor)   | Poner o quitar un punto de interrupción                                         |
| ← → Inicio Fin      | Moverse por la línea de tiempo, las pestañas, los tokens y el árbol             |
| ?                   | Lista de atajos                                                                 |

---

## Levantar el proyecto

**Con el devcontainer:** abre la carpeta en VS Code y elige **Reopen in Container**. Se construye la imagen (Node 24 y pnpm), se instalan las dependencias desde la caché y arranca `pnpm dev`; el navegador abre <http://localhost:5173>. Si cierras esa terminal, vuelve a ejecutar `pnpm dev`. `node_modules` vive en RAM y se reconstruye en segundos al reiniciar el contenedor.

**Sin Docker:** instala Node 24 y ejecuta `corepack enable` para obtener la versión de pnpm que fija `package.json`. Después ejecuta `pnpm install` y `pnpm dev`.

| Comando                         | Qué hace                                                       |
| ------------------------------- | -------------------------------------------------------------- |
| `pnpm dev`                      | Servidor de desarrollo en <http://localhost:5173>              |
| `pnpm build` / `pnpm preview`   | Build de producción en `dist/` / servirlo para probarlo        |
| `pnpm test` / `pnpm test:watch` | Pruebas de Vitest                                              |
| `pnpm coverage`                 | Pruebas con cobertura (mínimo 85 % en general, 95 % en el núcleo) |
| `pnpm lint` / `pnpm format`     | Biome: lint, formato y orden de imports                        |
| `pnpm typecheck`                | `tsc`                                                          |
| `pnpm run ci`                   | Todo junto: lint, tipos, cobertura y build                     |

**Despliegue:** cada push a `main` ejecuta [.github/workflows/](.github/workflows/), que corre `pnpm run ci` y publica `dist/` en GitHub Pages. El build usa rutas relativas (`base: './'`), así que no depende del nombre del repositorio.

---

## Arquitectura

React 19, TypeScript (`strict`), Tailwind CSS 4, Zustand, CodeMirror 6, Vite 8 y Vitest. Otras bibliotecas: `@tanstack/react-virtual` (tablas largas), `d3-hierarchy` (dibujo del árbol), `fflate` (el `.zip`) y `lucide-react` (iconos).

```text
src/
  engine/      núcleo del compilador, sin React ni DOM
                 compile.ts       compile(fuente) y ejecutar(resultado, entrada): nunca lanzan
                 types.ts         el contrato con la interfaz: ResultadoCompilacion, Token, Simbolo, Cuadrupla…
                 lexer.ts         fase 1
                 parser.ts        fase 2
                 semantico.ts     fase 3, con tipos.ts, tablaSimbolos.ts y traza.ts
                 intermedio.ts    fase 4, con tripletas.ts y cuadruplas.ts
                 bloques.ts, optimizador.ts   fase opcional de optimización
                 ejecutor.ts      fase 5, con pasosEjecucion.ts (su traza)
                 resultado.ts     resultados que se detienen en una fase con errores
                 sugerencias.ts   «¿quisiste decir…?»
                 ejemplos.ts      programas de ejemplo y el código de referencia que exigen las pruebas
                 formato.ts, lenguaje.ts, watch.ts
  store/       estado de la página (Zustand, guardado en localStorage) y selectores
  features/    una carpeta por parte de la interfaz: editor, tokens, ast, symbols,
               intermediate, trace, debugger, inspector, export, tour…
  arbol/       modelo del árbol abstracto y del de derivación, su disposición y su dibujo
  layouts/     escritorio, móvil, encabezado, panel inferior e inspector
  ui/          piezas genéricas (botones, pestañas, filas virtualizadas, carga diferida)
  i18n/        textos en español y en inglés
tests/         Vitest, con la misma estructura que src/
```

- `engine/` no importa nada de React. Se puede usar y probar por separado.
- Las carpetas de `features/` no se importan entre sí; solo `layouts/` las combina.
- Las pestañas pesadas y las exportaciones se cargan aparte y se precargan cuando la página queda libre. Al abrir la página se descargan unos 117 KB comprimidos de JavaScript.
- Los alias `@/` (`src/`) y `@engine/` (`src/engine/`) se definen en `tsconfig.json`.

---


## Licencia

[MIT](LICENSE).
