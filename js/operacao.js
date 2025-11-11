function formatarNumero(valor, casas = 8) {
  return valor
    .toFixed(casas)
    .replace(".", ",")
    .replace(/,?0+$/, "") // remove zeros finais
    .replace(/,$/, ""); // remove vírgula solta
}
function formatarNumeroComReticencia(valor, casas = 8) {
  const arredondado = valor.toFixed(casas);
  const strCompleto = valor.toFixed(casas + 10); // mais casas p/ detectar dízima

  const valorArredondado = parseFloat(arredondado);
  const valorCompleto = parseFloat(strCompleto);

  const cortado = arredondado
    .replace(".", ",")
    .replace(/,?0+$/, "")
    .replace(/,$/, "");

  const precisaReticencia = Math.abs(valorArredondado - valorCompleto) > 1e-12;

  return precisaReticencia
    ? cortado + "<span class='ellipsis'>…</span>"
    : cortado;
}
function formatarBaseComReticencia(baseInt, fracArray, casas = 8) {
  const fracLimitada = fracArray.slice(0, casas);
  let fracString = fracLimitada.join("");

  if (fracArray.isRepeating) {
    fracString += "<span class='ellipsis'>…</span>";
  }

  return fracString ? `${baseInt},${fracString}` : baseInt;
}
class BaseNumberExplorer {
  constructor(container, enableClick = false) {
    this.container = container;
    this.enableClick = enableClick;

    this.baseSelector = container.querySelector(".baseSelector");
    this.integerColumnSelector = container.querySelector(
      ".integerColumnSelector"
    );
    this.decimalColumnSelector = container.querySelector(
      ".decimalColumnSelector"
    );
    this.abacusContainer = container.querySelector(".base-container");
    this.resultDisplay = container.querySelector(".resultDisplay");
    this.baseDisplay = container.querySelector(".baseDisplay");
    this.resetButton = container.querySelector(".resetButton");
    this.draggableBall = container.querySelector(".draggableBall");
    this.toggleSoundButton = container.querySelector(".toggleSoundButton");

    this.columns = [];
    this.addSound = new Audio("audio/add.mp3");
    this.removeSound = new Audio("audio/remove.mp3");
    this.addSound.volume = 0.4;
    this.removeSound.volume = 0.4;

    this.soundEnabled = true;

    this.setupEventListeners();
    this.createAbacus();

    //  Correção: só adiciona evento se o botão existir
    if (this.toggleSoundButton) {
      this.toggleSoundButton.addEventListener("click", () => {
        this.soundEnabled = !this.soundEnabled;

        if (this.soundEnabled) {
          this.toggleSoundButton.querySelector(".sound-icon").textContent =
            "🔊";
          this.toggleSoundButton.querySelector(".sound-label").textContent =
            "Ativo"; // 🔥 Texto menor
          this.toggleSoundButton.title = "Desativar som";
        } else {
          this.toggleSoundButton.querySelector(".sound-icon").textContent =
            "🔇";
          this.toggleSoundButton.querySelector(".sound-label").textContent =
            "Mudo"; // 🔥 Texto menor
          this.toggleSoundButton.title = "Ativar som";
        }
      });
    }
  }

