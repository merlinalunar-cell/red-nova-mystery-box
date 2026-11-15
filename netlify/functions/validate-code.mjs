export default async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ valid: false, message: "Método no permitido." }),
      { status: 405, headers }
    );
  }

  try {
    const { code } = await request.json();
    const cleanCode = String(code || "").trim().toUpperCase();

    if (!cleanCode) {
      return new Response(
        JSON.stringify({ valid: false, message: "Ingresá tu código." }),
        { status: 400, headers }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Falta configurar la conexión segura.");
    }

    const url = new URL(
      `${supabaseUrl}/rest/v1/mystery_codes`
    );

    url.searchParams.set("select", "id,code,status");
    url.searchParams.set("code", `eq.${cleanCode}`);
    url.searchParams.set("status", "eq.available");
    url.searchParams.set("limit", "1");

    const response = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    });

    if (!response.ok) {
      throw new Error("No se pudo consultar la base de datos.");
    }

    const codes = await response.json();

    if (!codes.length) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: "Código inválido o ya utilizado."
        }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        message: "¡Código válido! Ya podés continuar."
      }),
      { status: 200, headers }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        valid: false,
        message: "No se pudo validar el código. Intentá nuevamente."
      }),
      { status: 500, headers }
    );
  }
};
