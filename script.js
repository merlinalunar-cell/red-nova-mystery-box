// ==========================================
// RED NOVA - SISTEMA PRINCIPAL
// ==========================================

const accessCode = document.getElementById("accessCode");
const validateBtn = document.getElementById("validateBtn");
const openBox = document.getElementById("openBox");
const codeMessage = document.getElementById("codeMessage");
const boxInstruction = document.getElementById("boxInstruction");
const result = document.getElementById("result");

let validatedCode = "";
let openingInProgress = false;

// WHATSAPP SEGÚN HORARIO DE ARGENTINA
const WHATSAPP_DIA = "5491151819514";
const WHATSAPP_NOCHE = "5492224576844";

function obtenerWhatsApp() {
  const horaArgentina = Number(
    new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      hourCycle: "h23"
    }).format(new Date())
  );

  return horaArgentina >= 6 && horaArgentina < 14
    ? WHATSAPP_DIA
    : WHATSAPP_NOCHE;
}

function conectarWhatsApp() {
  document.querySelectorAll(".whatsapp-cta").forEach((boton) => {
    const mensaje = boton.dataset.message ||
      "¡Hola RED NOVA! Quiero información.";

    boton.href =
      "https://wa.me/" + obtenerWhatsApp() +
      "?text=" + encodeURIComponent(mensaje);

    boton.target = "_blank";
    boton.rel = "noopener noreferrer";
  });

  const flotante = document.getElementById("floatingWhatsapp");

  if (flotante) {
    flotante.href =
      "https://wa.me/" + obtenerWhatsApp() +
      "?text=" + encodeURIComponent("¡Hola RED NOVA! Quiero información.");

    flotante.target = "_blank";
    flotante.rel = "noopener noreferrer";
  }
}

conectarWhatsApp();

// ==========================================
// PREMIOS PUBLICADOS EN LA PÁGINA
// ==========================================

function crearTarjetaPublicada(premio, indice) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "prize-card";

  const contenedorImagen = document.createElement("div");
  contenedorImagen.className = "prize-image";

  if (premio.image_url) {
    const imagen = document.createElement("img");
    imagen.src = premio.image_url;
    imagen.alt = "Premio " + premio.name;
    imagen.loading = "lazy";
    contenedorImagen.appendChild(imagen);
  }

  const numero = document.createElement("span");
  numero.className = "prize-number";
  numero.textContent = "PREMIO " + String(indice + 1).padStart(2, "0");
  contenedorImagen.appendChild(numero);

  const nombre = document.createElement("h3");
  nombre.textContent = premio.name || "Premio";

  const monto = document.createElement("p");
  monto.className = "prize-amount";

  if (premio.amount !== null && premio.amount !== undefined && premio.amount !== "") {
    monto.textContent = "$" + Number(premio.amount).toLocaleString("es-AR");
  } else {
    monto.textContent = "";
  }

  const boton = document.createElement("a");
  boton.href = "#";
  boton.className = "whatsapp-cta";
  boton.dataset.message =
    "¡Hola RED NOVA! Quiero ganar un premio como este: " +
    (premio.name || "premio") + ".";

  boton.textContent = "QUIERO GANAR UN PREMIO COMO ESTE";

  tarjeta.append(
    contenedorImagen,
    nombre,
    monto,
    boton
  );

  return tarjeta;
}

async function cargarPremiosPublicados() {
  const grilla = document.getElementById("featuredPrizeGrid");
  if (!grilla) return;

  try {
    const response = await fetch(
      "/.netlify/functions/featured-prizes",
      { cache: "no-store" }
    );

    if (!response.ok) return;

    const data = await response.json();

    if (!data.success || !Array.isArray(data.prizes)) return;

    // Si no hay premios cargados, conserva las tarjetas originales.
    if (data.prizes.length === 0) return;

    grilla.replaceChildren();

    data.prizes.forEach((premio, indice) => {
      grilla.appendChild(crearTarjetaPublicada(premio, indice));
    });

    conectarWhatsApp();

  } catch (error) {
    // Si el servicio todavía no está disponible,
    // se mantienen las tarjetas originales.
  }
}