  setupEventListeners() {
    this.baseSelector.addEventListener("change", () => {
      const estadoAtual = this.saveCurrentState();
      this.createAbacus();
      this.restorePreviousState(estadoAtual);
    });

    this.integerColumnSelector.addEventListener("change", () => {
      const estadoAtual = this.saveCurrentState();
      this.createAbacus();
      this.restorePreviousState(estadoAtual);
    });

    this.decimalColumnSelector.addEventListener("change", () => {
      const estadoAtual = this.saveCurrentState();
      this.createAbacus();
      this.restorePreviousState(estadoAtual);
    });

    this.resetButton.addEventListener("click", () => this.resetAbacus());

    this.draggableBall.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", "ball");
    });

    this.abacusContainer.addEventListener("dragover", (event) => {
      event.preventDefault();
      const targetColumn = event.target.closest(".column");
      if (targetColumn) {
        this.updateDraggingBall(targetColumn);
      }
    });

    this.abacusContainer.addEventListener("dragleave", () => {
      this.resetDraggingBall();
    });

    this.abacusContainer.addEventListener("drop", (event) => {
      event.preventDefault();
      const targetColumn = event.target.closest(".column");
      if (targetColumn) {
        this.addBallToColumn(targetColumn);
        this.resetDraggingBall();
      }
    });
  }

  updateDraggingBall(column) {
    const power = parseInt(column.dataset.power);
    if (power >= 0) {
      const colorIndex = Math.min(power, this.powersColors.length - 1);
      this.draggableBall.style.backgroundColor = this.powersColors[colorIndex];
      this.draggableBall.style.border = "none";
      this.draggableBall.style.backgroundImage = "none";
      this.removeSVGFromBall(this.draggableBall);
    } else {
      const divisions = Math.pow(this.base, -power);
      this.draggableBall.style.backgroundColor = "transparent";
      this.draggableBall.style.border = "none";
      this.removeSVGFromBall(this.draggableBall);
      this.draggableBall.appendChild(this.createFractionalSVG(divisions));
    }
  }

  resetDraggingBall() {
    this.draggableBall.style.backgroundColor = "#ffffff";
    this.draggableBall.style.border = "2px dotted #000000";
    this.draggableBall.style.backgroundImage = "none";
    this.removeSVGFromBall(this.draggableBall);
  }

  removeSVGFromBall(ball) {
    const svg = ball.querySelector("svg");
    if (svg) {
      svg.remove();
    }
  }

  createAbacus() {
    this.abacusContainer.innerHTML = "";

    //  Aqui colocamos valor padrão caso seja vazio ou inválido
    this.base = parseInt(this.baseSelector.value) || 2;
    this.integerColumns = parseInt(this.integerColumnSelector.value) || 1;
    this.decimalColumns = parseInt(this.decimalColumnSelector.value) || 0;

    console.log(
      "Criando abacus com",
      this.integerColumns,
      "inteiras e",
      this.decimalColumns,
      "fracionárias."
    );

    this.columns = [];

    this.powersColors = [
      "#ff6f61",
      "#ffa372",
      "#ffd97d",
      "#a0e8af",
      "#5f9ea0",
      "#a78bfa",
      "#ff99c8",
      "#ffb5a7",
      "#9fc5e8",
      "#6fffe9",
      "#dab6fc",
      "#b4f8c8",
    ];

    for (let i = this.integerColumns - 1; i >= 0; i--) {
      const label = this.formatLabel(i);
      const column = this.createColumn(label, i);
      this.abacusContainer.appendChild(column);
      this.columns.push({ column, power: i });
      if (this.enableClick) {
        column.addEventListener("click", (e) => {
          // Só adiciona se clicou no espaço vazio da coluna (não na bolinha)
          if (e.target === column) {
            this.addBallToColumn(column);
          }
        });
      }
    }

    if (this.decimalColumns > 0) {
      const comma = document.createElement("div");
      comma.className = "comma-separator";
      comma.textContent = ",";
      this.abacusContainer.appendChild(comma);
    }

    for (let i = 1; i <= this.decimalColumns; i++) {
      const power = -i;
      const label = this.formatLabel(power);
      const column = this.createColumn(label, power);
      this.abacusContainer.appendChild(column);
      this.columns.push({ column, power });
      if (this.enableClick) {
        column.addEventListener("click", (e) => {
          if (e.target === column) {
            this.addBallToColumn(column);
          }
        });
      }
    }

    this.updateResult();
  }

  saveCurrentState() {
    const state = {};
    this.columns.forEach(({ column, power }) => {
      const balls = column.querySelectorAll(".ball");
      state[power] = balls.length;
    });
    return state;
  }

  restorePreviousState(state) {
    for (const power in state) {
      const count = state[power];
      const column = this.columns.find((c) => c.power == power)?.column;
      if (column) {
        for (let i = 0; i < count; i++) {
          this.addBallToColumn(column);
        }
      }
    }
  }

  createColumn(labelText, power) {
    const column = document.createElement("div");
    column.className = "column";
    column.dataset.power = power;
    column.style.height = `calc(50px * (${this.base - 1} + 1) + 20px)`;

    const label = document.createElement("div");
    label.className = "column-label";
    label.textContent = labelText;
    column.appendChild(label);

    const count = document.createElement("div");
    count.className = "column-count";
    count.textContent = "0";
    column.appendChild(count);

    return column;
  }

  addBallToColumn(column) {
    const currentBalls = column.querySelectorAll(".ball").length;
    const power = parseInt(column.dataset.power);

    if (currentBalls < this.base - 1) {
      const ball = document.createElement("div");
      ball.className = "ball";
      ball.addEventListener("click", () => this.removeBall(ball, column));

      this.applyBallStyle(ball, power);

      if (this.shouldShowTooltip(power)) {
        ball.addEventListener("mouseenter", (event) =>
          this.showTooltip(event, ball, power)
        );
        ball.addEventListener("mouseleave", () => this.hideTooltip());
      }

      column.appendChild(ball);
      this.valorOriginalDecimal = this.getValorDecimal(); // ← aqui!

      if (this.soundEnabled) {
        this.addSound.pause();
        this.addSound.currentTime = 0;
        this.addSound.play();
      }

      this.updateResult();
    } else {
      const symbolicBall = document.createElement("div");
      symbolicBall.className = "symbolic-ball";

      this.applyBallStyle(symbolicBall, power);
      column.appendChild(symbolicBall);
      setTimeout(() => symbolicBall.remove(), 500);

      this.animateBalls(column, power);
    }
  }

  removeBall(ball, column) {
    this.hideTooltip();
    ball.style.animation = "explode 0.3s forwards";
    ball.addEventListener("animationend", () => {
      ball.remove();
      if (this.soundEnabled) {
        this.removeSound.pause();
        this.removeSound.currentTime = 0;
        this.removeSound.play();
      }
      this.updateResult();
    });
  }

  animateBalls(column, power) {
    const balls = column.querySelectorAll(".ball");
    let nextColumnIndex = this.columns.findIndex((c) => c.power === power) - 1;

    if (nextColumnIndex < 0) {
      const newPower = power + 1;
      const label = this.formatLabel(newPower);
      const newColumn = this.createColumn(label, newPower);
      this.abacusContainer.insertBefore(
        newColumn,
        this.abacusContainer.firstChild
      );
      newColumn.classList.add("highlight");
      setTimeout(() => newColumn.classList.remove("highlight"), 4000);
      this.columns.unshift({ column: newColumn, power: newPower });
      nextColumnIndex = 0;
    }

    balls.forEach((ball, index) => {
      setTimeout(() => {
        ball.style.animation = "moveToNext 0.5s forwards";
        ball.addEventListener("animationend", () => {
          ball.remove();
          if (this.soundEnabled) {
            this.removeSound.pause();
            this.removeSound.currentTime = 0;
            this.removeSound.play();
          }
          if (index === balls.length - 1) {
            this.addBallToColumn(this.columns[nextColumnIndex].column);
          }
        });
      }, index * 100);
    });
  }

  applyBallStyle(ball, power) {
    this.removeSVGFromBall(ball);
    if (power >= 0) {
      const colorIndex = Math.min(power, this.powersColors.length - 1);
      ball.style.backgroundColor = this.powersColors[colorIndex];
      ball.style.border = "none";
    } else {
      const divisions = Math.pow(this.base, -power);
      ball.style.backgroundColor = "transparent";
      ball.style.border = "none";
      ball.appendChild(this.createFractionalSVG(divisions));
    }
  }

  createFractionalSVG(divisions) {
    const size = 50;
    const radius = 25;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

    const darkColor = "#FF0000";
    const lightColor = "#ffecec";
    const strokeColor = "#cc0000";

    const angleStep = (2 * Math.PI) / divisions;
    const cx = size / 2;
    const cy = size / 2;

    const background = document.createElementNS(svgNS, "circle");
    background.setAttribute("cx", cx);
    background.setAttribute("cy", cy);
    background.setAttribute("r", radius);
    background.setAttribute("fill", lightColor);
    svg.appendChild(background);

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + angleStep;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const pathData = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
      `Z`,
    ].join(" ");

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", darkColor);
    path.setAttribute("stroke", strokeColor);
    path.setAttribute("stroke-width", "1");

    svg.appendChild(path);
    return svg;
  }

  shouldShowTooltip(power) {
    if (power >= 1) return true;
    const nextColumnExists = this.columns.some((c) => c.power === power - 1);
    return power <= 0 && nextColumnExists;
  }

  showTooltip(event, ball, power) {
    if (this.shouldShowTooltip(power)) {
      const tooltip = this.createTooltip(ball, power);
      document.body.appendChild(tooltip);
      this.positionTooltip(event, tooltip);

      const moveHandler = (e) => this.positionTooltip(e, tooltip);
      ball.addEventListener("mousemove", moveHandler);

      tooltip.addEventListener("remove", () => {
        ball.removeEventListener("mousemove", moveHandler);
      });
    }
  }

  createTooltip(ball, power) {
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.id = "ballTooltip";

    const currentBallIcon = document.createElement("div");
    currentBallIcon.className = "ball-icon";

    const svgInBall = ball.querySelector("svg");
    if (svgInBall) {
      const svgClone = svgInBall.cloneNode(true);
      svgClone.setAttribute("width", "20");
      svgClone.setAttribute("height", "20");
      svgClone.setAttribute("viewBox", "0 0 50 50");
      currentBallIcon.appendChild(svgClone);
    } else {
      currentBallIcon.style.backgroundColor = ball.style.backgroundColor;
    }

    const text = document.createElement("div");
    text.className = "tooltip-text";
    text.textContent = `= ${this.base} ×`;

    const lineContainer = document.createElement("div");
    lineContainer.style.display = "flex";
    lineContainer.style.alignItems = "center";
    lineContainer.style.gap = "5px";

    lineContainer.appendChild(currentBallIcon);
    lineContainer.appendChild(text);

    const nextBallIcon = document.createElement("div");
    nextBallIcon.className = "ball-icon";

    const tempBall = document.createElement("div");
    tempBall.className = "ball";
    this.applyBallStyle(tempBall, power - 1);

    const svg = tempBall.querySelector("svg");
    if (svg) {
      const svgClone = svg.cloneNode(true);
      svgClone.setAttribute("width", "20");
      svgClone.setAttribute("height", "20");
      svgClone.setAttribute("viewBox", "0 0 50 50");
      nextBallIcon.appendChild(svgClone);
    } else {
      nextBallIcon.style.backgroundColor = tempBall.style.backgroundColor;
    }

    lineContainer.appendChild(nextBallIcon);

    tooltip.appendChild(lineContainer);

    const infoLine = document.createElement("div");
    infoLine.style.fontSize = "12px";
    infoLine.innerHTML = `Uma bolinha equivale a 1 &times; ${this.base}<sup>${power}</sup>`;
    tooltip.appendChild(infoLine);

    return tooltip;
  }

  positionTooltip(event, tooltip) {
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
  }

  hideTooltip() {
    const tooltip = document.getElementById("ballTooltip");
    if (tooltip) {
      const removeEvent = new Event("remove");
      tooltip.dispatchEvent(removeEvent);
      tooltip.remove();
    }
  }

  updateResult() {
    let total = 0;

    this.columns.forEach(({ column, power }) => {
      const ballCount = column.querySelectorAll(".ball").length;
      column.querySelector(".column-count").textContent = ballCount;
      total += ballCount * Math.pow(this.base, power);
    });

    const detailedCalculationDiv = this.container.querySelector(
      ".detailedCalculation"
    );
    const polynomialTitle = this.container.querySelector(".polynomialTitle");

    if (total === 0) {
      this.baseDisplay.innerHTML = `Número na Base ${this.base}: 0`;

      this.resultDisplay.textContent = `Representação do número na base 10: 0`;
      polynomialTitle.innerHTML = `Polinômio na Base ${this.base}: N =`;
      detailedCalculationDiv.innerHTML = `0`;
      return;
    }

    let parteInteira = Math.floor(total);
    let parteFracionaria = total - parteInteira;

    const casasNecessarias = detectFracCols(parteFracionaria, this.base);

    const fracArray = convertFractionToBase(
      parteFracionaria,
      this.base,
      casasNecessarias
    );

    const fracLimitada = fracArray.slice(0, 8);
    let fracString = fracLimitada.map((digit) => digit).join("");

    if (fracArray.isRepeating) {
      fracString += "<span class='ellipsis'>…</span>";
    }

    const baseInt = parteInteira.toString(this.base);
    const valorNaBaseHTML = formatarBaseComReticencia(baseInt, fracArray, 8);

    const valorDecimalReal = this.valorOriginalDecimal ?? total;

    let totalFormatado = formatarNumeroComReticencia(
      Math.abs(valorDecimalReal),
      8
    );

    const sinalHTML = this.resultadoNegativo
      ? `<span style="display: inline-block; width: 2ch; text-align: center;">−</span>`
      : "";

    this.resultDisplay.innerHTML = `Representação do número na base 10: ${sinalHTML}${totalFormatado}`;
    this.baseDisplay.innerHTML = `Número na Base ${this.base}: ${sinalHTML}${valorNaBaseHTML}`;

    const detailedTerms = this.columns.map(({ column, power }) => {
      const ballCount = column.querySelectorAll(".ball").length;
      return `(${ballCount} × ${this.base}<sup>${power}</sup>)`;
    });

    if (detailedTerms.length > 0) {
      const expression = detailedTerms.join(" + ");
      detailedCalculationDiv.innerHTML = `${expression} = ${sinalHTML}${totalFormatado}`;
      polynomialTitle.innerHTML = `Polinômio na Base ${this.base}: N =`;
    } else {
      detailedCalculationDiv.innerHTML = "";
    }
  }

  formatLabel(power) {
    const superMap = {
      "-": "⁻",
      0: "⁰",
      1: "¹",
      2: "²",
      3: "³",
      4: "⁴",
      5: "⁵",
      6: "⁶",
      7: "⁷",
      8: "⁸",
      9: "⁹",
    };
    return `${this.base}${String(power)
      .split("")
      .map((char) => superMap[char] || char)
      .join("")}`;
  }

  getValorDecimal() {
    let total = 0;
    this.columns.forEach(({ column, power }) => {
      const ballCount = column.querySelectorAll(".ball").length;
      total += ballCount * Math.pow(this.base, power); //  CORRETO!
    });
    return total;
  }

  setResultado(resultado, base, intCols, fracCols) {
    const negativo = resultado < 0;
    resultado = Math.abs(resultado);
    this.resultadoNegativo = negativo; //  Corrige o sinal negativo

    this.baseSelector.value = String(base);

    const intColsCorrigido = Math.max(intCols, 1);
    this.integerColumnSelector.value = String(intColsCorrigido);
    this.decimalColumnSelector.value = String(fracCols);

    //  Cria o ábaco com a base e quantidade de colunas
    this.decimalColumns = fracCols;
    this.createAbacus();

    //  Agora adiciona as bolinhas com base no valor decimal
    let valorRestante = resultado;
    this.columns
      .sort((a, b) => b.power - a.power) // maior para menor potência
      .forEach(({ column, power }) => {
        const fator = Math.pow(base, power);
        const quantidade = Math.floor(valorRestante / fator);
        valorRestante -= quantidade * fator;

        for (let i = 0; i < quantidade; i++) {
          this.addBallToColumn(column);
        }
      });

    this.valorOriginalDecimal = negativo ? -resultado : resultado;

    this.updateResult();
  }

  resetAbacus() {
    this.columns.forEach(({ column }) => {
      const balls = column.querySelectorAll(".ball");
      balls.forEach((ball) => ball.remove());
    });
    this.resultadoNegativo = false; //  Aqui
    this.updateResult();
  }
}

