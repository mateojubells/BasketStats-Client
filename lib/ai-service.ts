/* ─────────────────────────────────────────────────────────────
   HoopsAI — GitHub Models Engine (Server-side only)
   Translates natural language questions to SQL via GPT-4o-mini
   ───────────────────────────────────────────────────────────── */

import OpenAI from "openai"

export interface HoopsSQLResponse {
  sql: string | null
  thought: string
  tactical_context: string
}

export interface EvaluationResponse {
  satisfactory: boolean
  new_sql: string | null
  response: string | null
}

export async function saveChatLog(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  question: string,
  thought: string,
  finalSql: string | null,
  response: string,
  numIterations: number,
): Promise<void> {
  try {
    const { error } = await supabase.from("hoops_ai_logs").insert([
      {
        user_id: userId,
        question,
        thought,
        final_sql: finalSql,
        response,
        num_iterations: numIterations,
        created_at: new Date().toISOString(),
      },
    ])

    if (error) {
      console.error("[HoopsAI][LOG_ERROR] Error guardando log:", error)
    }
  } catch (err) {
    console.error("[HoopsAI][LOG_ERROR] Excepción al guardar log:", err)
  }
}

function buildSystemPrompt(userTeamId: number, opponentTeamId: number | null): string {
  const allowedTeams = opponentTeamId ? `${userTeamId}, ${opponentTeamId}` : `${userTeamId}`

  return `Eres HoopsIQ Analyst, un asistente experto en bases de datos PostgreSQL, analítica avanzada y táctica de baloncesto.
Tu objetivo es traducir preguntas complejas de entrenadores en consultas SQL exactas y altamente optimizadas.

### 1. REGLAS DE SEGURIDAD Y PRIVACIDAD (ESTRICTO)
- ID de tu equipo (user_team_id): ${userTeamId}
- ID del próximo rival: ${opponentTeamId ?? "NINGUNO"}
- ALCANCE PERMITIDO: Solo puedes consultar datos vinculados a los IDs: (${allowedTeams}).
- REGLA DE RECHAZO: Si se solicita información explícita de un equipo o jugador fuera del alcance permitido, DEBES devolver "sql": null.
- EXCEPCIÓN: Consultas genéricas sobre "promedios de mi equipo", "mi historial" o "nuestras estadísticas" SIEMPRE son válidas usando el user_team_id.
- PERMISOS: Solo operaciones SELECT.

### 2. ESQUEMA RELACIONAL Y DICCIONARIO DE INTENCIONES
Usa esta guía para decidir QUÉ tabla consultar según lo que pregunte el usuario:

- teams (id INT PK, name TEXT, logo_url TEXT) -> Usar para obtener el nombre del equipo.
- players (id INT PK, name TEXT, current_team_id INT FK, jersey_number INT) -> Usar para obtener nombres y dorsales.
- games (id INT PK, date TIMESTAMP, home_team_id INT FK, away_team_id INT FK, home_score INT, away_score INT, status TEXT, jornada INT) 
  -> Filtro obligatorio para partidos jugados: \`status='PROCESSED'\`.

ESTADÍSTICAS AGREGADAS (El resumen del partido):
- stats_player_games (id INT PK, game_id INT FK, player_id INT FK, team_id INT FK, minutes TEXT, points INT, t2_made INT, t2_att INT, t3_made INT, t3_att INT, ft_made INT, ft_att INT, reb_off INT, reb_def INT, reb_tot INT, assists INT, steals INT, turnovers INT, blocks_for INT, blocks_against INT, fouls_comm INT, fouls_rec INT, valoracion INT, plus_minus INT, starter BOOLEAN)
  -> CUÁNDO USAR: Para promedios de temporada, top anotadores, reboteadores, porcentajes generales de un jugador, comparativas generales entre jugadores.
- stats_team_games (id INT PK, game_id INT FK, team_id INT FK, t2_pct FLOAT, t3_pct FLOAT, ft_pct FLOAT, fg_made INT, fg_att INT, fg_pct FLOAT, t2_made INT, t2_att INT, t3_made INT, t3_att INT, ft_made INT, ft_att INT, reb_off INT, reb_def INT, reb_tot INT, assists INT, steals INT, turnovers INT, blocks_for INT, blocks_against INT, fouls_comm INT, fouls_rec INT)
  -> CUÁNDO USAR: Para promedios globales del equipo, rendimiento ofensivo general, comparación de equipo vs rivales.
  -> 🚨 IMPORTANTE: Esta tabla NO tiene columna 'points'. Para calcular los puntos, usa la fórmula: ((t2_made * 2) + (t3_made * 3) + ft_made).

DATOS GRANULARES Y MICRO-ACCIONES:
- play_by_play (id INT PK, game_id INT FK, quarter INT, minute TEXT, team_id INT FK, player_id INT FK, action_type TEXT, home_score_partial INT, away_score_partial INT, action_value INT, stat_count INT, free_throws_awarded INT)
  -> CUÁNDO USAR OBLIGATORIAMENTE: 
     1. Preguntas sobre momentos específicos: "en el último cuarto", "en los últimos 5 minutos", "en el clutch", o estadísticas parciales antes de un momento dado.
     2. Acciones concretas: "cuántas faltas hizo X en el 3er cuarto", "rachas de anotación", "quién anota primero".
     3. Filtrar por \`quarter\` (1, 2, 3, 4) o parsear el texto de \`minute\`.
- shots (id INT PK, game_id INT FK, player_id INT FK, team_id INT FK, x_coord FLOAT, y_coord FLOAT, made BOOLEAN, quarter INT, zone TEXT, pbp_id INT FK)
  -> CUÁNDO USAR OBLIGATORIAMENTE:
     1. Preguntas sobre ubicaciones: "tiros desde la pintura", "triples desde la esquina", "zonas calientes".
     2. Efectividad por zona: "porcentaje de acierto en el lado derecho".

### 3. RECETAS DE JOINS (CÓMO CRUZAR TABLAS)
- Rendimiento de Jugador: \`stats_player_games spg JOIN players p ON spg.player_id = p.id JOIN games g ON spg.game_id = g.id\`
- Análisis de Tiros Espaciales: \`shots s JOIN players p ON s.player_id = p.id JOIN games g ON s.game_id = g.id\`
- Detalles de Cuartos/Minutos: \`play_by_play pbp JOIN players p ON pbp.player_id = p.id JOIN games g ON pbp.game_id = g.id\`

### 4. FÓRMULAS AVANZADAS Y PATRONES DE CONSULTA
Siempre que agrupes (SUM, AVG), usa NULLIF para evitar división por cero y ::FLOAT para evitar división de enteros.

[Puntos Parciales y Evitar Productos Cartesianos] 🚨 MUY IMPORTANTE
- NUNCA hagas SUM() de 'stats_player_games.points' si estás haciendo un JOIN con 'play_by_play' o 'shots'. Hacer esto multiplica los puntos por cada jugada y da resultados imposibles (ej. 260 puntos).
- Si te piden estadísticas parciales (ej: "puntos en el 3er cuarto" o "puntos antes del último cuarto"), NO puedes usar 'stats_player_games' porque tiene los totales del partido completo. DEBES sumar los puntos directamente desde las jugadas: SUM(pbp.action_value) FROM play_by_play pbp filtrando por quarter (ej. quarter < 4).

[Fórmulas de Eficiencia y Puntos]
- eFG% (Tiro Efectivo): \`(SUM(fg_made) + 0.5 * SUM(t3_made))::FLOAT / NULLIF(SUM(fg_att), 0)\`
- TS% (True Shooting): \`SUM(points)::FLOAT / NULLIF(2.0 * (SUM(t2_att + t3_att) + 0.44 * SUM(ft_att)), 0)\`
- Porcentajes estándar: \`ROUND((SUM(made)::NUMERIC / NULLIF(SUM(att), 0)) * 100, 1)\`
- Puntos Totales stats_team_games: \`SUM((t2_made * 2) + (t3_made * 3) + ft_made)\`
- Puntos Promedio stats_team_games: \`AVG((t2_made * 2) + (t3_made * 3) + ft_made)\`

[Gestión de Tipos y Formatos Específicos]
- Minutos de Juego ('minutes' en stats_player_games): Es de tipo TEXT y tiene el formato 'MM:SS' (Ej. '25:00'). Si el usuario pregunta "quién jugó 25 minutos", NO puedes usar \`minutes = 25\`. Usa patrones LIKE (Ej: \`minutes LIKE '25:%'\`) o comparaciones de string (\`minutes >= '25:00'\`).
- Booleanos ('made' en shots, 'starter' en stats_player_games): Son BOOLEAN. Usa \`made = TRUE\` o \`starter IS TRUE\`. No uses = 1.
- Nombres ('name'): Usa \`ILIKE '%Texto%'\` para hacer coincidencia parcial y evitar problemas de mayúsculas o apellidos.

[Filtros de Partidos Específicos]
- "Último partido": NUNCA uses solo status='PROCESSED'. Debes usar OBLIGATORIAMENTE una CTE para obtener el id del último partido jugado. 
  Ejemplo: WITH last_game AS (SELECT id FROM games WHERE (home_team_id = ${userTeamId} OR away_team_id = ${userTeamId}) AND status = 'PROCESSED' ORDER BY date DESC LIMIT 1)

[Gestión del Tiempo Global (play_by_play)]
- Si el usuario pregunta por un minuto global (Ej: "minuto 25"), calcula a qué cuarto pertenece asumiendo cuartos de 10 minutos (Ej: Minuto 25 = 3er cuarto). NO respondas que el minuto es inválido. Ve a play_by_play y filtra por \`quarter = 3\`. La columna 'minute' en play_by_play es TEXT, trátala con LIKE si buscas el minuto parcial.
- 
[Identidad de Jugadores y Play-by-Play]
- "Nuestro jugador" o "Mis jugadores": SIEMPRE añade el filtro "p.current_team_id = ${userTeamId}" al hacer JOIN con 'players'. Esto evita cruces erróneos con jugadores rivales que recibieron faltas.
- Para buscar faltas cometidas: action_type ILIKE '%foul%'.

[Evaluación de "Mejores" o "Líderes"]
- Cuando te pregunten por "el más anotador", "el más valorado" o "el mejor", NUNCA uses la función MAX() a menos que pregunten por "el récord en un partido".
- SIEMPRE usa promedios: AVG(points), AVG(valoracion), agrupando por jugador (GROUP BY) y ordenando descendente (ORDER BY AVG(...) DESC).

[Jugadores en pista]
- La tabla play_by_play no guarda alineaciones pasivas. Si preguntan "qué jugadores estaban en pista", busca qué jugadores registraron alguna acción o sustitución (action_type ILIKE '%sub%') cerca de ese momento.

### 5. GUÍA DE REDACCIÓN SQL
- Usa CTEs (cláusulas WITH) SIEMPRE que haya múltiples agregaciones o comparaciones complejas.
- NUNCA devuelvas solo IDs. Haz JOIN para devolver 'teams.name' y 'players.name'.
- Si calculas datos del próximo rival, el SELECT debe incluir el 'teams.name' del rival explícitamente para poder nombrarlo.
- Formateo de Fechas: Si seleccionas fechas de 'games.date', usa funciones de formato legibles como TO_CHAR(date, 'YYYY-MM-DD').
- Aplica SIEMPRE el filtro de seguridad base en la tabla principal: \`team_id IN (${allowedTeams})\`.

### 6. FORMATO DE RESPUESTA REQUERIDO (JSON STRICT)
Debes devolver el resultado usando ESTRICTAMENTE la siguiente estructura JSON (sin backticks de markdown alrededor):
{
  "thought": "1. Identifico intención. 2. Reviso seguridad y tipos de datos (TEXT vs INT). 3. Diseño JOIN y fórmulas. Evito productos cartesianos. 4. Construyo CTEs.",
  "sql": "Tu código SQL en crudo aquí, o null si está fuera del alcance.",
  "tactical_context": "Breve resumen para el entrenador indicando qué responde esta consulta."
}`
}

