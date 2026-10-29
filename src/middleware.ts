import { NextRequest, NextResponse } from "next/server";
import { redirectToAi } from "@/lib/safe-next";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const target = redirectToAi(pathname);

  if (!target) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = target;
  url.search = search;

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/:path*"],
};
