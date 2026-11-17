
export default async () => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      throw new Error("Falta la configuración de Supabase.");
    }

    const response = await fetch(
      `${url}/rest/v1/featured_prizes?select=id,name,description,amount,image_url,sort_order&active=eq.true&order=sort_order.asc,created_at.desc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error("No se pudieron cargar los premios publicados.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        prizes: data
      }),
      {
        status: 200,
        headers
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message
      }),
      {
        status: 500,
        headers
      }
    );
  }
};