cargarPremiosPublicados();

// ==========================================
// VALIDAR CÓDIGO
// ==========================================

validateBtn.addEventListener("click", async () => {
  const code = accessCode.value.trim().toUpperCase();

  if (!code) {
    codeMessage.textContent = "Ingresá tu código para continuar.";
    accessCode.focus();
    return;
  }

  validateBtn.disabled = true;
  openBox.disabled = true;
  codeMessage.textContent = "Verificando tu código...";
  result.classList.remove("show");
  validatedCode = "";

  try {
    const response = await fetch("/.netlify/functions/validate-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });

    const data = await response.json();

    if (!response.ok || !data.valid) {
      codeMessage.textContent =
        data.message || "Código inválido o ya utilizado.";
      boxInstruction.textContent = "Ingresá un código válido.";
      return;
    }

    validatedCode = code;
    codeMessage.textContent = "¡Código válido! Ya podés abrir tu caja.";
    boxInstruction.textContent = "¡Tu sorpresa está lista!";
    openBox.disabled = false;
    openBox.classList.add("enabled");

  } catch (error) {
    codeMessage.textContent =
      "No pudimos conectar con el sistema. Intentá nuevamente.";
  } finally {
    validateBtn.disabled = false;
  }
});

// SI CAMBIA EL CÓDIGO, HAY QUE VALIDARLO NUEVAMENTE
accessCode.addEventListener("input", () => {
  validatedCode = "";
  openBox.disabled = true;
  openBox.classList.remove("enabled");
  result.classList.remove("show");
  codeMessage.textContent = "Validá nuevamente tu código.";
  boxInstruction.textContent = "Primero ingresá y validá tu código.";
});

// ==========================================
// ABRIR MYSTERY BOX
// ==========================================

openBox.addEventListener("click", async () => {
  if (!validatedCode || openingInProgress) return;

  openingInProgress = true;
  openBox.disabled = true;
  boxInstruction.textContent = "¡Estamos abriendo tu Mystery Box!";

  openBox.classList.remove("opening");
  void openBox.offsetWidth;
  openBox.classList.add("opening");

  try {
    const response = await fetch("/.netlify/functions/open-box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: validatedCode })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      codeMessage.textContent =
        data.message || "No se pudo abrir la caja.";
      boxInstruction.textContent = "No se pudo completar la apertura.";
      openBox.disabled = false;
      return;
    }

    const prize = data.prize || {};
    const title = result.querySelector("h3");
    const description = result.querySelector("p");

    title.textContent = "¡FELICITACIONES!";

    let textoPremio = prize.name || "Premio sorpresa";

    if (prize.amount !== null && prize.amount !== undefined && prize.amount !== "") {
      textoPremio += " — $" +
        Number(prize.amount).toLocaleString("es-AR");
    }

    if (prize.description) {
      textoPremio += " — " + prize.description;
    }

description.textContent = textoPremio;

// BOTÓN PARA RECLAMAR EL PREMIO
const codigoReclamo = validatedCode;
const botonReclamar = document.createElement("a");

botonReclamar.className = "whatsapp-cta";
botonReclamar.textContent = "RECLAMAR MI PREMIO POR WHATSAPP";

const mensajeReclamo =
  "Hola RED NOVA, quiero reclamar mi premio." +
  "\nPremio: " + textoPremio +
  "\nCódigo: " + codigoReclamo;

botonReclamar.href =
  "https://wa.me/" + obtenerWhatsApp() +
  "?text=" + encodeURIComponent(mensajeReclamo);

botonReclamar.target = "_blank";
botonReclamar.rel = "noopener noreferrer";

result.appendChild(botonReclamar);

result.classList.add("show");
    
    
    boxInstruction.textContent = "¡Descubriste tu premio!";
    codeMessage.textContent = "Este código ya fue utilizado.";

    validatedCode = "";
    accessCode.disabled = true;

  } catch (error) {
    codeMessage.textContent =
      "Hubo un problema al abrir la caja. Contactá con atención.";
    boxInstruction.textContent = "No se pudo completar la apertura.";
    openBox.disabled = false;
  } finally {
    openingInProgress = false;
  }
});

// ==========================================
// PANEL PRIVADO
// ==========================================

const panelDialog = document.getElementById("panelDialog");
const panelBtn = document.getElementById("panelBtn");
const closePanel = document.getElementById("closePanel");

if (panelBtn && panelDialog) {
  panelBtn.addEventListener("click", () => {
    panelDialog.showModal();
  });
}

if (closePanel && panelDialog) {
  closePanel.addEventListener("click", () => {
    panelDialog.close();
  });
}

// ==========================================
// ELEMENTOS DEL ADMINISTRADOR
// ==========================================

const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const adminLoginSection = document.getElementById("adminLoginSection");
const adminDashboard = document.getElementById("adminDashboard");

const newPrizeForm = document.getElementById("newPrizeForm");
const newFeaturedPrizeForm = document.getElementById("newFeaturedPrizeForm");
const newCodeForm = document.getElementById("newCodeForm");

const prizeList = document.getElementById("prizeList");
const featuredPrizeList = document.getElementById("featuredPrizeList");
const codeList = document.getElementById("codeList");
const openingList = document.getElementById("openingList");

const prizeMessage = document.getElementById("prizeMessage");
const featuredPrizeMessage = document.getElementById("featuredPrizeMessage");
const codeAdminMessage = document.getElementById("codeAdminMessage");
const adminRefreshMessage = document.getElementById("adminRefreshMessage");

let adminData = {
  prizes: [],
  featured_prizes: [],
  codes: [],
  openings: []
};

// ==========================================
// CONEXIÓN CON EL PANEL
// ==========================================

async function manageRequest(method = "GET", body = null) {
  const options = {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {}
  };

  if (body) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const response = await fetch("/.netlify/functions/manage", options);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "No se pudo completar la operación.");
  }

  return data;
}

