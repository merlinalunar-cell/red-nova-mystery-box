const accessCode = document.getElementById("accessCode");
const validateBtn = document.getElementById("validateBtn");
const openBox = document.getElementById("openBox");
const codeMessage = document.getElementById("codeMessage");
const boxInstruction = document.getElementById("boxInstruction");
const result = document.getElementById("result");

let validatedCode = "";
let openingInProgress = false;

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
