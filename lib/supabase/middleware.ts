import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/** Renova a sessão e manda para o login quem tentar entrar no admin sem ela. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Ter sessão e ser da mesa são coisas diferentes. Como o registo do Supabase
  // é público, qualquer pessoa pode criar conta — mas só quem está na tabela
  // `admins` é da mesa. A porta da mesa só abre a esses; os outros nem entram,
  // em vez de verem o ecrã e esbarrarem num erro ao gravar.
  let isMesa = false;
  if (user) {
    const { data } = await supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    isMesa = data !== null;
  }

  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname === "/admin/entrar";

  if (isAdmin && !isLogin && !isMesa) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/entrar";
    url.search = "";
    // Sem sessão, volta para aqui depois de entrar. Com sessão mas fora da
    // mesa, diz-se porque é que a porta não abriu.
    if (user) url.searchParams.set("erro", "nao-mesa");
    else url.searchParams.set("seguir", pathname);
    return NextResponse.redirect(url);
  }

  if (isLogin && isMesa) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