// ==========================================
// ELEMENTOS SEGUROS
// ==========================================

function crearTexto(contenedor, texto, etiqueta = "p") {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto == null ? "" : String(texto);
  contenedor.appendChild(elemento);
  return elemento;
}

function crearBoton(texto, accion, id) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.textContent = texto;
  boton.dataset.adminAction = accion;
  boton.dataset.itemId = id;
  return boton;
}

function formatearMonto(monto) {
  if (monto === null || monto === undefined || monto === "") {
    return "Sin monto";
  }

  return "$" + Number(monto).toLocaleString("es-AR");
}

// ==========================================
// CARGAR INFORMACIÓN DEL PANEL
// ==========================================

async function cargarPanel() {
  adminRefreshMessage.textContent = "Actualizando información...";

  try {
    adminData = await manageRequest("GET");

    if (!Array.isArray(adminData.prizes)) adminData.prizes = [];
    if (!Array.isArray(adminData.featured_prizes)) {
      adminData.featured_prizes = [];
    }
    if (!Array.isArray(adminData.codes)) adminData.codes = [];
    if (!Array.isArray(adminData.openings)) adminData.openings = [];

    dibujarPremios();
    dibujarPremiosPublicados();
    dibujarCodigos();
    dibujarAperturas();

    adminRefreshMessage.textContent =
      "Información actualizada correctamente.";

  } catch (error) {
    adminRefreshMessage.textContent = error.message;
  }
}

// ==========================================
// MOSTRAR PREMIOS ALEATORIOS
// ==========================================

