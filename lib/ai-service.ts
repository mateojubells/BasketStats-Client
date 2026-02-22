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

function buildSystemPrompt(userTeamId: number, opponentTeamId: number | null): string {
  const allowedTeams = opponentTeamId ? `${userTeamId}, ${opponentTeamId}` : `${userTeamId}`
  const rivalScope = opponentTeamId
    ? `Rival habilitado (siguiente partido): ${opponentTeamId}.`
    : "No hay rival próximo habilitado."
  const rivalRule = opponentTeamId
    ? `- Equipo rival habilitado (${opponentTeamId}): se permite toda su información (equipo, jugadores, tiros, play-by-play y estadísticas), solo por ser el siguiente rival`
    : "- Sin rival próximo: no se permite consultar información de otros equipos/jugadores"

  return `Eres HoopsIQ Analyst. Traduce preguntas en SQL PostgreSQL para Supabase.

PRIVACIDAD ESTRICTA:
- Equipo de la cuenta (user_team_id): ${userTeamId}.
- ${rivalScope}
- Nunca uses IDs fijos (ej. 86/77). Usa solo los IDs de esta llamada.
- Rechaza o limita cualquier consulta fuera de este alcance.

SOLO SELECT. Prohibido: INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE.

ESQUEMA EXACTO DE LA BASE DE DATOS:

TABLA: games
  Columnas: id (bigint, PK) | feb_game_id (text, unique) | league_id (bigint) | date (timestamp) | home_team_id (bigint) | away_team_id (bigint) | home_score (integer) | away_score (integer) | status (text) | url (text) | updated_at (timestamp) | jornada (integer)

TABLA: leagues
  Columnas: id (bigint, PK) | name (text) | base_url (text) | season_year (text) | group_name (text) | feb_group_id (text)

TABLA: teams
  Columnas: id (bigint, PK) | feb_id (text, unique) | name (text) | logo_url (text) | created_at (timestamp)

TABLA: players
  Columnas: id (bigint, unique) | name (text) | current_team_id (bigint) | feb_player_id (text, PK) | jersey_number (integer)

TABLA: stats_player_games
  Columnas: id (bigint, PK) | game_id (bigint) | player_id (bigint) | team_id (bigint) | minutes (text) | points (integer) | t2_made (integer) | t2_att (integer) | t3_made (integer) | t3_att (integer) | ft_made (integer) | ft_att (integer) | reb_off (integer) | reb_def (integer) | reb_tot (integer) | assists (integer) | steals (integer) | turnovers (integer) | blocks_for (integer) | blocks_against (integer) | fouls_comm (integer) | fouls_rec (integer) | valoracion (integer) | plus_minus (integer) | starter (boolean)

TABLA: stats_team_games
  Columnas: id (bigint, PK) | game_id (bigint) | team_id (bigint) | t2_pct (double) | t3_pct (double) | ft_pct (double) | fg_made (integer) | fg_att (integer) | fg_pct (double) | t2_made (integer) | t2_att (integer) | t3_made (integer) | t3_att (integer) | ft_made (integer) | ft_att (integer) | reb_off (integer) | reb_def (integer) | reb_tot (integer) | assists (integer) | steals (integer) | turnovers (integer) | blocks_for (integer) | blocks_against (integer) | fouls_comm (integer) | fouls_rec (integer)

TABLA: play_by_play
  Columnas: id (bigint, PK) | game_id (bigint) | quarter (integer) | minute (text) | team_id (bigint) | player_id (bigint) | action_type (text) | home_score_partial (integer) | away_score_partial (integer) | action_value (integer) | stat_count (integer) | free_throws_awarded (integer)

TABLA: shots
  Columnas: id (bigint, PK) | game_id (bigint) | player_id (bigint) | team_id (bigint) | x_coord (double) | y_coord (double) | made (boolean) | quarter (integer) | zone (text) | pbp_id (bigint)

TABLA: users
  Columnas: id (uuid, PK) | email (text, unique) | display_name (text) | created_at (timestamp) | team_id (bigint)

JOINS COMUNES:
- Individual: stats_player_games JOIN players ON stats_player_games.player_id = players.id JOIN games ON stats_player_games.game_id = games.id JOIN teams ON stats_player_games.team_id = teams.id
- Equipo: stats_team_games JOIN teams ON stats_team_games.team_id = teams.id JOIN games ON stats_team_games.game_id = games.id
- Play-by-play: play_by_play JOIN players ON play_by_play.player_id = players.id JOIN games ON play_by_play.game_id = games.id JOIN teams ON play_by_play.team_id = teams.id
- Tiros: shots JOIN players ON shots.player_id = players.id JOIN games ON shots.game_id = games.id JOIN teams ON shots.team_id = teams.id

FÓRMULAS:
- eFG%: (SUM(fg_made) + 0.5*SUM(t3_made)) / NULLIF(SUM(fg_att), 0)
- TS%: SUM(points) / NULLIF(2.0*(SUM(fg_att) + 0.44*SUM(ft_att)), 0)
- Plus/Minus On: stats_player_games.plus_minus
- Plus/Minus Off: margen - plus_minus

REGLAS SQL:
- Alcance base permitido: IDs de equipo en (${allowedTeams})
- Equipo de la cuenta (${userTeamId}): se permite toda su información
- Permitido explícitamente para equipo de la cuenta: promedios, acumulados, rankings, tendencias y splits (home/away, por periodo, por jugador, por partido)
- Partidos disputados: permite consultas de TODOS los partidos ya disputados por el equipo de la cuenta
  * Usa games.status = 'PROCESSED' cuando la pregunta sea sobre partidos ya disputados
  * Filtra (games.home_team_id = ${userTeamId} OR games.away_team_id = ${userTeamId})
- ${rivalRule}
- Si la pregunta es tipo "promedios de mi equipo" o "estadísticas acumuladas de mi equipo", SIEMPRE genera SQL válido (no rechazar)
- Para el rival habilitado (${opponentTeamId ?? "ninguno"}) también se permiten promedios/acumulados, porque está dentro del alcance permitido
- Si se consulta team_id/current_team_id/home_team_id/away_team_id, debe estar en (${allowedTeams})
- Prohibido consultar estadísticas acumuladas o individuales de equipos/jugadores fuera de (${allowedTeams})
- NULLIF para divisiones por cero
- ROUND(..., 1) para porcentajes
- JOIN nombres, no solo IDs
- LIMIT resultados largos

RESPONDE JSON (sin markdown):
{ "sql": "...", "thought": "...", "tactical_context": "..." }

Sin SQL: { "sql": null, "thought": "...", "tactical_context": "..." }`
}

