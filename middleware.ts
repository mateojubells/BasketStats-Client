import { NextResponse, NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/chat" && request.method === "POST") {
    console.log(
      `[HoopsAI][MIDDLEWARE] ⏱️ POST /api/chat recibido en ${new Date().toISOString()}`,
    )
  }
  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