function dibujarPremios() {
  prizeList.replaceChildren();

  if (!adminData.prizes.length) {
    crearTexto(prizeList, "Todavía no hay premios aleatorios cargados.");
    return;
  }

  adminData.prizes.forEach((premio) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "admin-prize-item";

    crearTexto(tarjeta, premio.name, "h4");
    crearTexto(tarjeta, "Monto: " + formatearMonto(premio.amount));
    crearTexto(tarjeta, premio.description || "Sin descripción.");

    if (premio.image_url) {
      const imagen = document.createElement("img");
      imagen.src = premio.image_url;
      imagen.alt = premio.name || "Imagen del premio";
      imagen.loading = "lazy";
      imagen.style.maxWidth = "150px";
      imagen.style.height = "auto";
      tarjeta.appendChild(imagen);
    }

    crearTexto(tarjeta, "Stock disponible: " + Number(premio.stock || 0));
    crearTexto(
      tarjeta,
      premio.active ? "Estado: Activo" : "Estado: Inactivo"
    );

    tarjeta.appendChild(crearBoton("EDITAR", "edit-prize", premio.id));

    tarjeta.appendChild(
      crearBoton(
        premio.active ? "DESACTIVAR" : "ACTIVAR",
        "toggle-prize",
        premio.id
      )
    );

    tarjeta.appendChild(crearBoton("ELIMINAR", "delete-prize", premio.id));

    prizeList.appendChild(tarjeta);
  });
}

// ==========================================
// MOSTRAR PREMIOS PUBLICADOS
// ==========================================

function dibujarPremiosPublicados() {
  featuredPrizeList.replaceChildren();

  if (!adminData.featured_prizes.length) {
    crearTexto(
      featuredPrizeList,
      "Todavía no hay premios publicados administrados desde el panel."
    );
    return;
  }

  adminData.featured_prizes.forEach((premio) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "admin-prize-item";

    crearTexto(tarjeta, premio.name, "h4");
    crearTexto(tarjeta, "Monto: " + formatearMonto(premio.amount));
    crearTexto(tarjeta, premio.description || "Sin descripción.");

    if (premio.image_url) {
      const imagen = document.createElement("img");
      imagen.src = premio.image_url;
      imagen.alt = premio.name || "Imagen del premio";
      imagen.loading = "lazy";
      imagen.style.maxWidth = "150px";
      imagen.style.height = "auto";
      tarjeta.appendChild(imagen);
    }

    crearTexto(
      tarjeta,
      "Estado: " + (premio.active ? "Publicado" : "Oculto")
    );

    crearTexto(tarjeta, "Orden: " + Number(premio.sort_order || 0));

    tarjeta.appendChild(
      crearBoton("EDITAR", "edit-featured", premio.id)
    );

    tarjeta.appendChild(
      crearBoton(
        premio.active ? "OCULTAR" : "PUBLICAR",
        "toggle-featured",
        premio.id
      )
    );

    tarjeta.appendChild(
      crearBoton("ELIMINAR", "delete-featured", premio.id)
    );

    featuredPrizeList.appendChild(tarjeta);
  });
}

// ==========================================
// MOSTRAR CÓDIGOS
// ==========================================

function dibujarCodigos() {
  codeList.replaceChildren();

  if (!adminData.codes.length) {
    crearTexto(codeList, "Todavía no hay códigos registrados.");
    return;
  }

  adminData.codes.forEach((codigo) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "admin-code-item";

    const premio = adminData.prizes.find(
      item => String(item.id) === String(codigo.prize_id)
    );

    crearTexto(tarjeta, "Código: " + codigo.code, "strong");

    crearTexto(
      tarjeta,
      "Premio: " + (premio?.name || (
        codigo.status === "used"
          ? "No disponible"
          : "Se sortea al abrir la caja"
      ))
    );

    crearTexto(tarjeta, "Estado: " + (codigo.status || "Sin estado"));

    codeList.appendChild(tarjeta);
  });
}

// ==========================================
// MOSTRAR HISTORIAL DE APERTURAS
// ==========================================