function convertFractionToBase(fraction, base, digits = 20) {
  const result = [];
  const seen = new Map(); // para detectar dízima periódica
  let frac = fraction;
  let isRepeating = false;

  for (let i = 0; i < digits; i++) {
    frac *= base;
    const digit = Math.floor(frac);
    frac -= digit;

    const key = frac.toPrecision(12); // identificador do resto
    if (seen.has(key)) {
      isRepeating = true;
      break;
    }

    seen.set(key, i);
    result.push(digit);

    if (Math.abs(frac) < 1e-12) break;
  }

  result.isRepeating = isRepeating; // <- isso é o que precisamos
  return result;
}

function detectFracCols(fraction, base, maxCols = 20, tolerance = 1e-12) {
  let frac = fraction;
  let count = 0;

  while (Math.abs(frac) > tolerance && count < maxCols) {
    frac *= base;
    frac = frac - Math.floor(frac);
    count++;
  }

  return count;
}

const MIN_PRECISION = 0; // ou mantenha 10 se quiser.
const MAX_PRECISION = 30; // Limite superior de casas decimais.

// 🔧 Configuração global de exibição
const MAX_DISPLAY_DECIMALS = 8; // Casas decimais no número em base 10
const MAX_DISPLAY_BASE_DIGITS = 8; // Dígitos fracionários na base escolhida

