export default async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, message: "Método no permitido." }),
      { status: 405, headers }
    );
  }

  try {
    const { code } = await request.json();
    const cleanCode = String(code || "").trim().toUpperCase();

    if (!cleanCode) {
      return new Response(
        JSON.stringify({ success: false, message: "Ingresá tu código." }),
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

    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/open_mystery_box`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ p_code: cleanCode })
      }
    );

    if (!response.ok) {
      throw new Error("No se pudo procesar la apertura.");
    }

    const result = await response.json();

    if (!result || result.success !== true) {
      return new Response(
        JSON.stringify({
          success: false,
          message: result?.message || "Código inválido o ya utilizado."
        }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "No se pudo abrir la caja. Intentá nuevamente."
      }),
      { status: 500, headers }
    );
  }
};
