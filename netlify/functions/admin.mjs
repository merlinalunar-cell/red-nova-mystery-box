
export default async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Método no permitido."
      }),
      { status: 405, headers }
    );
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !publicKey) {
      throw new Error("Falta configurar Supabase.");
    }

    const cookie = request.headers.get("cookie") || "";

    const sessionCookie = cookie
      .split(";")
      .map(item => item.trim())
      .find(item => item.startsWith("rednova_session="));

    if (!sessionCookie) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Sesión no encontrada."
        }),
        { status: 401, headers }
      );
    }

    const accessToken = sessionCookie.substring(
      "rednova_session=".length
    );

    const response = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          "apikey": publicKey,
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "La sesión no es válida o ha vencido."
        }),
        { status: 401, headers }
      );
    }

    const user = await response.json();

    if (
      !user ||
      !user.email ||
      user.email.toLowerCase() !==
        String(process.env.ADMIN_EMAIL || "").toLowerCase()
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No tenés autorización."
        }),
        { status: 403, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Administrador verificado."
      }),
      { status: 200, headers }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "No se pudo verificar la sesión."
      }),
      { status: 500, headers }
    );
  }
};
