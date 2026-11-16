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

// INICIO DE SESIÓN DEL ADMINISTRADOR RED NOVA
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLoginMessage = document.getElementById("adminLoginMessage");

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("adminUsername").value.trim();
    const password = document.getElementById("adminPassword").value;

    adminLoginBtn.disabled = true;
    adminLoginMessage.textContent = "Verificando acceso...";

    try {
      // PRIMERA COMPROBACIÓN: USUARIO Y CONTRASEÑA
      const response = await fetch("/.netlify/functions/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({
          username,
          password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        adminLoginMessage.textContent =
          data.message || "Usuario o contraseña incorrectos.";
        return;
      }

      // SEGUNDA COMPROBACIÓN: SESIÓN DEL ADMINISTRADOR
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

      // TERCERA COMPROBACIÓN: CONEXIÓN CON SUPABASE
      adminLoginMessage.textContent =
        "Conectando con la base de datos...";

      const managementResponse = await fetch(
        "/.netlify/functions/manage",
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store"
        }
      );

      const managementData = await managementResponse.json();

      if (!managementResponse.ok || !managementData.success) {
        adminLoginMessage.textContent =
          managementData.message ||
          "No se pudo conectar con la base de datos.";
        return;
      }

      const totalPrizes = Array.isArray(managementData.prizes)
        ? managementData.prizes.length
        : 0;

      const totalCodes = Array.isArray(managementData.codes)
        ? managementData.codes.length
        : 0;

      adminLoginMessage.textContent =
        "¡Conexión correcta! Premios: " +
        totalPrizes +
        " | Códigos: " +
        totalCodes;

      document.getElementById("adminPassword").value = "";

    } catch (error) {
      adminLoginMessage.textContent =
        "No se pudo conectar. Intentá nuevamente.";
    } finally {
      adminLoginBtn.disabled = false;
    }
  });
      }
