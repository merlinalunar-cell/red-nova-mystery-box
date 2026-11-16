
const accessCode = document.getElementById("accessCode");
const validateBtn = document.getElementById("validateBtn");
const openBox = document.getElementById("openBox");
const codeMessage = document.getElementById("codeMessage");
const boxInstruction = document.getElementById("boxInstruction");
const result = document.getElementById("result");

let validatedCode = "";
let openingInProgress = false;

// WHATSAPP AUTOMÁTICO SEGÚN HORARIO DE ARGENTINA
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

// VALIDAR CÓDIGO
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

// ABRIR MYSTERY BOX
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
      return;
    }

    const prize = data.prize || {};
    const title = result.querySelector("h3");
    const description = result.querySelector("p");

    title.textContent = "¡FELICITACIONES!";
    description.textContent =
      prize.name +
      (prize.description ? " — " + prize.description : "");

    result.classList.add("show");
    boxInstruction.textContent = "¡Descubriste tu premio!";
    codeMessage.textContent = "Este código ya fue utilizado.";

    validatedCode = "";
    accessCode.disabled = true;

  } catch (error) {
    codeMessage.textContent =
      "Hubo un problema al abrir la caja. Contactá con atención.";
    boxInstruction.textContent = "No se pudo completar la apertura.";
  } finally {
    openingInProgress = false;
  }
});

// PANEL PRIVADO
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

// ELEMENTOS DEL ADMINISTRADOR
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const adminLoginSection = document.getElementById("adminLoginSection");
const adminDashboard = document.getElementById("adminDashboard");

const newPrizeForm = document.getElementById("newPrizeForm");
const newCodeForm = document.getElementById("newCodeForm");

const prizeList = document.getElementById("prizeList");
const codeList = document.getElementById("codeList");
const openingList = document.getElementById("openingList");
const codePrize = document.getElementById("codePrize");

const prizeMessage = document.getElementById("prizeMessage");
const codeAdminMessage = document.getElementById("codeAdminMessage");
const adminRefreshMessage = document.getElementById("adminRefreshMessage");

let adminData = {
  prizes: [],
  codes: [],
  openings: []
};

// FUNCIONES DE CONEXIÓN CON EL PANEL
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

  const response = await fetch(
    "/.netlify/functions/manage",
    options
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "No se pudo completar la operación.");
  }

  return data;
}

// MOSTRAR TEXTO DE FORMA SEGURA
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

// CARGAR INFORMACIÓN DEL PANEL
async function cargarPanel() {
  adminRefreshMessage.textContent = "Actualizando información...";

  try {
    adminData = await manageRequest("GET");
    dibujarPremios();
    dibujarCodigos();
    dibujarAperturas();

    adminRefreshMessage.textContent = "Información actualizada correctamente.";

  } catch (error) {
    adminRefreshMessage.textContent = error.message;
  }
}

// MOSTRAR PREMIOS
function dibujarPremios() {
  prizeList.replaceChildren();
  codePrize.replaceChildren();

  const opcionInicial = document.createElement("option");
  opcionInicial.value = "";
  opcionInicial.textContent = "Seleccioná un premio";
  codePrize.appendChild(opcionInicial);

  if (!adminData.prizes.length) {
    crearTexto(prizeList, "Todavía no hay premios cargados.");
  }

  adminData.prizes.forEach((premio) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "admin-prize-item";

    crearTexto(tarjeta, premio.name, "h4");
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
      premio.active ? "Estado: Activo" : "Estado: Inactivo"
    );

    tarjeta.appendChild(
      crearBoton("EDITAR", "edit-prize", premio.id)
    );

    tarjeta.appendChild(
      crearBoton("ELIMINAR", "delete-prize", premio.id)
    );

    prizeList.appendChild(tarjeta);

    if (premio.active) {
      const opcion = document.createElement("option");
      opcion.value = premio.id;
      opcion.textContent = premio.name;
      codePrize.appendChild(opcion);
    }
  });
}