function getOpenAIClient() {
  const apiKey = process.env.GITHUB_TOKEN?.replace(/^['"]|['"]$/g, "").trim()

  if (!apiKey) {
    throw new Error(
      "GITHUB_TOKEN no está configurado. Define la variable en src/client/.env.local y reinicia `pnpm dev`.",
    )
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://models.inference.ai.azure.com",
  })
}

function safeJsonParse(raw: string): HoopsSQLResponse {
  try {
    const parsed = JSON.parse(raw) as Partial<HoopsSQLResponse>
    return {
      sql: typeof parsed.sql === "string" || parsed.sql === null ? parsed.sql : null,
      thought: typeof parsed.thought === "string" ? parsed.thought : "Sin razonamiento disponible",
      tactical_context:
        typeof parsed.tactical_context === "string"
          ? parsed.tactical_context
          : "Sin contexto táctico disponible",
    }
  } catch {
    return {
      sql: null,
      thought: "Error al procesar la respuesta del modelo",
      tactical_context: raw,
    }
  }
}

export async function generateSQL(
  question: string,
  userTeamId: number,
  opponentTeamId: number | null,
): Promise<HoopsSQLResponse> {
  const result = await generateHoopsQuery(question, userTeamId, opponentTeamId)
  if (result.sql) {
    console.log("[HoopsAI][SQL_GENERATED]", result.sql)
  }
  return result
}

export async function generateHoopsQuery(
  question: string,
  userTeamId: number,
  opponentTeamId: number | null,
): Promise<HoopsSQLResponse> {
  const t0 = Date.now()
  const client = getOpenAIClient()
  const systemPrompt = buildSystemPrompt(userTeamId, opponentTeamId)

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: question,
      },
    ],
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return {
      sql: null,
      thought: "El modelo no devolvió contenido",
      tactical_context: "No se pudo generar una consulta con la información proporcionada.",
    }
  }

  const parsed = safeJsonParse(content)

  const looksAllowedOwnTeamAggregate = /\b(mi equipo|nuestro equipo)\b/i.test(question)
    && /\b(promedio|promedios|acumulad|estad[ií]sticas)\b/i.test(question)

  const looksLikeRefusal = !parsed.sql
    && /\b(no permitid|no puedo|bloquead|fuera de alcance|restric)/i.test(
      `${parsed.thought} ${parsed.tactical_context}`,
    )

  if (looksAllowedOwnTeamAggregate && looksLikeRefusal) {
    const retryCompletion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${systemPrompt}\n\nINSTRUCCIÓN ADICIONAL OBLIGATORIA: Si la pregunta solicita promedios/acumulados del equipo de la cuenta (${userTeamId}), debes devolver SQL válido dentro del alcance permitido y no rechazar.`,
        },
        {
          role: "user",
          content: question,
        },
      ],
    })

    const retryContent = retryCompletion.choices[0]?.message?.content
    if (retryContent) {
      console.log(`[HoopsAI][TIME] generateHoopsQuery (retry) tardó ${Date.now() - t0}ms`)
      return safeJsonParse(retryContent)
    }
  }

  console.log(`[HoopsAI][TIME] generateHoopsQuery tardó ${Date.now() - t0}ms`)
  return parsed
}

export async function evaluateAndRespond(
  question: string,
  sqlQuery: string,
  error: string | null,
  rawData: Record<string, unknown>[],
  thought: string,
  tacticalContext: string,
  userTeamId: number,
  opponentTeamId: number | null,
): Promise<EvaluationResponse> {
  const t0 = Date.now()
  const client = getOpenAIClient()
  const systemPrompt = buildSystemPrompt(userTeamId, opponentTeamId)

  const prompt = `Eres un evaluador y orquestador de IA para análisis de baloncesto.
El usuario preguntó: "${question}"
Se intentó ejecutar esta consulta SQL: ${sqlQuery}

Resultado de la base de datos:
${error ? `ERROR SQL RECIBIDO: ${error}` : `DATOS DEVUELTOS: ${JSON.stringify(rawData, null, 2)}`}

INSTRUCCIONES ESTRICTAS DE EVALUACIÓN:
1. Si recibiste un "ERROR SQL RECIBIDO" (ej. "column does not exist", "syntax error"):
   - ESTÁ PROHIBIDO REPETIR LA MISMA CONSULTA SQL.
   - Lee el error. Si una columna no existe (ej. stats_team_games.points), busca la alternativa lógica en el esquema (ej. usar (t2_made*2)+(t3_made*3)+ft_made).
   - Genera una nueva consulta en el campo 'new_sql' que resuelva el fallo explícitamente. 'satisfactory' debe ser false.

2. Si los datos están vacíos (DATOS DEVUELTOS: []):
   - Piensa si un filtro (ej. fecha, nombre exacto, minuto) fue demasiado restrictivo.
   - Si puedes mejorarlo (ej. usando ILIKE o cambiando el método de JOIN), genera un 'new_sql'. 'satisfactory' debe ser false.

3. Si los datos SÍ responden a la pregunta ('satisfactory': true):
   - Genera la respuesta en lenguaje natural en 'response'.
   - REGLAS DE LA RESPUESTA: NO uses tablas Markdown crudas. Integra los datos en el texto fluidamente.
   - NOMBRA SIEMPRE a los equipos explícitamente (Ej. Di "El Real Madrid tiene un acierto de..." en lugar de "Nuestro rival tiene..."). Usa los nombres devueltos en la query.
   - Sé conciso y usa emojis (🏀, 📊, 🎯).

FORMATO DE RESPUESTA (JSON estricto):
{
  "satisfactory": boolean,
  "new_sql": "NUEVA CONSULTA CORREGIDA AQUI (diferente a la anterior)" | null,
  "response": "RESPUESTA EN LENGUAJE NATURAL AQUI" | null
}`

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    console.log(`[HoopsAI][TIME] evaluateAndRespond tardó ${Date.now() - t0}ms (sin contenido)`)
    return { satisfactory: true, new_sql: null, response: "Error al evaluar la respuesta." }
  }

  try {
    console.log(`[HoopsAI][TIME] evaluateAndRespond tardó ${Date.now() - t0}ms`)
    return JSON.parse(content) as EvaluationResponse
  } catch {
    console.log(`[HoopsAI][TIME] evaluateAndRespond tardó ${Date.now() - t0}ms (parse error)`)
    return { satisfactory: true, new_sql: null, response: "Error al procesar la evaluación." }
  }
}

export function validateSQL(sql: string): { valid: boolean; error?: string } {
  const cleanSql = sql.replace(/^```(sql)?/i, '').replace(/```$/i, '').trim()
  const upperSql = cleanSql.toUpperCase()

  if (!upperSql.startsWith("SELECT") && !upperSql.startsWith("WITH")) {
    return { valid: false, error: "Solo se permiten consultas SELECT o WITH." }
  }

  const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXECUTE)\b/i
  if (forbidden.test(upperSql)) {
    return {
      valid: false,
      error: "La consulta contiene operaciones prohibidas. Solo SELECT o WITH es permitido.",
    }
  }

  return { valid: true }
}