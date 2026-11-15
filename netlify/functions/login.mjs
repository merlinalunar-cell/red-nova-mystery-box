
export default async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Método no permitido."
      }),
      { status: 405, headers }
    );
  }

  try {
    const { username, password } = await request.json();

    const adminEmail = process.env.ADMIN_EMAIL;
    const supabaseUrl = process.env.SUPABASE_URL;
    const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!adminEmail || !supabaseUrl || !publicKey) {
      throw new Error("Falta configurar una variable.");
    }

    if (
      String(username || "").trim() !== "RedNovaAdmin" ||
      !password
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Usuario o contraseña incorrectos."
        }),
        { status: 401, headers }
      );
    }

    const response = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publicKey
        },
        body: JSON.stringify({
          email: adminEmail,
          password: password
        })
      }
    );

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Usuario o contraseña incorrectos."
        }),
        { status: 401, headers }
      );
    }

    const session = await response.json();

    if (!session.access_token) {
      throw new Error("No se recibió una sesión válida.");
    }

    headers["Set-Cookie"] =
      `rednova_session=${session.access_token}; ` +
      "HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600";

    return new Response(
      JSON.stringify({
        success: true,
        message: "Acceso autorizado."
      }),
      { status: 200, headers }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "No se pudo iniciar sesión."
      }),
      { status: 500, headers }
    );
  }
};