const bloco1 = new BaseNumberExplorer(
  document.querySelectorAll(".caixa-retangulo")[0],
  true // habilita clique
);
const bloco2 = new BaseNumberExplorer(
  document.querySelectorAll(".caixa-retangulo")[1],
  true // habilita clique
);
const blocoResultado = new BaseNumberExplorer(
  document.querySelector(".caixa-retangulo.bloco-resultado"),
  false // NÃO habilita clique
);

const modoUnico = document.getElementById("modoUnico");
const modoDiferente = document.getElementById("modoDiferente");

function estaUsandoBaseUnica() {
  return modoUnico.checked;
}

modoUnico.addEventListener("change", () => {
  if (modoUnico.checked) {
    const baseAtual = bloco1.baseSelector.value;
    bloco2.baseSelector.value = baseAtual;
    blocoResultado.baseSelector.value = baseAtual;

    bloco2.createAbacus();
    blocoResultado.createAbacus();
  }
});
// Força o comportamento da opção "usar mesma base" logo ao iniciar
if (modoUnico.checked) {
  const baseAtual = bloco1.baseSelector.value;
  bloco2.baseSelector.value = baseAtual;
  blocoResultado.baseSelector.value = baseAtual;

  bloco2.createAbacus();
  blocoResultado.createAbacus();
}