// MOSTRAR CÓDIGOS
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
    crearTexto(tarjeta, "Premio: " + (premio?.name || "No disponible"));
    crearTexto(tarjeta, "Estado: " + (codigo.status || "Sin estado"));

    codeList.appendChild(tarjeta);
  });
}

// MOSTRAR APERTURAS
function dibujarAperturas() {
  openingList.replaceChildren();

  if (!adminData.openings.length) {
    crearTexto(openingList, "Todavía no hay aperturas registradas.");
    return;
  }

  adminData.openings.forEach((apertura) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "admin-opening-item";

    crearTexto(tarjeta, "Código ID: " + (apertura.code_id || "No disponible"));
    crearTexto(tarjeta, "Premio ID: " + (apertura.prize_id || "No disponible"));

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

// INICIO DE SESIÓN DEL ADMINISTRADOR
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
        headers: {
          "Content-Type": "application/json"
        },
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

      if (adminRefreshMessage.textContent !== "Información actualizada correctamente.") {
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

// AGREGAR PREMIO
if (newPrizeForm) {
  newPrizeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const saveButton = document.getElementById("savePrizeBtn");
    saveButton.disabled = true;
    prizeMessage.textContent = "Guardando premio...";

    try {
      await manageRequest("POST", {
        action: "create_prize",
        name: document.getElementById("prizeName").value,
        description: document.getElementById("prizeDescription").value,
        image_url: document.getElementById("prizeImage").value
      });

      newPrizeForm.reset();
      prizeMessage.textContent = "¡Premio agregado correctamente!";
      await cargarPanel();

    } catch (error) {
      prizeMessage.textContent = error.message;
    } finally {
      saveButton.disabled = false;
    }
  });
}

// CREAR CÓDIGO
if (newCodeForm) {
  newCodeForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const createButton = document.getElementById("createCodeBtn");
    createButton.disabled = true;
    codeAdminMessage.textContent = "Creando código...";

    try {
      await manageRequest("POST", {
        action: "create_code",
        code: document.getElementById("newCode").value,
        prize_id: codePrize.value
      });

      newCodeForm.reset();
      codeAdminMessage.textContent = "¡Código creado correctamente!";
      await cargarPanel();

    } catch (error) {
      codeAdminMessage.textContent = error.message;
    } finally {
      createButton.disabled = false;
    }
  });
}

// EDITAR O ELIMINAR PREMIOS
if (prizeList) {
  prizeList.addEventListener("click", async (event) => {
    const boton = event.target.closest("button[data-admin-action]");
    if (!boton) return;

    const id = boton.dataset.itemId;
    const accion = boton.dataset.adminAction;
    const premio = adminData.prizes.find(
      item => String(item.id) === String(id)
    );

    if (!premio) return;

    boton.disabled = true;

    try {
      if (accion === "edit-prize") {
        const name = prompt("Nombre del premio:", premio.name || "");
        if (name === null) return;

        const description = prompt(
          "Descripción del premio:",
          premio.description || ""
        );
        if (description === null) return;

        const image_url = prompt(
          "Enlace de la imagen:",
          premio.image_url || ""
        );
        if (image_url === null) return;

        await manageRequest("POST", {
          action: "update_prize",
          id,
          name,
          description,
          image_url
        });

        prizeMessage.textContent = "¡Premio actualizado!";

      } else if (accion === "delete-prize") {
        const confirmar = confirm(
          "¿Seguro que querés eliminar este premio? Esta acción puede estar limitada si tiene códigos asociados."
        );

        if (!confirmar) return;

        await manageRequest("POST", {
          action: "delete_prize",
          id
        });

        prizeMessage.textContent = "Premio eliminado.";
      }

      await cargarPanel();

    } catch (error) {
      prizeMessage.textContent = error.message;
    } finally {
      boton.disabled = false;
    }
  });
}

// ACTUALIZAR INFORMACIÓN
const refreshAdminBtn = document.getElementById("refreshAdminBtn");

if (refreshAdminBtn) {
  refreshAdminBtn.addEventListener("click", cargarPanel);
                           }
          