function getOpenAIClient() {
  const apiKey = process.env.GITHUB_TOKEN?.replace(/^['\"]|['\"]$/g, "").trim()

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
  return generateHoopsQuery(question, userTeamId, opponentTeamId)
}

export async function generateHoopsQuery(
  question: string,
  userTeamId: number,
  opponentTeamId: number | null,
): Promise<HoopsSQLResponse> {
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
      return safeJsonParse(retryContent)
    }
  }

  return parsed
}

export async function humanizeResults(
  question: string,
  sqlQuery: string,
  rawData: Record<string, unknown>[],
  thought: string,
  tacticalContext: string,
): Promise<string> {
  const client = getOpenAIClient()

  const prompt = `Eres HoopsIQ Analyst, un analista táctico de baloncesto.

El entrenador preguntó: "${question}"

Se ejecutó esta consulta SQL: ${sqlQuery}

Razonamiento previo: ${thought}
Contexto táctico: ${tacticalContext}

Los datos devueltos fueron:
${JSON.stringify(rawData, null, 2)}

INSTRUCCIONES:
1. Interpreta los datos en lenguaje natural para un entrenador.
2. Destaca hallazgos tácticos relevantes.
3. Si hay datos tabulares (más de 2 filas con columnas numéricas), incluye una sección con los datos clave.
4. Sé conciso pero informativo. Usa emoji relevantes (🏀, 📊, 🎯, ⚡, 🔥, 🛡️).
5. Si los datos están vacíos, indica que no hay datos suficientes.
6. Responde en español.

FORMATO DE RESPUESTA:
- Respuesta directa en texto plano con formato Markdown.
- Si incluyes tabla, usa formato Markdown: | Col1 | Col2 | ... |
- NO respondas en JSON, responde directamente con el análisis.`

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  })

  return completion.choices[0]?.message?.content?.trim() || "No fue posible generar el análisis táctico."
}

export function validateSQL(sql: string): { valid: boolean; error?: string } {
  const trimmed = sql.trim().toUpperCase()

  if (!trimmed.startsWith("SELECT")) {
    return { valid: false, error: "Solo se permiten consultas SELECT." }
  }

  const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXECUTE)\b/i
  if (forbidden.test(sql)) {
    return {
      valid: false,
      error: "La consulta contiene operaciones prohibidas. Solo SELECT es permitido.",
    }
  }

  return { valid: true }
}