function sincronizarBases(origem) {
  if (!estaUsandoBaseUnica()) return;

  const novaBase = origem.baseSelector.value;

  [bloco1, bloco2, blocoResultado].forEach((bloco) => {
    if (bloco !== origem) {
      bloco.baseSelector.value = novaBase;
      bloco.createAbacus();
    }
  });
}

[bloco1, bloco2, blocoResultado].forEach((bloco) => {
  bloco.baseSelector.addEventListener("change", () => sincronizarBases(bloco));
});

const botaoExecutar = document.getElementById("executarOperacao");
const selectOperacao = document.getElementById("operacao");

botaoExecutar.addEventListener("click", () => {
  const operacao = selectOperacao.value;
  const valor1 = bloco1.getValorDecimal();
  const valor2 = bloco2.getValorDecimal();

  let resultado;

  if (operacao === "divisao" && valor2 === 0) {
    alert("❌ Erro: Divisão por zero!");
    return;
  }

  switch (operacao) {
    case "soma":
      resultado = valor1 + valor2;
      break;
    case "subtracao":
      resultado = valor1 - valor2;
      break;
    case "multiplicacao":
      resultado = valor1 * valor2;
      break;
    case "divisao":
      resultado = valor1 / valor2;
      break;
  }

  const baseResultado = parseInt(blocoResultado.baseSelector.value) || 2;

  const parteInteira = Math.abs(Math.floor(resultado));
  const intCols =
    parteInteira > 0
      ? Math.ceil(Math.log(parteInteira + 1) / Math.log(baseResultado))
      : 1;

  const parteFracionaria =
    Math.abs(resultado) - Math.floor(Math.abs(resultado));
  const casasNecessarias = Math.max(
    4,
    detectFracCols(parteFracionaria, baseResultado)
  );
  const fracCols = Math.min(casasNecessarias, MAX_PRECISION);

  blocoResultado.setResultado(resultado, baseResultado, intCols, fracCols);
});
