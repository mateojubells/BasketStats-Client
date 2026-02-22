/* ─────────────────────────────────────────────────────────────
   HoopsAI Chat — API Route (POST /api/chat)
  Receives a user question, generates SQL via GitHub Models,
   executes it against Supabase, and returns humanized results.
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { generateSQL, evaluateAndRespond, validateSQL, saveChatLog } from "@/lib/ai-service"

function normalizeSQLForRPC(sql: string): string {
  return sql
    .replace(/^```(sql)?/i, '') // Limpiar markdown inicial
    .replace(/```$/i, '')       // Limpiar markdown final
    .trim()
    .replace(/[;\s]+$/g, "")
}

function validateTeamScopeSQL(
  sql: string,
  userTeamId: number,
  opponentTeamId: number | null,
): { valid: boolean; error?: string } {
  const allowedIds = new Set<number>(
    opponentTeamId ? [userTeamId, opponentTeamId] : [userTeamId],
  )

  const sqlNoStrings = sql.replace(/'(?:''|[^'])*'/g, "''")
  const teamFieldPattern = /\b(team_id|current_team_id|home_team_id|away_team_id)\b\s*(=|IN)\s*(\([^)]*\)|\d+)/gi

  let match: RegExpExecArray | null
  while ((match = teamFieldPattern.exec(sqlNoStrings)) !== null) {
    const rawValue = match[3]
    const ids = Array.from(rawValue.matchAll(/\d+/g)).map((m) => Number(m[0]))

    for (const id of ids) {
      if (!allowedIds.has(id)) {
        return {
          valid: false,
          error: `Acceso fuera de alcance detectado para team_id ${id}. Solo se permite ${Array.from(allowedIds).join(", ")}.`,
        }
      }
    }
  }

  return { valid: true }
}

// Server-side Supabase client using service role for RPC calls
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getServerSupabase(accessToken: string): any {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    },
  )
}

// ── Get next game to determine opponent ──────────────────────

async function getNextOpponentId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  teamId: number,
): Promise<number | null> {
  const today = new Date().toISOString()
  const { data } = await supabase
    .from("games")
    .select("home_team_id, away_team_id")
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .eq("status", "SCHEDULED")
    .gte("date", today)
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  const row = data as { home_team_id: number; away_team_id: number }
  return row.home_team_id === teamId ? row.away_team_id : row.home_team_id
}

// ── Main handler ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  console.log("[HoopsAI][TIME] ⏱️ POST /api/chat recibido en el servidor")
  
  try {
    console.log("[HoopsAI][TIME] Extrayendo headers...")
    // 1. Extract and validate auth
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No autorizado. Inicia sesión para usar HoopsAI." },
        { status: 401 },
      )
    }
    const accessToken = authHeader.slice(7)

    // 2. Parse request body
    console.log("[HoopsAI][TIME] Parseando body JSON...")
    const body = await req.json()
    const { question } = body as { question: string }

    console.log("[HoopsAI][TIME] Inicio de solicitud")

    if (!question?.trim()) {
      return NextResponse.json(
        { error: "La pregunta no puede estar vacía." },
        { status: 400 },
      )
    }

    // 3. Initialize Supabase with user's token
    const supabase = getServerSupabase(accessToken)

    // 4. Get user profile to determine team_id
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Sesión inválida. Vuelve a iniciar sesión." },
        { status: 401 },
      )
    }

    const { data: profile } = await supabase
      .from("users")
      .select("team_id")
      .eq("id", user.id)
      .single()

    if (!profile?.team_id) {
      return NextResponse.json(
        { error: "No tienes un equipo asignado. Configura tu perfil primero." },
        { status: 400 },
      )
    }

    const userTeamId = profile.team_id

    // 5. Get opponent from next scheduled game
    const opponentTeamId = await getNextOpponentId(supabase, userTeamId)

    // 6. Call AI service to generate SQL
    let t1 = Date.now()
    let aiResponse = await generateSQL(question, userTeamId, opponentTeamId)
    console.log(`[HoopsAI][TIME] generateSQL tardó ${Date.now() - t1}ms`)

    interface IterationLog {
      iteration: number
      thought: string
      sql: string | null
      result?: string
    }

    let iterations = 0
    const maxIterations = 3
    let finalHumanAnswer = ""
    let finalRows: Record<string, unknown>[] = []
    let finalSql = ""
    let finalThought = ""
    let finalTacticalContext = ""
    const iterationHistories: IterationLog[] = []

    while (iterations < maxIterations) {
      iterations++

      // Log iteration start
      iterationHistories.push({
        iteration: iterations,
        thought: aiResponse.thought,
        sql: aiResponse.sql,
      })

      // 7. If no SQL needed (conversational response)
      if (!aiResponse.sql) {
        return NextResponse.json({
          type: "conversational",
          answer: aiResponse.tactical_context,
          thought: aiResponse.thought,
          data: null,
          iterations: iterationHistories,
        })
      }

      const normalizedSql = normalizeSQLForRPC(aiResponse.sql)
      finalSql = normalizedSql
      finalThought = aiResponse.thought
      finalTacticalContext = aiResponse.tactical_context

      console.log("[HoopsAI][SQL_NORMALIZED]", normalizedSql)

      // 8. Validate SQL safety
      const validation = validateSQL(normalizedSql)
      if (!validation.valid) {
        return NextResponse.json({
          type: "error",
          answer: `🛡️ Consulta bloqueada: ${validation.error}`,
          thought: aiResponse.thought,
          data: null,
          iterations: iterationHistories,
        })
      }

      const scopeValidation = validateTeamScopeSQL(
        normalizedSql,
        userTeamId,
        opponentTeamId,
      )
      if (!scopeValidation.valid) {
        console.warn("[HoopsAI][SECURITY][SQL_SCOPE_BLOCKED]", {
          userId: user.id,
          userTeamId,
          opponentTeamId,
          reason: scopeValidation.error,
          sql: normalizedSql,
        })

        return NextResponse.json({
          type: "error",
          answer: `🛡️ Consulta bloqueada: ${scopeValidation.error}`,
          thought: aiResponse.thought,
          data: null,
          iterations: iterationHistories,
        })
      }

      // 9. Execute SQL via RPC
      console.log("[HoopsAI][EXECUTING_SQL]", normalizedSql)
      let t2 = Date.now()
      const { data: queryResult, error: rpcError } = await supabase.rpc(
        "execute_coach_query",
        { sql_query: normalizedSql },
      )
      console.log(`[HoopsAI][TIME] RPC execution tardó ${Date.now() - t2}ms`)
      if (rpcError) {
        console.error("[HoopsAI][SQL_ERROR]", { sql: normalizedSql, error: rpcError.message })
      } else {
        console.log("[HoopsAI][SQL_SUCCESS]", `Filas retornadas: ${Array.isArray(queryResult) ? queryResult.length : queryResult ? 1 : 0}`)
      }

      // 10. Parse results
      const rows: Record<string, unknown>[] = Array.isArray(queryResult)
        ? queryResult
        : queryResult
          ? [queryResult]
          : []
      finalRows = rows

      // 11. Evaluate the results with a second AI call
      try {
        let t3 = Date.now()
        const evaluation = await evaluateAndRespond(
          question,
          normalizedSql,
          rpcError ? rpcError.message : null,
          rows,
          aiResponse.thought,
          aiResponse.tactical_context,
          userTeamId,
          opponentTeamId
        )
        console.log(`[HoopsAI][TIME] evaluateAndRespond tardó ${Date.now() - t3}ms`)

        if (evaluation.satisfactory) {
          finalHumanAnswer = evaluation.response || "No se pudo generar una respuesta."
          break
        } else {
          if (iterations >= maxIterations) {
            finalHumanAnswer = evaluation.response || "No se pudo encontrar la información después de varios intentos."
            break
          }
          // Retry with new SQL
          if (evaluation.new_sql) {
            console.log("[HoopsAI][RETRY_SQL]", evaluation.new_sql)
            aiResponse = {
              sql: evaluation.new_sql,
              thought: "Reintentando con nueva consulta basada en la evaluación.",
              tactical_context: aiResponse.tactical_context
            }
          } else {
            finalHumanAnswer = evaluation.response || "No se pudo encontrar la información."
            break
          }
        }
      } catch (evalError) {
        console.error("Evaluation error:", evalError)
        // Fallback: return raw data with thought context
        finalHumanAnswer = rows.length > 0
          ? `📊 **Resultados encontrados** (${rows.length} filas)\n\n${aiResponse.tactical_context}`
          : `No se encontraron datos para tu consulta. ${aiResponse.tactical_context}`
        break
      }
    }

    // 12. Save chat log (fire-and-forget for non-blocking)
    saveChatLog(
      supabase,
      user.id,
      question,
      finalThought,
      finalSql,
      finalHumanAnswer,
      iterations,
    ).catch(err => console.error("Error saving chat log:", err))

    console.log(`[HoopsAI][TIME] Tiempo total de solicitud: ${Date.now() - startTime}ms`)

    // 13. Return complete response
    return NextResponse.json({
      type: "data",
      answer: finalHumanAnswer,
      thought: finalThought,
      tactical_context: finalTacticalContext,
      sql: finalSql,
      data: finalRows,
      iterations: iterationHistories,
    })
  } catch (error) {
    console.error("[HoopsAI][ERROR] Error en POST /api/chat:", error)
    console.error("[HoopsAI][ERROR] Stack:", error instanceof Error ? error.stack : "N/A")
    const message =
      error instanceof Error ? error.message : "Error interno del servidor"
    return NextResponse.json(
      {
        type: "error",
        answer: `⚠️ Error inesperado: ${message}`,
        data: null,
      },
      { status: 500 },
    )
  }
}
