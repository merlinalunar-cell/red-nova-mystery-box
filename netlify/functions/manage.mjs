export default async (request) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  try {
    // VERIFICAR SESIÓN DEL ADMINISTRADOR
    const cookie = request.headers.get("cookie") || "";
    const sessionCookie = cookie
      .split(";")
      .map(item => item.trim())
      .find(item => item.startsWith("rednova_session="));

    if (!sessionCookie) {
      return new Response(JSON.stringify({
        success: false,
        message: "Necesitás iniciar sesión."
      }), { status: 401, headers });
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
      return new Response(JSON.stringify({
        success: false,
        message: "La sesión venció. Iniciá sesión nuevamente."
      }), { status: 401, headers });
    }

    const user = await authResponse.json();

    if (
      !user.email ||
      user.email.toLowerCase() !== adminEmail.toLowerCase()
    ) {
      return new Response(JSON.stringify({
        success: false,
        message: "No tenés autorización."
      }), { status: 403, headers });
    }

    // CONEXIÓN PRIVADA CON SUPABASE
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

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : null;

      if (!response.ok) {
        throw new Error(
          data?.message || data?.details ||
          "No se pudo completar la operación."
        );
      }

      return data;
    }

    const amountValue = (value) => {
      if (value === undefined || value === null || value === "") {
        return null;
      }

      const amount = Number(value);

      if (!Number.isFinite(amount) || amount < 0) {
        throw new Error("Ingresá un monto válido.");
      }

      return amount;
    };

    // CONSULTAR TODA LA INFORMACIÓN
    if (request.method === "GET") {
      const [
        prizes,
        featured_prizes,
        codes,
        openings
      ] = await Promise.all([
        database("prizes?select=*&order=created_at.desc"),
        database("featured_prizes?select=*&order=sort_order.asc,created_at.desc"),
        database("mystery_codes?select=*&order=used_at.desc"),
        database("openings?select=*&order=opened_at.desc")
      ]);

      return new Response(JSON.stringify({
        success: true,
        prizes,
        featured_prizes,
        codes,
        openings
      }), { status: 200, headers });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({
        success: false,
        message: "Método no permitido."
      }), { status: 405, headers });
    }

    const body = await request.json();

    // CREAR PREMIO ALEATORIO
    if (body.action === "create_prize") {
      const name = String(body.name || "").trim();
      const stock = Number(body.stock);

      if (!name) {
        throw new Error("Ingresá el nombre del premio.");
      }

      if (
        body.stock === undefined ||
        !Number.isSafeInteger(stock) ||
        stock < 0
      ) {
        throw new Error("Ingresá una cantidad válida.");
      }

      const prize = await database("prizes", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: String(body.description || "").trim(),
          image_url: String(body.image_url || "").trim(),
          amount: amountValue(body.amount),
          stock,
          active: true
        })
      });

      return new Response(JSON.stringify({
        success: true,
        prize
      }), { status: 200, headers });
    }

    // EDITAR PREMIO ALEATORIO
    if (body.action === "update_prize") {
      if (!body.id) {
        throw new Error("Falta el identificador del premio.");
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

      if (body.amount !== undefined) {
        changes.amount = amountValue(body.amount);
      }

      if (body.stock !== undefined) {
        const stock = Number(body.stock);

        if (!Number.isSafeInteger(stock) || stock < 0) {
          throw new Error("La cantidad debe ser un entero igual o mayor a cero.");
        }

        changes.stock = stock;
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

      return new Response(JSON.stringify({
        success: true,
        prize
      }), { status: 200, headers });
    }

    // ELIMINAR PREMIO ALEATORIO
    if (body.action === "delete_prize") {
      if (!body.id) {
        throw new Error("Falta el identificador del premio.");
      }

      await database(
        `prizes?id=eq.${encodeURIComponent(body.id)}`,
        { method: "DELETE" }
      );

      return new Response(JSON.stringify({
        success: true
      }), { status: 200, headers });
    }

    // CREAR PREMIO PUBLICADO EN LA PÁGINA
    if (body.action === "create_featured_prize") {
      const name = String(body.name || "").trim();

      if (!name) {
        throw new Error("Ingresá el nombre del premio publicado.");
      }

      const featured = await database("featured_prizes", {
        method: "POST",
        body: JSON.stringify({
          name,
          description: String(body.description || "").trim(),
          amount: amountValue(body.amount),
          image_url: String(body.image_url || "").trim(),
          active: body.active === undefined
            ? true
            : Boolean(body.active),
          sort_order: Number.isSafeInteger(Number(body.sort_order))
            ? Number(body.sort_order)
            : 0
        })
      });

      return new Response(JSON.stringify({
        success: true,
        featured
      }), { status: 200, headers });
    }

    // EDITAR PREMIO PUBLICADO
    if (body.action === "update_featured_prize") {
      if (!body.id) {
        throw new Error("Falta el identificador del premio publicado.");
      }

      const changes = {};

      if (body.name !== undefined) {
        changes.name = String(body.name).trim();
      }

      if (body.description !== undefined) {
        changes.description = String(body.description).trim();
      }

      if (body.amount !== undefined) {
        changes.amount = amountValue(body.amount);
      }

      if (body.image_url !== undefined) {
        changes.image_url = String(body.image_url).trim();
      }

      if (body.active !== undefined) {
        changes.active = Boolean(body.active);
      }

      if (body.sort_order !== undefined) {
        const order = Number(body.sort_order);

        if (!Number.isSafeInteger(order)) {
          throw new Error("El orden debe ser un número entero.");
        }

        changes.sort_order = order;
      }

      const featured = await database(
        `featured_prizes?id=eq.${encodeURIComponent(body.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify(changes)
        }
      );

      return new Response(JSON.stringify({
        success: true,
        featured
      }), { status: 200, headers });
    }

    // ELIMINAR PREMIO PUBLICADO
    if (body.action === "delete_featured_prize") {
      if (!body.id) {
        throw new Error("Falta el identificador del premio publicado.");
      }

      await database(
        `featured_prizes?id=eq.${encodeURIComponent(body.id)}`,
        { method: "DELETE" }
      );

      return new Response(JSON.stringify({
        success: true
      }), { status: 200, headers });
    }

    // CREAR CÓDIGO SIN PREMIO ASIGNADO
    if (body.action === "create_code") {
      const code = String(body.code || "").trim().toUpperCase();

      if (!code) {
        throw new Error("Ingresá un código.");
      }

      const createdCode = await database("mystery_codes", {
        method: "POST",
        body: JSON.stringify({
          code,
          status: "available"
        })
      });

      return new Response(JSON.stringify({
        success: true,
        code: createdCode
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({
      success: false,
      message: "Operación desconocida."
    }), { status: 400, headers });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message ||
        "Error interno de administración."
    }), { status: 500, headers });
  }
};
        
