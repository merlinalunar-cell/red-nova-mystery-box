
export default async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  try {
    // 1. COMPROBAR SESIÓN DEL ADMINISTRADOR
    const cookie = request.headers.get("cookie") || "";

    const sessionCookie = cookie
      .split(";")
      .map(item => item.trim())
      .find(item => item.startsWith("rednova_session="));

    if (!sessionCookie) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Necesitás iniciar sesión."
        }),
        { status: 401, headers }
      );
    }

    const accessToken = sessionCookie.substring(
      "rednova_session=".length
    );

    const supabaseUrl = process.env.SUPABASE_URL;
    const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
    const secretKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY;

    const adminEmail = process.env.ADMIN_EMAIL;

    if (!supabaseUrl || !publicKey || !secretKey || !adminEmail) {
      throw new Error("Falta configurar una variable de entorno.");
    }

    const authResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: {
          apikey: publicKey,
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (!authResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "La sesión venció. Iniciá sesión nuevamente."
        }),
        { status: 401, headers }
      );
    }

    const user = await authResponse.json();

    if (
      !user.email ||
      user.email.toLowerCase() !== adminEmail.toLowerCase()
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "No tenés autorización."
        }),
        { status: 403, headers }
      );
    }

    // 2. CONEXIÓN PRIVADA CON SUPABASE
    const restUrl = `${supabaseUrl}/rest/v1`;

    async function database(path, options = {}) {
      const response = await fetch(`${restUrl}/${path}`, {
        ...options,
        headers: {
          apikey: secretKey,
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
          ...options.headers
        }
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(
          data?.message || "No se pudo completar la operación."
        );
      }

      return data;
    }

    // 3. CONSULTAR PREMIOS, CÓDIGOS Y APERTURAS
    if (request.method === "GET") {
      const [prizes, codes, openings] = await Promise.all([
        database("prizes?select=*&order=created_at.desc"),
        database("mystery_codes?select=*&order=used_at.desc"),
        database("openings?select=*&order=opened_at.desc")
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          prizes,
          codes,
          openings
        }),
        { status: 200, headers }
      );
    }

    // 4. OPERACIONES DE ADMINISTRACIÓN
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Método no permitido."
        }),
        { status: 405, headers }
      );
    }

    const body = await request.json();

    // CREAR PREMIO
    if (body.action === "create_prize") {
      if (!body.name || !String(body.name).trim()) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Ingresá el nombre del premio."
          }),
          { status: 400, headers }
        );
      }

      const prize = await database("prizes", {
        method: "POST",
        body: JSON.stringify({
          name: String(body.name).trim(),
          description: String(body.description || "").trim(),
          image_url: String(body.image_url || "").trim(),
          active: true
        })
      });

      return new Response(
        JSON.stringify({ success: true, prize }),
        { status: 200, headers }
      );
    }

    // EDITAR PREMIO
    if (body.action === "update_prize") {
      if (!body.id) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Falta el identificador del premio."
          }),
          { status: 400, headers }
        );
      }

      const changes = {};

      if (body.name !== undefined) {
        changes.name = String(body.name).trim();
      }

      if (body.description !== undefined) {
        changes.description = String(body.description).trim();
      }

      if (body.image_url !== undefined) {
        changes.image_url = String(body.image_url).trim();
      }

      if (body.active !== undefined) {
        changes.active = Boolean(body.active);
      }

      const prize = await database(
        `prizes?id=eq.${encodeURIComponent(body.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(changes)
        }
      );

      return new Response(
        JSON.stringify({ success: true, prize }),
        { status: 200, headers }
      );
    }

    // ELIMINAR PREMIO
    if (body.action === "delete_prize") {
      if (!body.id) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Falta el identificador del premio."
          }),
          { status: 400, headers }
        );
      }

      await database(
        `prizes?id=eq.${encodeURIComponent(body.id)}`,
        { method: "DELETE" }
      );

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers }
      );
    }

    // CREAR CÓDIGO
    if (body.action === "create_code") {
      const code = String(body.code || "").trim().toUpperCase();

      if (!code || !body.prize_id) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Ingresá un código y seleccioná un premio."
          }),
          { status: 400, headers }
        );
      }

      const createdCode = await database("mystery_codes", {
        method: "POST",
        body: JSON.stringify({
          code,
          prize_id: body.prize_id,
          status: "available"
        })
      });

      return new Response(
        JSON.stringify({
          success: true,
          code: createdCode
        }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        message: "Operación desconocida."
      }),
      { status: 400, headers }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || "Error interno de administración."
      }),
      { status: 500, headers }
    );
  }
};
          