function dibujarAperturas() {
  openingList.replaceChildren();

  if (!adminData.openings.length) {
    crearTexto(openingList, "Todavía no hay aperturas registradas.");
    return;
  }

  adminData.openings.forEach((apertura) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "admin-opening-item";

    const codigo = adminData.codes.find(
      item => String(item.id) === String(apertura.code_id)
    );

    const premio = adminData.prizes.find(
      item => String(item.id) === String(apertura.prize_id)
    );

    crearTexto(
      tarjeta,
      "Código: " + (codigo?.code || apertura.code_id || "No disponible")
    );

    crearTexto(
      tarjeta,
      "Premio: " + (premio?.name || "Premio registrado")
    );

    if (apertura.opened_at) {
      const fecha = new Date(apertura.opened_at);

      crearTexto(
        tarjeta,
        "Fecha: " + (
          Number.isNaN(fecha.getTime())
            ? apertura.opened_at
            : fecha.toLocaleString("es-AR")
        )
      );
    }

    openingList.appendChild(tarjeta);
  });
}

// ==========================================
// INICIO DE SESIÓN DEL ADMINISTRADOR
// ==========================================

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;

    adminLoginBtn.disabled = true;
    adminLoginMessage.textContent = "Verificando acceso...";

    try {
      const response = await fetch("/.netlify/functions/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        adminLoginMessage.textContent =
          data.message || "Usuario o contraseña incorrectos.";
        return;
      }

      adminLoginMessage.textContent = "Comprobando sesión segura...";

      const sessionResponse = await fetch(
        "/.netlify/functions/admin",
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store"
        }
      );

      const sessionData = await sessionResponse.json();

      if (!sessionResponse.ok || !sessionData.success) {
        adminLoginMessage.textContent =
          sessionData.message || "No se pudo verificar la sesión.";
        return;
      }

      adminLoginMessage.textContent = "Conectando con la base de datos...";

      await cargarPanel();

      if (
        adminRefreshMessage.textContent !==
        "Información actualizada correctamente."
      ) {
        adminLoginMessage.textContent =
          "Administrador verificado, pero no se pudo cargar la información: " +
          adminRefreshMessage.textContent;
        return;
      }

      document.getElementById("adminPassword").value = "";
      adminLoginSection.hidden = true;
      adminDashboard.hidden = false;

    } catch (error) {
      adminLoginMessage.textContent =
        error.message || "No se pudo conectar. Intentá nuevamente.";
    } finally {
      adminLoginBtn.disabled = false;
    }
  });
}

// ==========================================
// AGREGAR PREMIO ALEATORIO
// ==========================================

if (newPrizeForm) {
  newPrizeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const saveButton = document.getElementById("savePrizeBtn");
    const stock = Number(document.getElementById("prizeStock").value);
    const amountText = document.getElementById("prizeAmount").value.trim();

    if (!Number.isSafeInteger(stock) || stock < 0) {
      prizeMessage.textContent =
        "Ingresá una cantidad entera igual o mayor a cero.";
      return;
    }

    const amount = amountText === "" ? null : Number(amountText);

    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      prizeMessage.textContent = "Ingresá un monto válido.";
      return;
    }

    saveButton.disabled = true;
    prizeMessage.textContent = "Guardando premio...";

    try {
      await manageRequest("POST", {
        action: "create_prize",
        name: document.getElementById("prizeName").value.trim(),
        amount,
        description: document.getElementById("prizeDescription").value.trim(),
        image_url: document.getElementById("prizeImage").value.trim(),
        stock
      });

      newPrizeForm.reset();
      prizeMessage.textContent = "Premio agregado correctamente.";
      await cargarPanel();
    } catch (error) {
      prizeMessage.textContent = error.message;
    } finally {
      saveButton.disabled = false;
    }
  });
}

