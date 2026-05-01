import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose/jwt/verify"

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/faq",
  "/pricing",
  "/forgot-password",
  "/reset-password",
  "/verify",
  "/google-callback",
  "/platform",
  "/vendors",
  "/event-tools",
  "/ready-to-deploy",
])

const PROTECTED_PREFIXES = [
  "/admin",
  "/dashboard",
  "/vendor",
  "/my-events",
  "/my-profile",
  "/event-details",
] as const

const KNOWN_ROLES = new Set(["admin", "organizer", "user", "vendor"])

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname)
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

function roleHome(role: string): string {
  switch (role) {
    case "admin":
      return "/admin"
    case "vendor":
      return "/vendor"
    case "user":
      return "/my-events"
    default:
      return "/dashboard"
  }
}

function isPathAllowedForRole(role: string, pathname: string): boolean {
  if (pathname.startsWith("/admin")) return role === "admin"
  if (pathname.startsWith("/dashboard")) return role === "organizer"
  if (pathname.startsWith("/event-details")) return role === "organizer"
  if (pathname.startsWith("/my-events") || pathname.startsWith("/my-profile")) {
    return role === "user"
  }
  if (pathname.startsWith("/vendor")) return role === "vendor"
  return false
}

function clearAuthCookies(res: NextResponse) {
  res.cookies.set("token", "", { path: "/", maxAge: 0 })
  res.cookies.set("role", "", { path: "/", maxAge: 0 })
}

/** Must match Flask `JWT_SECRET_KEY` (see eventify-backend/app/config.py). */
function getJwtSecret(): string | undefined {
  const fromEnv = process.env.JWT_SECRET_KEY?.trim()
  if (fromEnv) return fromEnv
  // Local dev: Flask defaults to this when JWT_SECRET_KEY is unset; without it here,
  // middleware rejects every protected route even after a successful login.
  if (process.env.NODE_ENV === "development") {
    return "jwt-secret-change-in-production"
  }
  return undefined
}

async function verifyToken(token: string): Promise<{ role: string } | null> {
  const secret = getJwtSecret()
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    })
    const role = typeof payload.role === "string" ? payload.role : null
    if (!role || !KNOWN_ROLES.has(role)) return null
    return { role }
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    const token = request.cookies.get("token")?.value?.replace(/^["']|["']$/g, "").trim()
    if (
      token &&
      (pathname === "/login" || pathname === "/signup")
    ) {
      const session = await verifyToken(token)
      if (session) {
        const url = request.nextUrl.clone()
        url.pathname = roleHome(session.role)
        url.search = ""
        return NextResponse.redirect(url)
      }
    }
    return NextResponse.next()
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  const raw = request.cookies.get("token")?.value
  const token = raw?.replace(/^["']|["']$/g, "").trim()
  if (!token) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  const session = await verifyToken(token)
  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    const res = NextResponse.redirect(url)
    clearAuthCookies(res)
    return res
  }

  const { role } = session

  if (pathname.startsWith("/event-details") && role === "user") {
    const url = request.nextUrl.clone()
    url.pathname = "/my-events/event-details"
    return NextResponse.redirect(url)
  }

  if (!isPathAllowedForRole(role, pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = roleHome(role)
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