// AGREGAR PREMIO PUBLICADO
if (newFeaturedPrizeForm) {
  newFeaturedPrizeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = document.getElementById("saveFeaturedPrizeBtn");
    button.disabled = true;
    featuredPrizeMessage.textContent = "Guardando premio...";

    try {
      await manageRequest("POST", {
        action: "create_featured_prize",
        name: document.getElementById("featuredName").value.trim(),
        amount: document.getElementById("featuredAmount").value,
        description: document.getElementById("featuredDescription").value.trim(),
        image_url: document.getElementById("featuredImage").value.trim(),
        sort_order: Number(document.getElementById("featuredOrder").value)
      });

      newFeaturedPrizeForm.reset();
      featuredPrizeMessage.textContent = "Premio publicado correctamente.";
      await cargarPanel();
      cargarPremiosPublicados();
    } catch (error) {
      featuredPrizeMessage.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

// CREAR CÓDIGO
if (newCodeForm) {
  newCodeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = document.getElementById("createCodeBtn");
    const code = document.getElementById("newCode").value.trim().toUpperCase();

    button.disabled = true;
    codeAdminMessage.textContent = "Creando código...";

    try {
      await manageRequest("POST", {
        action: "create_code",
        code
      });

      newCodeForm.reset();
      codeAdminMessage.textContent = "Código creado correctamente.";
      await cargarPanel();
    } catch (error) {
      codeAdminMessage.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
}

// ACCIONES DE LAS TARJETAS DEL PANEL
async function ejecutarAccionAdmin(event) {
  const boton = event.target.closest("button[data-admin-action]");
  if (!boton) return;

  const action = boton.dataset.adminAction;
  const id = boton.dataset.itemId;

  const premioAleatorio = adminData.prizes.find(p => String(p.id) === String(id));
  const premioPublicado = adminData.featured_prizes.find(p => String(p.id) === String(id));

  try {
    boton.disabled = true;

    if (action === "delete-prize" || action === "delete-featured") {
      if (!confirm("¿Seguro que querés eliminar este premio?")) return;

      await manageRequest("POST", {
        action: action === "delete-prize" ? "delete_prize" : "delete_featured_prize",
        id
      });
    }

    if (action === "toggle-prize" && premioAleatorio) {
      await manageRequest("POST", {
        action: "update_prize",
        id,
        active: !premioAleatorio.active
      });
    }

    if (action === "toggle-featured" && premioPublicado) {
      await manageRequest("POST", {
        action: "update_featured_prize",
        id,
        active: !premioPublicado.active
      });
    }

    if (action === "edit-prize" && premioAleatorio) {
      const name = prompt("Nombre del premio:", premioAleatorio.name);
      if (name === null) return;

      const amount = prompt("Monto (dejá vacío si no tiene):", premioAleatorio.amount ?? "");
      if (amount === null) return;

      const stock = prompt("Cantidad disponible:", premioAleatorio.stock);
      if (stock === null) return;

      const description = prompt("Descripción:", premioAleatorio.description || "");
      if (description === null) return;

      const image_url = prompt("Enlace de imagen:", premioAleatorio.image_url || "");
      if (image_url === null) return;

      await manageRequest("POST", {
        action: "update_prize",
        id,
        name,
        amount,
        stock,
        description,
        image_url
      });
    }

    if (action === "edit-featured" && premioPublicado) {
      const name = prompt("Nombre del premio:", premioPublicado.name);
      if (name === null) return;

      const amount = prompt("Monto:", premioPublicado.amount ?? "");
      if (amount === null) return;

      const description = prompt("Descripción:", premioPublicado.description || "");
      if (description === null) return;

      const image_url = prompt("Enlace de imagen:", premioPublicado.image_url || "");
      if (image_url === null) return;

      const sort_order = prompt("Orden:", premioPublicado.sort_order ?? 0);
      if (sort_order === null) return;

      await manageRequest("POST", {
        action: "update_featured_prize",
        id,
        name,
        amount,
        description,
        image_url,
        sort_order
      });

      cargarPremiosPublicados();
    }

    await cargarPanel();
  } catch (error) {
    alert(error.message);
  } finally {
    boton.disabled = false;
  }
}

[prizeList, featuredPrizeList].forEach((lista) => {
  lista.addEventListener("click", ejecutarAccionAdmin);
});

// ACTUALIZAR PANEL
const refreshAdminBtn = document.getElementById("refreshAdminBtn");

if (refreshAdminBtn) {
  refreshAdminBtn.addEventListener("click", cargarPanel);
        }
        
