//  Função auxiliar para aguardar "ms" milissegundos
function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// CÓDIGO CORRIGIDO
function formatarNumero(valor, casas = 8) {
  // 1. Converte para string com casas decimais e troca ponto por vírgula
  let str = valor.toFixed(casas).replace(".", ",");

  // 2. Só remove zeros finais se a string REALMENTE tiver uma vírgula
  if (str.includes(",")) {
    str = str.replace(/0+$/, ""); // Remove apenas os zeros do final
  }

  // 3. Remove a vírgula se ela ficar "solta" no final (ex: "10,")
  return str.replace(/,$/, "");
}

function formatarNumeroComReticencia(valor, casas = 8) {
  const cortado = valor
    .toFixed(casas)
    .replace(".", ",")
    .replace(/,?0+$/, "")
    .replace(/,$/, "");

  return cortado;
}

function formatarBaseComReticencia(baseInt, fracArray, casas = 8) {
  const fracLimitada = fracArray.slice(0, casas);
  let fracString = fracLimitada.join("");

  return fracString ? `${baseInt},${fracString}` : `${baseInt}`;
}
//  Funções auxiliares necessárias ANTES da classe
function convertFractionToBase(fraction, base, digits = 20) {
  const result = [];
  let frac = fraction;

  for (let i = 0; i < digits; i++) {
    frac *= base;
    let digit = Math.floor(frac + 1e-10); // evita erro numérico
    frac -= digit;

    result.push(digit);

    if (frac < 1e-10) break;
  }

  return result;
}

function detectFracCols(fraction, base, maxCols = 20, tolerance = 1e-12) {
  let frac = fraction;
  let count = 0;

  while (Math.abs(frac) > tolerance && count < maxCols) {
    frac *= base;
    frac -= Math.floor(frac);
    count++;
  }

  return count;
}

class BaseNumberExplorer {
  constructor(container) {
    this.container = container;

    this.baseSelector = container.querySelector(".baseSelector");
    this.integerColumnSelector = container.querySelector(
      ".integerColumnSelector"
    );
    this.decimalColumnSelector = container.querySelector(
      ".decimalColumnSelector"
    );
    this.abacusContainer = container.querySelector(".abacusContainer");

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

    if (this.toggleSoundButton) {
      this.toggleSoundButton.addEventListener("click", () => {
        this.soundEnabled = !this.soundEnabled;

        this.toggleSoundButton.querySelector(".sound-icon").textContent = this
          .soundEnabled
          ? "🔊"
          : "🔇";
        this.toggleSoundButton.querySelector(".sound-label").textContent = this
          .soundEnabled
          ? "Ativo"
          : "Mudo";
        this.toggleSoundButton.title = this.soundEnabled
          ? "Desativar som"
          : "Ativar som";
      });
    }
  }

  setupEventListeners() {
    this.baseSelector.addEventListener("change", () => {
      const estadoAtual = this.saveCurrentState();
      this.createAbacus();
      this.restorePreviousState(estadoAtual);
      sincronizarBases(this);
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

    // ✅ Permitir clique SOMENTE se este bloco for bloco1 ou bloco2
    const isBlocoInterativo =
      this.container.classList.contains("bloco1") ||
      this.container.classList.contains("bloco2");

    if (isBlocoInterativo) {
      column.addEventListener("click", (event) => {
        const isLabel = event.target.classList.contains("column-label");
        const isCount = event.target.classList.contains("column-count");
        const isBall = event.target.classList.contains("ball");

        if (isLabel || isCount || isBall) return;

        this.addBallToColumn(column);
      });
    }

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
      this.valorOriginalDecimal = this.getValorDecimal();

      if (this.soundEnabled) {
        this.addSound.pause();
        this.addSound.currentTime = 0;
        this.addSound.play();
      }

      this.updateResult();
    } else {
      // Exibe efeito simbólico, mas NÃO adiciona bolinha real
      const symbolicBall = document.createElement("div");
      symbolicBall.className = "symbolic-ball";

      this.applyBallStyle(symbolicBall, power);
      column.appendChild(symbolicBall);
      setTimeout(() => symbolicBall.remove(), 500);

      this.animateBalls(column, power);
      return; // 🔴 IMPEDE A CONTAGEM ERRADA
    }
  }

  removeBall(ball, column) {
    console.log("removeBall chamada no bloco:", this.container.classList); // <-- ADICIONE ESTA LINHA
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
    if (column.querySelectorAll(".ball").length >= this.base - 1) {
      // Evita overflow de bolinhas
      return;
    }

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
      ball.innerHTML = ""; // limpa o conteúdo anterior
      const svg = this.createFractionalSVG(divisions);
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.borderRadius = "50%"; // para manter formato redondo
      svg.style.display = "block"; // remove margem extra

      ball.appendChild(svg);

      ball.style.backgroundColor = "transparent";
      ball.style.border = "none";

      ball.style.backgroundColor = "transparent";
      ball.style.border = "none";
    }
  }

  createFractionalSVG(divisions) {
    const size = 100; // usamos 100 para facilitar escala relativa
    const radius = 50;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // Estilos para forçar encaixe dentro da .ball
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.borderRadius = "50%";
    svg.style.display = "block";

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
      "Z",
    ].join(" ");

    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", darkColor);
    path.setAttribute("stroke", strokeColor);
    path.setAttribute("stroke-width", "2");

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
    text.textContent = `${this.base} ×`;

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

      detailedCalculationDiv.innerHTML = "0";
      return;
    }

    //  Valor decimal real baseado nas bolinhas
    const valorDecimalReal = this.getValorDecimal();

    // Corrige para evitar erro de arredondamento
    const casasFixas = this.decimalColumns;
    const fator = Math.pow(10, casasFixas);
    const valorCorrigido = Math.round(valorDecimalReal * fator) / fator;

    //  Formata número decimal (base 10)
    const totalFormatado = formatarNumero(valorCorrigido, casasFixas);

    const valorNaBaseHTML = this.getNumeroBaseString();

    const sinalHTML = this.resultadoNegativo
      ? `<span style="display: inline-block; width: 2ch; text-align: center;">−</span>`
      : "";

    //  Atualiza os textos
    this.resultDisplay.innerHTML = `Representação do número na base 10: ${sinalHTML}${totalFormatado}`;

    this.baseDisplay.innerHTML = `Número na Base ${this.base}: ${sinalHTML}${valorNaBaseHTML}`;

    //  Polinômio
    const detailedTerms = this.columns.map(({ column, power }) => {
      const ballCount = column.querySelectorAll(".ball").length;
      return `${ballCount} × ${this.base}<sup>${power}</sup>`;
    });

    if (detailedTerms.length > 0) {
      const expression = detailedTerms.join(" + ");

      detailedCalculationDiv.innerHTML = `${expression} = ${sinalHTML}${totalFormatado}`;

      polynomialTitle.innerHTML = `Polinômio na Base ${this.base}: N =`;
    } else {
      detailedCalculationDiv.innerHTML = "";
    }

    if (typeof atualizarVisualOperacao === "function") {
      const op = selectOperacao.value;
      atualizarVisualOperacao(bloco1, bloco2, op, bloco1.base);
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
    const expoente = String(power)
      .split("")
      .map((char) => superMap[char] || char)
      .join("");

    return `${this.base}${expoente}`;
  }

  getValorDecimal() {
    let total = 0;
    this.columns.forEach(({ column, power }) => {
      const ballCount = column.querySelectorAll(".ball").length;
      total += ballCount * Math.pow(this.base, power);
    });

    // 🔧 Aplica truncamento com base nas casas decimais visíveis
    const casas = this.decimalColumns || 0;
    const fator = Math.pow(this.base, casas);
    total = Math.floor(total * fator + 1e-9) / fator;

    return total;
  }

  setResultado(resultado, base, intCols, fracCols) {
    const negativo = resultado < 0;
    resultado = Math.abs(resultado);
    this.resultadoNegativo = negativo;

    this.baseSelector.value = String(base);
    this.integerColumnSelector.value = String(Math.max(intCols, 1));
    this.decimalColumnSelector.value = String(fracCols);
    this.decimalColumns = fracCols;

    this.createAbacus();

    //  CORREÇÃO DE ARREDONDAMENTO
    const casasFixas = this.decimalColumns;
    const fatorCorte = Math.pow(10, casasFixas);
    resultado = Math.floor(resultado * fatorCorte + 1e-9) / fatorCorte;

    let valorRestante = resultado;
    const colunasOrdenadas = [...this.columns].sort(
      (a, b) => b.power - a.power
    );

    colunasOrdenadas.forEach(({ column, power }) => {
      const fator = Math.pow(base, power);
      const quantidade = Math.floor(valorRestante / fator + 1e-9);

      valorRestante -= quantidade * fator;
      for (let i = 0; i < quantidade; i++) {
        const ball = document.createElement("div");
        ball.className = "ball";
        this.applyBallStyle(ball, power);
        column.appendChild(ball);
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
    this.resultadoNegativo = false;
    this.updateResult();
  }

  getNumeroBaseString() {
    const base = this.base;

    // Ordena todas as colunas por potência crescente
    const colunasOrdenadas = [...this.columns].sort(
      (a, b) => b.power - a.power
    );

    let intStr = "";
    let fracStr = "";

    for (const { column, power } of colunasOrdenadas) {
      const count = column.querySelectorAll(".ball").length;

      if (power >= 0) {
        intStr += count.toString();
      } else {
        fracStr += count.toString();
      }
    }

    return fracStr.length > 0 ? `${intStr},${fracStr}` : intStr;
  }
}
function sincronizarBases(origem) {
  const novaBase = origem.baseSelector.value;

  [bloco1, bloco2, blocoResultado].forEach((bloco) => {
    if (bloco !== origem) {
      bloco.baseSelector.value = novaBase;
      bloco.createAbacus();
    }
  });
}

function atualizarChaveDivisao(dividendo, divisor) {
  const container = document.getElementById("quadroDivisao");
  container.innerHTML = `
    <div class="chave-divisao">
      <div class="linha-superior">
        <span class="dividendo">${dividendo}</span>
        <span class="barra-vertical"></span>
        <span class="divisor">${divisor}</span>
      </div>
      <div class="barra-horizontal"></div>
    </div>
  `;
}

function atualizarVisualOperacao(bloco1, bloco2, operacao, base) {
  //  Pega os valores EXATAMENTE como são mostrados na interface
  const num1 =
    bloco1.container
      .querySelector(".baseDisplay")
      ?.textContent.split(":")[1]
      ?.trim() || "0";
  const num2 =
    bloco2.container
      .querySelector(".baseDisplay")
      ?.textContent.split(":")[1]
      ?.trim() || "0";

  const maxLen = Math.max(num1.length, num2.length);
  const visual = document.getElementById("visualOperacao");
  const quadroDivisao = document.getElementById("quadroDivisao");

  if (operacao === "divisao") {
    quadroDivisao.style.display = "block";
    visual.style.display = "none";
    atualizarChaveDivisao(num1, num2);
    return;
  } else {
    quadroDivisao.style.display = "none";
    visual.style.display = "block";
  }

  const simbolo = {
    soma: "+",
    subtracao: "−",
    multiplicacao: "×",
    divisao: "÷",
  }[operacao];

  const linha = "─".repeat(maxLen + 2);

  visual.textContent = `${" ".repeat(2)}${num1.padStart(maxLen)}
${simbolo} ${num2.padStart(maxLen)}
${" ".repeat(2)}${linha}`;

  const mensagemOperacao = document.getElementById("mensagemOperacao");
  mensagemOperacao.textContent = `Operação escolhida na base ${base}: ${simbolo} ${operacoesLabel[
    operacao
  ].replace(/^[^\w]+/, "")}`;
}

const selectOperacao = document.getElementById("operacaoSelect");
const mensagemOperacao = document.getElementById("mensagemOperacao");

let bloco1, bloco2, blocoResultado, blocoFinal;
function validarSubtraendoMenorOuIgual() {
  const operacao = selectOperacao.value;
  if (operacao !== "subtracao") return true;

  const valorMinuendo = bloco1.getValorDecimal();
  const valorSubtraendo = bloco2.getValorDecimal();

  if (valorSubtraendo > valorMinuendo) {
    alert("Escolha o subtraendo menor ou igual ao minuendo.");
    return false;
  }

  return true;
}
function validarMultiplicacaoComMaisAlgarismo() {
  const casasBloco1 = parseInt(bloco1.integerColumnSelector.value);
  const casasBloco2 = parseInt(bloco2.integerColumnSelector.value);

  if (casasBloco1 < casasBloco2) {
    alert(
      "Para visualizar melhor a multiplicação, deixe o Bloco 1 com igual ou mais algarismos que o Bloco 2."
    );
    return false;
  }

  return true;
}

const operacoesLabel = {
  soma: "➕ Adição",
  subtracao: "➖ Subtração",
  multiplicacao: "✖️ Multiplicação",
  divisao: "➗ Divisão",
};

document.addEventListener("DOMContentLoaded", () => {
  const selectOperacao = document.getElementById("operacaoSelect");
  const mensagemOperacao = document.getElementById("mensagemOperacao");

  bloco1 = new BaseNumberExplorer(
    document.querySelector(".caixa-retangulo.bloco1")
  );
  bloco2 = new BaseNumberExplorer(
    document.querySelector(".caixa-retangulo.bloco2")
  );
  bloco2.abacusContainer.addEventListener("click", () => {
    validarSubtraendoMenorOuIgual();
  });

  blocoResultado = new BaseNumberExplorer(
    document.querySelector(".caixa-retangulo.bloco-resultado")
  );
  const botaoLimparRepresentacao = blocoResultado.resetButton;
  if (botaoLimparRepresentacao) {
    botaoLimparRepresentacao.addEventListener("click", () => {
      //  1. Limpa visual da subtração
      const abacoMinuendo = document.getElementById("abacoMinuendo");
      const abacoSubtraendo = document.getElementById("abacoSubtraendo");
      const abacoDiferenca = document.getElementById("abacoDiferenca");
      const linhaDiferenca = document.getElementById("linhaDiferenca");
      const botaoVerDiferenca = document.getElementById("botaoVerDiferenca");
      const visual = document.getElementById("blocoSubtracaoVisual");

      if (abacoMinuendo) abacoMinuendo.innerHTML = "";
      if (abacoSubtraendo) abacoSubtraendo.innerHTML = "";
      if (abacoDiferenca) abacoDiferenca.innerHTML = "";
      if (linhaDiferenca) linhaDiferenca.style.display = "none";
      if (botaoVerDiferenca) botaoVerDiferenca.style.display = "none";
      if (visual) visual.style.display = "none";

      //  2. Limpa as bolinhas, mas mantém as colunas visíveis
      blocoResultado.columns.forEach(({ column }) => {
        const bolas = column.querySelectorAll(".ball");
        bolas.forEach((ball) => ball.remove());

        //  Também limpa o contador visível da coluna
        const count = column.querySelector(".column-count");
        if (count) count.textContent = "0";
      });

      //  3. Zera os textos do resultado (mas mantém visíveis)
      const spanBase = blocoResultado.container.querySelector(".baseDisplay");
      const spanDecimal =
        blocoResultado.container.querySelector(".resultDisplay");
      const spanPoli = blocoResultado.container.querySelector(
        ".detailedCalculation"
      );
      const tituloPoli =
        blocoResultado.container.querySelector(".polynomialTitle");

      if (spanBase) spanBase.innerHTML = "Número na Base: 0";
      if (spanDecimal)
        spanDecimal.textContent = "Representação do número na base 10: 0";
      if (spanPoli) spanPoli.innerHTML = "0";
      if (tituloPoli)
        tituloPoli.innerHTML = `Polinômio na Base ${blocoResultado.base}: N =`;

      tituloPoli.innerHTML = `Polinômio na Base ${blocoResultado.base}: N =`;

      //  4. Também zera o bloco final, da mesma forma
      blocoFinal.columns.forEach(({ column }) => {
        const bolas = column.querySelectorAll(".ball");
        bolas.forEach((ball) => ball.remove());

        const count = column.querySelector(".column-count");
        if (count) count.textContent = "0";
      });

      const spanBaseFinal = blocoFinal.container.querySelector(".baseDisplay");
      const spanDecimalFinal =
        blocoFinal.container.querySelector(".resultDisplay");
      const spanPoliFinal = blocoFinal.container.querySelector(
        ".detailedCalculation"
      );
      const tituloPoliFinal =
        blocoFinal.container.querySelector(".polynomialTitle");

      if (spanBaseFinal) spanBaseFinal.innerHTML = "Número na Base: 0";
      if (spanDecimalFinal)
        spanDecimalFinal.textContent = "Representação do número na base 10: 0";
      if (spanPoliFinal) spanPoliFinal.innerHTML = "0";
      if (tituloPoliFinal)
        tituloPoliFinal.innerHTML = `Polinômio na Base ${blocoFinal.base}: N =`;
    });
  }

  blocoFinal = new BaseNumberExplorer(
    document.querySelector(".caixa-retangulo.bloco-final")
  );

  const botaoFinal = document.getElementById("botaoExecutarFinal");
  if (botaoFinal) {
    botaoFinal.addEventListener("click", async () => {
      const operacaoAtual = selectOperacao.value;

      if (operacaoAtual === "multiplicacao") {
        const valoresIniciais = calcularTotaisProdutoParcial();
        if (valoresIniciais.length === 0) {
          alert(
            "É necessário executar a animação do produto parcial primeiro!"
          );
          return;
        }

        // --- LÓGICA DA VÍRGULA ---
        const casasDecimais1 =
          parseInt(bloco1.decimalColumnSelector.value, 10) || 0;
        const casasDecimais2 =
          parseInt(bloco2.decimalColumnSelector.value, 10) || 0;
        const totalCasasDecimais = casasDecimais1 + casasDecimais2;

        const totalDigitosResultado = valoresIniciais.length;
        let casasInteiras = totalDigitosResultado - totalCasasDecimais;

        if (casasInteiras <= 0) {
          const zerosFaltando = 1 - casasInteiras;
          for (let i = 0; i < zerosFaltando; i++) {
            valoresIniciais.unshift(0);
          }
          casasInteiras = 1;
        }
        // --- FIM DA LÓGICA DA VÍRGULA ---

        blocoFinal.baseSelector.value = bloco1.baseSelector.value;
        blocoFinal.integerColumnSelector.value = casasInteiras;
        blocoFinal.decimalColumnSelector.value = totalCasasDecimais;
        blocoFinal.createAbacus();
        await esperar(50);

        valoresIniciais.forEach((total, index) => {
          const colunaDestino = blocoFinal.columns[index]?.column;
          if (colunaDestino) {
            const power = blocoFinal.columns[index].power;
            atualizarColunaComBolinhasOuContador(
              colunaDestino,
              total,
              blocoFinal,
              power
            );
          }
        });
        blocoFinal.updateResult();

        await esperar(1500);
        await animarVaiUmInterativo(blocoFinal);
      } else if (operacaoAtual === "soma") {
        await copiarEstadoParaBlocoFinal(blocoResultado, blocoFinal);
        await esperar(300);
        await executarAnimacaoVaiUmVisual(blocoFinal);
      } else if (operacaoAtual === "subtracao") {
        await copiarEstadoParaBlocoFinal(blocoResultado, blocoFinal);

        //  INÍCIO DA NOVA LÓGICA DE DIVISÃO
      } else if (operacaoAtual === "divisao") {
        // 1. Pega os valores decimais originais dos Blocos 1 e 2
        const valor1 = bloco1.getValorDecimal();
        const valor2 = bloco2.getValorDecimal();

        if (valor2 === 0) {
          alert("Não é possível dividir por zero.");
          return;
        }

        // 2. Calcula o resultado decimal real
        const resultadoDecimal = valor1 / valor2;

        // 3. Pega as configurações do Bloco Final (como o aluno quer ver o resultado)
        const baseFinal = parseInt(blocoFinal.baseSelector.value);
        const intColsFinal = parseInt(blocoFinal.integerColumnSelector.value);
        //  CORREÇÃO: Garante que o Bloco Final tenha casas fracionárias para mostrar
        let fracColsFinal = parseInt(blocoFinal.decimalColumnSelector.value);
        if (fracColsFinal === 0 && resultadoDecimal % 1 !== 0) {
          fracColsFinal = 4; // Define 4 casas decimais por padrão se o resultado for fracionário
        }

        // 4. Chama a nova função de animação
        await animarResultadoDecimalNoBlocoFinal(
          blocoFinal,
          resultadoDecimal,
          baseFinal,
          intColsFinal,
          fracColsFinal
        );
        //  FIM DA NOVA LÓGICA
      } else {
        console.log("Animação final não aplicável para esta operação.");
      }
    });
  }

  // Ajustes visuais iniciais
  blocoResultado.baseSelector.value = "2";
  blocoResultado.integerColumnSelector.value = "2";
  blocoResultado.decimalColumnSelector.value = "0";
  blocoResultado.createAbacus();

  blocoFinal.baseSelector.value = "2";
  blocoFinal.integerColumnSelector.value = "2";
  blocoFinal.decimalColumnSelector.value = "0";
  blocoFinal.createAbacus();

  bloco1.createAbacus();
  bloco2.createAbacus();
  blocoResultado.createAbacus();
  blocoFinal.createAbacus();

  const opInicial = selectOperacao.value;
  const baseAtual = parseInt(bloco1.baseSelector.value);

  bloco1.base = baseAtual;
  bloco2.base = baseAtual;

  mensagemOperacao.textContent = `Operação escolhida na base ${baseAtual}: ${operacoesLabel[opInicial]}`;

  atualizarVisualOperacao(bloco1, bloco2, opInicial, baseAtual);

  //  Aguarda as linhas do Produto Parcial aparecerem no DOM:
  const containerSoma = document.getElementById(
    "containerMultiplicacaoSomaParcial"
  );
  if (containerSoma) {
    const observer = new MutationObserver((mutations, obs) => {
      if (containerSoma.querySelector(".linha-resultado-parcial")) {
        obs.disconnect(); // Para de observar
      }
    });
    observer.observe(containerSoma, { childList: true, subtree: true });
  }

  if (opInicial !== "divisao") {
    document.getElementById("visualOperacao").style.display = "block";
    document.getElementById("quadroDivisao").style.display = "none";
  }
});

selectOperacao.addEventListener("change", () => {
  const op = selectOperacao.value;
  const baseAtual = parseInt(bloco1.baseSelector.value);

  //  PASSO 1: Lógica da Divisão (com verificação)
  let fracaoRemovida = false; // Flag para saber se precisamos avisar o aluno

  if (op === "divisao") {
    //  VERIFICA PRIMEIRO: Checa se os blocos JÁ TÊM bolinhas fracionárias
    // Usamos os próprios ábacos (bloco1, bloco2) pois é mais preciso
    [bloco1, bloco2].forEach((bloco) => {
      // Procura por qualquer coluna (power < 0) que tenha bolinhas (length > 0)
      const temFracao = bloco.columns.some(
        (col) =>
          col.power < 0 && col.column.querySelectorAll(".ball").length > 0
      );
      if (temFracao) {
        fracaoRemovida = true;
      }
    });

    // Agora, continua o processo de ocultar e zerar
    document.querySelectorAll(".decimalColumnSelector").forEach((input) => {
      input.value = 0;
      const controlGroup = input.closest(".control-group");
      if (controlGroup) {
        controlGroup.style.display = "none"; // Oculta o bloco
      }
      // Força o redesenho do ábaco sem as casas decimais
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  } else {
    //  PASSO 2: Lógica para as outras operações (Re-exibir)
    document.querySelectorAll(".decimalColumnSelector").forEach((input) => {
      const controlGroup = input.closest(".control-group");
      if (controlGroup) {
        controlGroup.style.display = "flex"; // Re-exibe o bloco
      }
    });
  }

  //  PASSO 3: Atualiza o restante da interface
  bloco1.base = baseAtual;
  bloco2.base = baseAtual;
  mensagemOperacao.textContent = `Operação escolhida na base ${baseAtual}: ${operacoesLabel[op]}`;
  atualizarVisualOperacao(bloco1, bloco2, op, baseAtual);
  limparTodasAnimacoesVisuais();

  //  PASSO 4: Mostra o aviso (se necessário)
  if (fracaoRemovida) {
    // Usamos um setTimeout para garantir que o alert não trave a UI
    // antes dela terminar de redesenhar.
    setTimeout(() => {
      alert(
        "Aviso: A animação da Divisão funciona apenas com números inteiros. As partes fracionárias foram removidas."
      );
    }, 100);
  }
});

document;
document
  .getElementById("botaoExecutarAnimacao")
  .addEventListener("click", async () => {
    const operacao = document.getElementById("operacaoSelect").value;

    //  NOVA LINHA - Pega o elemento do título
    const tituloVisual = document.getElementById(
      "titulo-bloco-visual-operacao"
    );

    //  NOVA LINHA - Define o texto do título com base na operação
    if (tituloVisual) {
      if (operacao === "divisao") {
        tituloVisual.textContent = "Visual da Divisão";
      } else if (operacao === "multiplicacao") {
        tituloVisual.textContent = "Visual da Multiplicação";
      }
    }
    //  FIM DAS NOVAS LINHAS

    //  Validação completa da divisão
    if (operacao === "divisao") {
      //  CORREÇÃO: A animação conceitual de "distribuir bolinhas"
      // só deve operar com a PARTE INTEIRA dos números.
      const valor1 = Math.floor(bloco1.getValorDecimal());
      const valor2 = Math.floor(bloco2.getValorDecimal());

      if (valor1 === 0) {
        alert("O Bloco 1 (dividendo) precisa ter valor diferente de zero.");
        return;
      }

      if (valor2 === 0) {
        alert("O divisor (Bloco 2) não pode ser zero.");
        return;
      }

      if (valor1 < valor2) {
        alert(
          "O número do Bloco 1 (dividendo) deve ser maior ou igual ao do Bloco 2 (divisor)."
        );
        return;
      } //  Chama o "Roteador" da Divisão

      await executarAnimacaoDivisaoRoteador(valor1, valor2);
      return; //  Impede cair nas outras operações
    }

    // 🧹 Limpa estados antigos
    document.getElementById("blocoMultiplicacaoVisual").style.display = "none";
    document.body.classList.remove("modo-subtracao", "modo-multiplicacao");

    if (operacao === "subtracao") {
      document.body.classList.add("modo-subtracao");
      console.log(
        "🔁 Classe modo-subtracao ativa:",
        document.body.classList.contains("modo-subtracao")
      );
    }

    // --- Lógica para ADIÇÃO ---
    if (operacao === "soma") {
      await agruparBolinhasParaAdicao();
      await esperar(500); // pausa
    } else {
      if (operacao === "subtracao" && !validarSubtraendoMenorOuIgual()) return;

      aplicarOperacao();
      await esperar(100);

      if (operacao === "subtracao") {
        const base = parseInt(bloco1.baseSelector.value);
        await mostrarSubtracaoEmpilhada();
        await executarSubtracaoComEmprestimo();
        await esperar(100);

        const valorStr1 = bloco1.getNumeroBaseString();
        const valorStr2 = bloco2.getNumeroBaseString();
        const valor1 = converterBaseParaDecimal(valorStr1, base);
        const valor2 = converterBaseParaDecimal(valorStr2, base);
        const resultado = valor1 - valor2;

        const casasFrac1 = parseInt(bloco1.decimalColumnSelector.value) || 0;
        const casasFrac2 = parseInt(bloco2.decimalColumnSelector.value) || 0;
        const casasFrac = Math.max(casasFrac1, casasFrac2, 2);

        const fator = Math.pow(base, casasFrac);
        const arredondado = Math.round(resultado * fator) / fator;

        const casasInt = Math.max(
          1,
          Math.floor(Math.log(Math.abs(resultado)) / Math.log(base)) + 1
        );

        blocoResultado.setResultado(arredondado, base, casasInt, casasFrac);
      }

      if (operacao === "multiplicacao") {
        if (!validarMultiplicacaoComMaisAlgarismo()) return;
        await mostrarMultiplicacaoVisualCompleta();
        return;
      }
    }
  });

/**
 * Roteador para a Animação de Divisão.
 * Decide se deve usar a animação "Literal" (bolinhas) ou "Simbólica" (números)
 * com base no tamanho dos valores.
 */
async function executarAnimacaoDivisaoRoteador(dividendo, divisor) {
  // Define os limites máximos para a animação com bolinhas
  const MAX_BOLINHAS_MONTE = 150; //  Alterado para o seu valor
  const MAX_GRUPOS = 20; //  Alterado para o seu valor

  // Pega a parte inteira (a animação literal não usa fração)
  const dividendoInt = Math.floor(dividendo);
  const divisorInt = Math.floor(divisor);

  // Se os números forem muito grandes, usa a animação simbólica (com números)
  if (divisorInt > MAX_GRUPOS || dividendoInt > MAX_BOLINHAS_MONTE) {
    console.log("Números grandes. Usando animação simbólica.");
    await executarAnimacaoDivisaoSimbolica(dividendoInt, divisorInt);
  } else {
    // Se os números forem pequenos, usa a animação literal (com bolinhas)
    console.log("Números pequenos. Usando animação literal.");
    await executarAnimacaoDivisaoLiteral(dividendoInt, divisorInt);
  }
}

//  Função de animação da divisão visual com bolinhas
//  Função de animação da divisão visual com bolinhas (CORRIGIDA)
async function executarAnimacaoDivisaoLiteral(dividendo, divisor) {
  //  Pega o Bloco Pai (para poder exibi-lo)
  const blocoPai = document.getElementById("blocoMultiplicacaoVisual");
  //  Pega o Bloco Filho (o container correto para desenhar)
  const container = document.getElementById("containerMultiplicacaoVisual");

  if (!blocoPai || !container) {
    console.error("Erro: Container da divisão/multiplicação não encontrado!");
    return;
  }

  container.innerHTML = ""; //  Limpa APENAS o conteúdo interno

  //  Exibe ambos os containers
  blocoPai.style.display = "flex";
  container.style.display = "flex";

  //  Define os estilos para a grade da divisão (Layout vertical)
  container.style.flexDirection = "column"; // 1. Monte em cima
  container.style.flexWrap = "nowrap";
  container.style.justifyContent = "flex-start";
  container.style.alignItems = "center"; // 2. Grupos embaixo
  container.style.alignContent = "center";
  container.style.alignSelf = "center";
  container.style.gap = "20px"; // Espaço entre o Monte e os Grupos

  // ############# 1. CRIAR O "MONTE" (DIVIDENDO) #############
  const monteContainer = document.createElement("div");
  monteContainer.innerHTML = `<strong style="margin-bottom: 5px; width: 100%; text-align: center; display: block;">Dividendo (${dividendo} bolinhas)</strong>`;
  monteContainer.style.border = "2px dashed #007bff";
  monteContainer.style.padding = "10px";
  monteContainer.style.borderRadius = "8px";
  monteContainer.style.display = "flex";
  monteContainer.style.flexWrap = "wrap"; // Bolinhas vão quebrar a linha
  monteContainer.style.justifyContent = "center";
  monteContainer.style.gap = "4px"; // ✅ Reduzido o gap do monte
  monteContainer.style.width = "80%";
  container.appendChild(monteContainer);

  // ############# 2. CRIAR A ÁREA DOS GRUPOS (DIVISOR) #############
  const gruposContainer = document.createElement("div");
  gruposContainer.style.display = "flex";
  gruposContainer.style.flexWrap = "wrap";
  gruposContainer.style.justifyContent = "center";
  gruposContainer.style.gap = "15px";
  container.appendChild(gruposContainer);

  const colunas = []; // Array para guardar os elements ONDE AS BOLINHAS VÃO

  // Cria colunas de destino (os "Grupos")
  for (let i = 0; i < divisor; i++) {
    const coluna = document.createElement("div"); // O "Grupo" (caixa azul)
    coluna.className = "column";

    // Estilos da caixa "Grupo"
    coluna.style.display = "flex";
    coluna.style.flexDirection = "column"; // Título em cima, grid de bolinhas embaixo
    coluna.style.alignItems = "center";
    coluna.style.minWidth = "70px"; // ✅ Reduzido minWidth (30+30+4(gap)+2*2(margin)=72)
    coluna.style.border = "1px solid #007bff";
    coluna.style.borderRadius = "8px";
    coluna.style.padding = "10px 5px";
    coluna.style.minHeight = "100px";
    coluna.style.backgroundColor = "#f0f8ff";
    coluna.style.width = "fit-content";
    coluna.style.whiteSpace = "normal";

    // Adiciona o Título do Grupo
    coluna.innerHTML = `<strong style="margin-bottom: 5px; white-space: nowrap; display: block; width: 100%; text-align: center;">Grupo ${
      i + 1
    }</strong>`;

    //  NOVO: Cria um container interno para as bolinhas
    const ballGridContainer = document.createElement("div");
    ballGridContainer.className = "divisao-ball-grid";
    ballGridContainer.style.display = "grid";
    ballGridContainer.style.gridTemplateColumns = "repeat(2, 1fr)"; //  FORÇA DUAS COLUNAS
    ballGridContainer.style.gap = "2px 4px"; //  Reduzido o gap (2px vertical, 4px horizontal)
    ballGridContainer.style.justifyItems = "center";
    ballGridContainer.style.alignItems = "center";

    coluna.appendChild(ballGridContainer); // Adiciona o grid dentro da caixa "Grupo"
    gruposContainer.appendChild(coluna); // Adiciona a caixa "Grupo" ao container de grupos

    //  IMPORTANTE: Salva o 'ballGridContainer' como o destino das bolinhas
    colunas.push(ballGridContainer);
  }

  // ############# 3. POPULAR O "MONTE" (ANIMADO) #############
  const bolinhasDoMonte = [];
  for (let i = 0; i < dividendo; i++) {
    const bolinha = document.createElement("div");
    bolinha.className = "ball divisao-anim-ball"; // Usa a classe do CSS
    bolinha.style.backgroundColor = "#007bff";
    bolinha.style.margin = "2px"; //  Reduzida a margem
    bolinha.style.transition = "all 0.5s ease";
    bolinha.style.opacity = "0";

    monteContainer.appendChild(bolinha);
    bolinhasDoMonte.push(bolinha);

    requestAnimationFrame(() => {
      bolinha.style.opacity = "1";
    });

    if (blocoResultado.soundEnabled) {
      blocoResultado.addSound.pause();
      blocoResultado.addSound.currentTime = 0;
      blocoResultado.addSound.play();
    }
    await esperar(80);
  }

  await esperar(1000); // Pausa para o aluno ver o monte

  // ############# 4. CALCULAR E ANIMAR DISTRIBUIÇÃO #############
  const quociente = Math.floor(dividendo / divisor);
  const resto = dividendo % divisor;
  let bolinhaIndex = 0;

  for (let i = 0; i < quociente; i++) {
    for (let j = 0; j < colunas.length; j++) {
      const bolinhaDoMonte = bolinhasDoMonte[bolinhaIndex];
      //  'grupoDestino' agora é o 'ballGridContainer'
      const grupoDestino = colunas[j];

      bolinhaDoMonte.style.opacity = "0";
      bolinhaDoMonte.style.transform = "scale(0.5)";
      if (blocoResultado.soundEnabled) {
        blocoResultado.removeSound.pause();
        blocoResultado.removeSound.currentTime = 0;
        blocoResultado.removeSound.play();
      }
      await esperar(200);

      const novaBolinha = document.createElement("div");
      novaBolinha.className = "ball divisao-anim-ball"; // Usa a classe do CSS
      novaBolinha.style.backgroundColor = "#007bff";
      novaBolinha.style.margin = "2px"; // ✅ Reduzida a margem
      novaBolinha.style.opacity = "0";
      novaBolinha.style.transform = "scale(0.5)";
      novaBolinha.style.transition = "all 0.3s ease";

      //  Adiciona a bolinha ao grid, que a posicionará automaticamente
      grupoDestino.appendChild(novaBolinha);

      if (blocoResultado.soundEnabled) {
        blocoResultado.addSound.pause();
        blocoResultado.addSound.currentTime = 0;
        blocoResultado.addSound.play();
      }

      requestAnimationFrame(() => {
        novaBolinha.style.opacity = "1";
        novaBolinha.style.transform = "scale(1)";
      });

      bolinhaIndex++;
      await esperar(150);
    }
    await esperar(400);
  }

  await esperar(1000); // Pausa para ver o resultado

  // ############# 5. ANIMAR O "RESTO" (TOTALMENTE REFEITO) #############
  if (resto > 0) {
    //  Cria a caixa "Resto" EXATAMENTE como uma caixa "Grupo"
    const restoBox = document.createElement("div");
    restoBox.className = "column"; // Usa a mesma classe base

    // Aplica os mesmos estilos da caixa "Grupo"
    restoBox.style.display = "flex";
    restoBox.style.flexDirection = "column";
    restoBox.style.alignItems = "center";
    restoBox.style.minWidth = "70px"; // Mesma largura
    restoBox.style.border = "1px solid #007bff";
    restoBox.style.borderRadius = "8px";
    restoBox.style.padding = "10px 5px";
    restoBox.style.minHeight = "100px";
    restoBox.style.backgroundColor = "#f0f8ff";
    restoBox.style.width = "fit-content";
    restoBox.style.whiteSpace = "normal";

    // Adiciona o Título do Resto
    restoBox.innerHTML = `<strong style="margin-bottom: 5px; white-space: nowrap; display: block; width: 100%; text-align: center;">Resto: ${resto}</strong>`;

    //  Cria o MESMO grid interno para as bolinhas do resto
    const restoGridContainer = document.createElement("div");
    restoGridContainer.className = "divisao-ball-grid-resto";
    restoGridContainer.style.display = "grid";
    restoGridContainer.style.gridTemplateColumns = "repeat(2, 1fr)"; // FORÇA DUAS COLUNAS
    restoGridContainer.style.gap = "2px 4px"; // Mesmo gap
    restoGridContainer.style.justifyItems = "center";
    restoGridContainer.style.alignItems = "center";

    restoBox.appendChild(restoGridContainer); // Adiciona o grid dentro da caixa "Resto"
    gruposContainer.appendChild(restoBox); // Adiciona a caixa "Resto" ao container de grupos

    // Pega as bolinhas que sobraram no monte
    const bolinhasRestantes = bolinhasDoMonte.slice(bolinhaIndex);

    // Animação de piscar 3 vezes (no 'restoBox')
    for (let i = 0; i < 3; i++) {
      restoBox.style.boxShadow = "0 0 15px 5px #ff6347"; // Brilho vermelho
      bolinhasRestantes.forEach((b) => {
        b.style.backgroundColor = "#ff6347";
        b.style.opacity = "1";
        b.style.transform = "scale(1.1)";
      });
      await esperar(300);
      restoBox.style.boxShadow = "2px 2px 5px rgba(0, 0, 0, 0.1)";
      bolinhasRestantes.forEach((b) => {
        b.style.transform = "scale(1)";
      });
      await esperar(300);
    }

    // Move as bolinhas restantes para o 'restoBox' (agora no grid interno)
    for (const bolinha of bolinhasRestantes) {
      bolinha.style.opacity = "0";
      bolinha.style.transform = "scale(0.5)";
      if (blocoResultado.soundEnabled) {
        blocoResultado.removeSound.pause();
        blocoResultado.removeSound.currentTime = 0;
        blocoResultado.removeSound.play();
      }
      await esperar(200);

      const bolinhaResto = document.createElement("div");
      bolinhaResto.className = "ball divisao-anim-ball"; // Usa a classe de tamanho
      bolinhaResto.style.backgroundColor = "#ff6347"; // Mantém a cor vermelha
      bolinhaResto.style.margin = "2px"; // ✅ Reduzida a margem
      bolinhaResto.style.opacity = "0";
      bolinhaResto.style.transform = "scale(0.5)";
      bolinhaResto.style.transition = "all 0.3s ease";

      //  Adiciona ao grid interno do resto
      restoGridContainer.appendChild(bolinhaResto);

      requestAnimationFrame(() => {
        bolinhaResto.style.opacity = "1";
        bolinhaResto.style.transform = "scale(1)";
      });

      if (blocoResultado.soundEnabled) {
        blocoResultado.addSound.pause();
        blocoResultado.addSound.currentTime = 0;
        blocoResultado.addSound.play();
      }
      await esperar(100);
    }
  }

  // ############# 6. ADICIONAR TEXTO DE RESULTADO (COM ANIMAÇÃO) #############

  //  NOVO: Cria um container "em linha" para o resultado e a mensagem exata
  const linhaResultadoWrapper = document.createElement("div");
  linhaResultadoWrapper.style.display = "flex";
  linhaResultadoWrapper.style.flexDirection = "row"; // Lado a lado
  linhaResultadoWrapper.style.alignItems = "center"; // Alinha verticalmente
  linhaResultadoWrapper.style.justifyContent = "center"; // Centraliza na página
  linhaResultadoWrapper.style.gap = "20px"; // Espaço entre a caixa azul e o texto vermelho
  linhaResultadoWrapper.style.marginTop = "-10px"; // Espaço acima da linha (ajustado de -10px para 15px)

  // Cria a caixa (retângulo) para o resultado
  const resultadoCaixa = document.createElement("div");
  resultadoCaixa.className = "result-box";
  resultadoCaixa.textContent = `Divisor: ${divisor} , Quociente: ${quociente} e Resto: ${resto}`;

  // Estilos para a caixa de resultado
  //  A linha "marginTop" foi removida daqui
  resultadoCaixa.style.fontSize = "1.2em"; //  Fonte que definimos
  resultadoCaixa.style.fontWeight = "bold";
  resultadoCaixa.style.color = "#007bff";
  resultadoCaixa.style.borderColor = "#007bff";
  resultadoCaixa.style.backgroundColor = "#f0f8ff";
  resultadoCaixa.style.padding = "15px 25px";
  const sombraOriginal = "2px 2px 5px rgba(0, 0, 0, 0.1)";
  resultadoCaixa.style.boxShadow = sombraOriginal;

  //  Adiciona a caixa azul ao NOVO wrapper
  linhaResultadoWrapper.appendChild(resultadoCaixa);

  //  Adiciona o NOVO wrapper ao container principal
  container.appendChild(linhaResultadoWrapper);

  // Animação de piscar 5 vezes
  for (let i = 0; i < 5; i++) {
    resultadoCaixa.style.boxShadow = "0 0 15px 5px #007bff";
    resultadoCaixa.style.backgroundColor = "#ffffff";
    await esperar(250);
    resultadoCaixa.style.boxShadow = sombraOriginal;
    resultadoCaixa.style.backgroundColor = "#f0f8ff";
    await esperar(250);
  }

  // ############# 6B. ADICIONAR MENSAGEM DE DIVISÃO EXATA #############
  if (resto === 0) {
    const exataTexto = document.createElement("div");
    exataTexto.textContent = "Esta divisão é exata!";
    //  A linha "marginTop" foi removida daqui
    exataTexto.style.fontSize = "1.3em";
    exataTexto.style.fontWeight = "bold";
    exataTexto.style.color = "#d62728";
    exataTexto.style.textAlign = "center";

    // Animação de fade-in para a mensagem
    exataTexto.style.opacity = "0";
    exataTexto.style.transition = "opacity 0.5s ease-in";

    //  Adiciona o texto vermelho ao NOVO wrapper
    linhaResultadoWrapper.appendChild(exataTexto);

    await esperar(50);
    requestAnimationFrame(() => {
      exataTexto.style.opacity = "1";
    });
  }

  // ############# 7. EXIBIR RESULTADO FINAL (era etapa 6) #############
  const base = parseInt(bloco1.baseSelector.value);
  const casasFrac = Math.max(
    parseInt(bloco1.decimalColumnSelector.value || "0"),
    parseInt(bloco2.decimalColumnSelector.value || "0"),
    2
  );

  const fator = Math.pow(base, casasFrac);
  const resultado = quociente;
  const casasInt = Math.max(
    1,
    Math.floor(Math.log(Math.max(1, Math.abs(resultado))) / Math.log(base)) + 1
  );

  blocoResultado.setResultado(resultado, base, casasInt, 0);
}

/**
 * Executa a animação da divisão de forma "Simbólica" (com números)
 * para casos em que os valores são muito grandes para desenhar bolinhas.
 */
async function executarAnimacaoDivisaoSimbolica(dividendo, divisor) {
  //  Pega o Bloco Pai e o Bloco Filho
  const blocoPai = document.getElementById("blocoMultiplicacaoVisual");
  const container = document.getElementById("containerMultiplicacaoVisual");
  container.innerHTML = ""; // Limpa

  //  Exibe os containers
  blocoPai.style.display = "flex";
  container.style.display = "flex";

  //  Define os estilos (vertical, com espaçamento)
  container.style.flexDirection = "column";
  container.style.flexWrap = "nowrap";
  container.style.justifyContent = "flex-start";
  container.style.alignItems = "center";
  container.style.alignSelf = "center";
  container.style.gap = "20px";

  // ############# 1. CALCULAR RESULTADOS #############
  const quociente = Math.floor(dividendo / divisor);
  const resto = dividendo % divisor;

  // ############# 2. CRIAR O "MONTE" (DIVIDENDO) #############
  const monteContainer = document.createElement("div");
  // Mostra apenas o número, sem bolinhas
  monteContainer.innerHTML = `<strong style="margin-bottom: 5px; width: 100%; text-align: center; display: block;">Dividendo</strong>`;
  monteContainer.style.border = "2px dashed #007bff";
  monteContainer.style.padding = "10px";
  monteContainer.style.borderRadius = "8px";
  monteContainer.style.width = "80%";

  // Cria o contador numérico para o dividendo
  const dividendoContador = document.createElement("div");
  dividendoContador.className = "contador-bolinhas"; // Reutiliza sua classe de contador
  dividendoContador.textContent = dividendo;
  dividendoContador.style.opacity = 0; // Começa invisível
  monteContainer.appendChild(dividendoContador);

  container.appendChild(monteContainer);

  // Animação de fade-in
  await esperar(100);
  requestAnimationFrame(() => (dividendoContador.style.opacity = 1));
  await esperar(1000);

  // ############# 3. CRIAR A ÁREA DOS GRUPOS (ANIMADA) #############
  const gruposContainer = document.createElement("div");
  gruposContainer.style.display = "flex";
  gruposContainer.style.flexWrap = "wrap";
  gruposContainer.style.justifyContent = "center";
  gruposContainer.style.alignItems = "stretch"; // Garante altura igual
  gruposContainer.style.gap = "15px";
  container.appendChild(gruposContainer);

  // Array para guardar os grupos que vamos preencher com o quociente
  const caixasDeGrupoVazias = [];

  // Define quantos grupos mostrar no início e no fim
  const LIMITE_GRUPOS_VISIVEIS = 7; // Total (5 no início + 2 no fim)
  const GRUPOS_INICIO = 5;

  // Função de helper para tocar som de "inserir"
  const tocarSomInserir = () => {
    if (blocoResultado.soundEnabled) {
      blocoResultado.addSound.pause();
      blocoResultado.addSound.currentTime = 0;
      blocoResultado.addSound.play();
    }
  };

  const tempoAparecer = 800; // Velocidade que as caixas aparecem

  // --- Caso 1: Divisor é PEQUENO (<= 7), mostra TODOS os grupos ---
  if (divisor <= LIMITE_GRUPOS_VISIVEIS) {
    for (let i = 1; i <= divisor; i++) {
      const grupo = criarCaixaGrupoSimbolico(i);
      gruposContainer.appendChild(grupo);
      caixasDeGrupoVazias.push(grupo); // Salva este grupo
      tocarSomInserir();
      await esperar(tempoAparecer);
    }
  }
  // --- Caso 2: Divisor é GRANDE (> 7), mostra 5, ..., 2 ---
  else {
    // 1. Grupos 1 a 5
    for (let i = 1; i <= GRUPOS_INICIO; i++) {
      const grupo = criarCaixaGrupoSimbolico(i);
      gruposContainer.appendChild(grupo);
      caixasDeGrupoVazias.push(grupo); // Salva os 5 primeiros
      tocarSomInserir();
      await esperar(tempoAparecer);
    }

    // 2. Ellipsis (...)
    const ellipsis = document.createElement("div");
    ellipsis.textContent = "...";
    ellipsis.style.alignSelf = "center";
    ellipsis.style.fontSize = "2em";
    ellipsis.style.padding = "0 15px";
    gruposContainer.appendChild(ellipsis);
    tocarSomInserir();
    await esperar(tempoAparecer);

    // 3. Grupos N-1 e N
    const grupoN_1 = criarCaixaGrupoSimbolico(divisor - 1);
    gruposContainer.appendChild(grupoN_1);
    caixasDeGrupoVazias.push(grupoN_1); // Salva o penúltimo
    tocarSomInserir();
    await esperar(tempoAparecer);

    const grupoN = criarCaixaGrupoSimbolico(divisor);
    gruposContainer.appendChild(grupoN);
    caixasDeGrupoVazias.push(grupoN); // Salva o último
    tocarSomInserir();
    await esperar(tempoAparecer);
  }

  // 4. Caixa Resto (sempre aparece por último)
  const restoBoxEl = criarCaixaGrupoSimbolico(`Resto`);
  gruposContainer.appendChild(restoBoxEl);
  tocarSomInserir();
  await esperar(tempoAparecer);

  // Pausa curta para o aluno assimilar
  await esperar(500);

  // ############# 4. ANIMAR DISTRIBUIÇÃO SIMBÓLICA #############

  // Pisca o dividendo
  dividendoContador.classList.add("processando-numero");
  await esperar(800);
  dividendoContador.classList.remove("processando-numero");
  dividendoContador.style.opacity = 0.3; // Esmaece o dividendo

  // Toca som de "saída" (explosão)
  if (blocoResultado.soundEnabled) {
    blocoResultado.removeSound.pause();
    blocoResultado.removeSound.currentTime = 0;
    blocoResultado.removeSound.play();
  }
  await esperar(200); // Pequena pausa após som

  // Anima o quociente em TODOS os grupos visíveis, um por um
  for (const grupoEl of caixasDeGrupoVazias) {
    const quocienteContador = document.createElement("div");
    quocienteContador.className = "contador-bolinhas numero-recebendo-vai-um";
    quocienteContador.textContent = quociente;
    grupoEl.appendChild(quocienteContador);

    tocarSomInserir();
    await esperar(300); // Animação rápida entre os contadores
  }

  // Anima o resto
  const restoContador = document.createElement("div");
  restoContador.className = "contador-bolinhas numero-recebendo-vai-um";
  restoContador.textContent = resto;

  //  INÍCIO DA CORREÇÃO
  // Só aplica os efeitos de "Resto" se ele for maior que zero
  if (resto > 0) {
    // 1. Muda a cor do NÚMERO e da borda do contador
    restoContador.style.color = "#d62728"; // Vermelho para o número
    restoContador.style.borderColor = "#ff6347"; // Borda vermelha clara

    // 2. Pisca a CAIXA 3 vezes (o título já está vermelho do Passo 1)
    const sombraOriginal = restoBoxEl.style.boxShadow || "";
    for (let i = 0; i < 3; i++) {
      restoBoxEl.style.boxShadow = "0 0 15px 5px #ff6347"; // Brilho vermelho
      await esperar(300);
      restoBoxEl.style.boxShadow = sombraOriginal; // Remove brilho
      await esperar(300);
    }
  }
  //  FIM DA CORREÇÃO

  restoBoxEl.appendChild(restoContador);
  tocarSomInserir();

  await esperar(1000); // Pausa para ver os números

  // ############# 5. ADICIONAR TEXTO DE RESULTADO #############
  const linhaResultadoWrapper = document.createElement("div");
  linhaResultadoWrapper.style.display = "flex";
  linhaResultadoWrapper.style.flexDirection = "row";
  linhaResultadoWrapper.style.alignItems = "center";
  linhaResultadoWrapper.style.justifyContent = "center";
  linhaResultadoWrapper.style.gap = "20px";
  linhaResultadoWrapper.style.marginTop = "15px";

  const resultadoCaixa = document.createElement("div");
  resultadoCaixa.className = "result-box";
  resultadoCaixa.textContent = `Divisor: ${divisor} , Quociente: ${quociente} e Resto: ${resto}`;
  resultadoCaixa.style.fontSize = "1.2em";
  resultadoCaixa.style.fontWeight = "bold";
  resultadoCaixa.style.color = "#007bff";
  resultadoCaixa.style.borderColor = "#007bff";
  resultadoCaixa.style.backgroundColor = "#f0f8ff";
  resultadoCaixa.style.padding = "15px 25px";
  linhaResultadoWrapper.appendChild(resultadoCaixa);
  container.appendChild(linhaResultadoWrapper);

  if (resto === 0) {
    const exataTexto = document.createElement("div");
    exataTexto.textContent = "Esta divisão é exata!";
    exataTexto.style.fontSize = "1.3em";
    exataTexto.style.fontWeight = "bold";
    exataTexto.style.color = "#d62728";
    exataTexto.style.textAlign = "center";
    linhaResultadoWrapper.appendChild(exataTexto);
  }

  // ############# 6. EXIBIR RESULTADO FINAL (BLOCO RESULTADO) #############
  const base = parseInt(bloco1.baseSelector.value);
  const resultado = quociente;
  const casasInt = Math.max(
    1,
    Math.floor(Math.log(Math.max(1, Math.abs(resultado))) / Math.log(base)) + 1
  );
  blocoResultado.setResultado(resultado, base, casasInt, 0);
}

function criarCaixaGrupoSimbolico(titulo) {
  const coluna = document.createElement("div");
  coluna.className = "column";
  coluna.style.display = "flex";
  coluna.style.flexDirection = "column";
  coluna.style.alignItems = "center";
  coluna.style.justifyContent = "space-between"; // Título em cima, número embaixo
  coluna.style.minWidth = "90px"; // Um pouco mais largo
  coluna.style.border = "1px solid #007bff";
  coluna.style.borderRadius = "8px";
  coluna.style.padding = "10px 5px";
  coluna.style.minHeight = "100px";
  coluna.style.backgroundColor = "#f0f8ff";
  coluna.style.width = "fit-content";
  coluna.style.whiteSpace = "normal";

  //  INÍCIO DA CORREÇÃO (Muda a cor do título se for "Resto")
  const isResto = titulo === "Resto";
  const corTitulo = isResto ? "#d62728" : "#333"; // Vermelho para Resto, preto para Grupos

  coluna.innerHTML = `<strong style="margin-bottom: 5px; white-space: nowrap; display: block; width: 100%; text-align: center; color: ${corTitulo};">${
    isResto ? "Resto" : "Grupo " + titulo
  }</strong>`;
  //  FIM DA CORREÇÃO

  return coluna;
}

function posicionarSeta() {
  const bloco = document.querySelector(".caixa-retangulo.bloco-resultado");
  const seta = document.getElementById("setaProximoPasso");

  if (!bloco || !seta) return;

  const rect = bloco.getBoundingClientRect();
  const scrollTop = window.scrollY;
  const scrollLeft = window.scrollX;

  const margemLateral = 15; // distância da seta em relação ao bloco

  seta.style.top = `${rect.top + rect.height / 2 + scrollTop}px`;
  seta.style.left = `${rect.right + margemLateral + scrollLeft}px`;
}

window.addEventListener("load", posicionarSeta);
window.addEventListener("resize", posicionarSeta);
window.addEventListener("scroll", posicionarSeta);

function sincronizarBaseEAtualizarOperacao() {
  const baseAtual = parseInt(bloco1.baseSelector.value); // ou .querySelector(".baseSelector")
  const op = document.getElementById("operacaoSelect").value;

  bloco1.base = baseAtual;
  bloco2.base = baseAtual;

  // Atualiza texto da operação
  mensagemOperacao.textContent = `Operação escolhida na base ${baseAtual}: ${operacoesLabel[op]}`;

  // Atualiza visual da operação
  atualizarVisualOperacao(bloco1, bloco2, op, baseAtual);
}

// Listener para mudança da base
document.querySelectorAll(".baseSelector").forEach((input) => {
  input.addEventListener("change", sincronizarBaseEAtualizarOperacao);
});
function converterBaseParaDecimal(numeroStr, base) {
  const [parteInt, parteFrac = ""] = numeroStr.split(",");

  let resultado = 0;

  // Parte inteira
  for (let i = 0; i < parteInt.length; i++) {
    const digito = parseInt(parteInt[parteInt.length - 1 - i], base);
    if (isNaN(digito)) continue;
    resultado += digito * Math.pow(base, i);
  }

  // Parte fracionária
  for (let i = 0; i < parteFrac.length; i++) {
    const digito = parseInt(parteFrac[i], base);
    if (isNaN(digito)) continue;
    resultado += digito * Math.pow(base, -(i + 1));
  }

  return resultado;
}

function aplicarOperacao() {
  const base = parseInt(bloco1.baseSelector.value);
  const operacao = selectOperacao.value;

  const valorStr1 = bloco1.getNumeroBaseString(); // exemplo: "1000,1"
  const valorStr2 = bloco2.getNumeroBaseString(); // exemplo: "1,01"

  const valor1 = converterBaseParaDecimal(valorStr1, base);
  const valor2 = converterBaseParaDecimal(valorStr2, base);

  let resultado = 0;

  if (operacao === "divisao") {
    if (valor2 === 0) {
      alert("Erro: divisão por zero!");
      return;
    }
    resultado = valor1 / valor2;
  } else if (operacao === "soma") {
    resultado = valor1 + valor2;
  } else if (operacao === "subtracao") {
    resultado = valor1 - valor2;
  } else if (operacao === "multiplicacao") {
    resultado = valor1 * valor2;
  }

  //  Cálculo de casas fracionárias
  const casasFrac1 = parseInt(bloco1.decimalColumnSelector.value) || 0;
  const casasFrac2 = parseInt(bloco2.decimalColumnSelector.value) || 0;
  const casasFrac = Math.max(casasFrac1, casasFrac2, 2); // força no mínimo 6 casas

  const fator = Math.pow(base, casasFrac);
  resultado = Math.round(resultado * fator) / fator;

  const casasInt = Math.max(
    1,
    Math.floor(Math.log(Math.abs(resultado)) / Math.log(base)) + 1
  );
}

function mostrarSubtracaoEmpilhada() {
  const visual = document.getElementById("blocoSubtracaoVisual");
  const abacoMinuendo = document.getElementById("abacoMinuendo");
  const abacoSubtraendo = document.getElementById("abacoSubtraendo");
  if (selectOperacao.value === "subtracao") {
    prepararVisualSubtracaoEmpilhada();
  }

  if (!visual || !abacoMinuendo || !abacoSubtraendo) return;

  // Limpa antes de montar
  abacoMinuendo.innerHTML = "";
  abacoSubtraendo.innerHTML = "";

  const colunasMinuendo = bloco1.columns;
  const colunasSubtraendo = bloco2.columns;

  const todasPotencias = Array.from(
    new Set([
      ...colunasMinuendo.map((c) => c.power),
      ...colunasSubtraendo.map((c) => c.power),
    ])
  ).sort((a, b) => b - a); // ordem decrescente

  const hasFrac = todasPotencias.some((p) => p < 0);
  const temVirgula = hasFrac;

  for (let i = 0; i < todasPotencias.length; i++) {
    const pot = todasPotencias[i];

    const colunaM = colunasMinuendo.find((c) => c.power === pot);
    const colunaS = colunasSubtraendo.find((c) => c.power === pot);

    const divM = document.createElement("div");
    divM.classList.add("column-visual", "subtracao");
    divM.dataset.power = pot;

    const divS = document.createElement("div");
    divS.classList.add("column-visual", "subtracao");
    divS.dataset.power = pot;

    const bolasM = colunaM?.column.querySelectorAll(".ball") || [];
    const bolasS = colunaS?.column.querySelectorAll(".ball") || [];

    Array.from(bolasM).forEach((ball) => {
      const nova = ball.cloneNode(true);
      divM.appendChild(nova);
    });

    Array.from(bolasS).forEach((ball) => {
      const nova = ball.cloneNode(true);
      divS.appendChild(nova);
    });

    abacoMinuendo.appendChild(divM);
    abacoSubtraendo.appendChild(divS);

    //  Insere vírgula após a última potência positiva
    const proximaPotencia = todasPotencias[i + 1];
    if (temVirgula && pot >= 0 && proximaPotencia < 0) {
      const virgula = document.createElement("div");
      virgula.className = "comma-separator";
      virgula.textContent = ",";

      abacoMinuendo.appendChild(virgula.cloneNode(true));
      abacoSubtraendo.appendChild(virgula.cloneNode(true));
    }
  }

  // Mostra visual
  visual.style.display = "block";
  // Mostra o botão "Ver Diferença" novamente ao preparar nova subtração
  const botaoVerDiferenca = document.getElementById("botaoVerDiferenca");
  const linhaDiferenca = document.getElementById("linhaDiferenca");
  const abacoDiferenca = document.getElementById("abacoDiferenca");

  if (botaoVerDiferenca && linhaDiferenca && abacoDiferenca) {
    botaoVerDiferenca.style.display = "inline-block"; // reaparece
    linhaDiferenca.style.display = "none"; // esconde a visualização da diferença
    abacoDiferenca.innerHTML = ""; // limpa diferença anterior
  }
}

async function animarAdicaoEducativa() {
  const containerResultado = document.querySelector(
    ".bloco-resultado .abacusContainer"
  );

  const colunasResultado = Array.from(
    containerResultado.querySelectorAll(".column")
  );

  const colunasOrdenadas = [...colunasResultado].sort((a, b) => {
    return parseFloat(a.dataset.power) - parseFloat(b.dataset.power);
  });

  for (const colunaDestino of colunasOrdenadas) {
    const pot = parseFloat(colunaDestino.dataset.power);

    //  AQUI está a correção — pegamos as bolinhas reais do resultado já calculado
    const colResultado = blocoResultado.columns.find((c) => c.power === pot);
    const quantidade =
      colResultado?.column.querySelectorAll(".ball").length || 0;

    //  Insere bolinhas uma a uma com animação
    for (let i = 0; i < quantidade; i++) {
      await esperar(200);

      const ball = document.createElement("div");
      ball.className = "ball";
      blocoResultado.applyBallStyle(ball, pot);

      ball.style.opacity = "0";
      ball.style.transform = "translateY(-30px)";
      ball.style.transition = "all 0.5s ease";

      colunaDestino.appendChild(ball);

      requestAnimationFrame(() => {
        ball.style.opacity = "1";
        ball.style.transform = "translateY(0)";
      });
    }
  }
}

function animarBolinhas() {
  const container = document.querySelector(".bloco-resultado .abacusContainer");
  const colunas = container.querySelectorAll(".column");

  colunas.forEach((coluna, colunaIndex) => {
    const bolinhas = coluna.querySelectorAll(".ball");
    const power = parseInt(coluna.dataset.power);

    bolinhas.forEach((ball, i) => {
      const cores = [
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
      const cor = cores[Math.max(0, Math.min(power, cores.length - 1))];
      ball.style.backgroundColor = cor;

      ball.style.opacity = "0";
      ball.style.transform = "translateY(-30px)";
      ball.style.transition = "all 0.4s ease";

      requestAnimationFrame(() => {
        setTimeout(() => {
          ball.style.opacity = "1";
          ball.style.transform = "translateY(0)";
        }, i * 100);
      });
    });
  });
}

async function animarBlocoFinalComoCopia() {
  const containerOrigem = document.querySelector(
    ".bloco-resultado .abacusContainer"
  );
  const containerDestino = document.querySelector(
    ".bloco-final .abacusContainer"
  );

  const colunasOrigem = Array.from(containerOrigem.querySelectorAll(".column"));
  const colunasDestino = Array.from(
    containerDestino.querySelectorAll(".column")
  );

  // 🧹 Limpa bolinhas atuais no bloco final
  colunasDestino.forEach((coluna) => {
    coluna.querySelectorAll(".ball").forEach((b) => b.remove());
  });

  for (const colunaOrigem of colunasOrigem) {
    const pot = parseFloat(colunaOrigem.dataset.power);
    const destino = colunasDestino.find(
      (c) => parseFloat(c.dataset.power) === pot
    );
    if (!destino) continue;

    const bolas = Array.from(colunaOrigem.querySelectorAll(".ball"));

    for (const [i, _] of bolas.entries()) {
      const ball = document.createElement("div");
      ball.className = "ball";
      blocoFinal.applyBallStyle(ball, pot);

      // Inicialmente oculta e deslocada para cima
      ball.style.opacity = "0";
      ball.style.transform = "translateY(-30px)";
      ball.style.transition = "all 0.4s ease";

      destino.appendChild(ball);

      // Animação visual em cascata
      requestAnimationFrame(() => {
        setTimeout(() => {
          ball.style.opacity = "1";
          ball.style.transform = "translateY(0)";
        }, i * 100); // efeito visual progressivo
      });

      await esperar(100); // espera antes de adicionar a próxima (para parecer que "desce")
    }
  }
}

async function decomporAte(base, origemPot, destinoPot) {
  for (let pot = origemPot; pot > destinoPot; pot--) {
    const colunaOrigem = document.querySelector(
      `#abacoMinuendo .column-visual[data-power="${pot}"]`
    );
    const colunaDestino = document.querySelector(
      `#abacoMinuendo .column-visual[data-power="${pot - 1}"]`
    );

    if (!colunaOrigem || !colunaDestino) continue;

    const bolasOrigem = colunaOrigem.querySelectorAll(".ball");
    if (bolasOrigem.length === 0) {
      await esperar(300);
      continue;
    }

    // Destaca colunas e mostra seta
    colunaOrigem.classList.add("caixa-destacada");
    colunaDestino.classList.add("caixa-destacada");
    mostrarSetaCurvaVisual(colunaOrigem, colunaDestino);
    await esperar(1000);

    //  Piscar e pulsar a bolinha que vai sair
    const emprestada = bolasOrigem[0];
    emprestada.classList.add("bolinha-transformando");
    await esperar(1000);
    emprestada.remove();

    //  SOM de explosão ao explodir a bolinha no empréstimo
    if (blocoResultado.soundEnabled) {
      blocoResultado.removeSound.pause();
      blocoResultado.removeSound.currentTime = 0;
      blocoResultado.removeSound.play();
    }

    await esperar(400);

    for (let j = 0; j < base; j++) {
      const nova = document.createElement("div");
      nova.className = "ball bolinha-chegando";
      bloco1.applyBallStyle(nova, pot - 1);

      // ➕ TOCA o som de aparição/adição para cada bolinha nova
      if (blocoResultado.soundEnabled) {
        blocoResultado.addSound.pause();
        blocoResultado.addSound.currentTime = 0;
        blocoResultado.addSound.play();
      }

      // Após a animação azul, volta à cor normal da potência
      setTimeout(() => {
        nova.classList.remove("bolinha-chegando");
        bloco1.applyBallStyle(nova, pot - 1);
      }, 1200);

      colunaDestino.appendChild(nova);
    }

    // Espera a animação pulsar azul terminar (roda 2 vezes)
    await esperar(1200);

    // 🔚 Remove destaque das colunas
    colunaOrigem.classList.remove("caixa-destacada");
    colunaDestino.classList.remove("caixa-destacada");

    await esperar(300);
  }
}

async function executarSubtracaoComEmprestimo() {
  const base = parseInt(bloco1.baseSelector.value);
  const abacoMinuendo = document.getElementById("abacoMinuendo");
  const abacoSubtraendo = document.getElementById("abacoSubtraendo");

  const potencias = Array.from(abacoMinuendo.querySelectorAll(".column-visual"))
    .map((col) => parseInt(col.dataset.power))
    .sort((a, b) => b - a); // da maior para menor

  for (let i = potencias.length - 1; i >= 0; i--) {
    const pot = potencias[i];

    const colunaM = abacoMinuendo.querySelector(
      `.column-visual[data-power="${pot}"]`
    );
    const colunaS = abacoSubtraendo.querySelector(
      `.column-visual[data-power="${pot}"]`
    );
    let bolasM = colunaM?.querySelectorAll(".ball") || [];
    let bolasS = colunaS?.querySelectorAll(".ball") || [];

    while (bolasM.length < bolasS.length) {
      let origemPot = pot + 1;
      let achou = false;

      while (origemPot <= Math.max(...potencias)) {
        const colunaOrigem = abacoMinuendo.querySelector(
          `.column-visual[data-power="${origemPot}"]`
        );
        const bolasOrigem = colunaOrigem?.querySelectorAll(".ball") || [];

        if (bolasOrigem.length > 0) {
          achou = true;
          await decomporAte(base, origemPot, pot);
          break;
        }

        origemPot++;
        await esperar(200); // espera curta entre casas vazias
      }

      if (!achou) {
        console.warn("⚠️ Não foi possível encontrar bolinha para empréstimo.");
        break; // evita loop infinito
      }

      // Atualiza contadores
      bolasM = colunaM?.querySelectorAll(".ball") || [];
      bolasS = colunaS?.querySelectorAll(".ball") || [];
    }
  }
}

async function executarAnimacaoVaiUm(bloco) {
  const base = parseInt(bloco.baseSelector.value);
  const colunasOrdenadas = [...bloco.columns].sort((a, b) => a.power - b.power);

  for (let i = 0; i < colunasOrdenadas.length; i++) {
    const { column, power } = colunasOrdenadas[i];
    const bolas = column.querySelectorAll(".ball");

    if (bolas.length >= base) {
      // 1. Piscar bolinhas
      bolas.forEach((ball) => ball.classList.add("piscando"));
      await esperar(2000);
      bolas.forEach((ball) => ball.classList.remove("piscando"));

      // 2. Remover base bolinhas
      for (let b = 0; b < base; b++) {
        bolas[b]?.remove();
      }

      // 3. Adicionar bolinha à esquerda
      let colunaEsquerda = bloco.columns.find((c) => c.power === power + 1);
      if (!colunaEsquerda) {
        // Criar nova coluna se não existir
        const novaColuna = bloco.createColumn(
          bloco.formatLabel(power + 1),
          power + 1
        );
        bloco.abacusContainer.insertBefore(
          novaColuna,
          bloco.abacusContainer.firstChild
        );
        bloco.columns.unshift({ column: novaColuna, power: power + 1 });
        colunaEsquerda = { column: novaColuna, power: power + 1 };
      }

      const novaBolinha = document.createElement("div");
      novaBolinha.className = "ball piscando";
      bloco.applyBallStyle(novaBolinha, power + 1);
      colunaEsquerda.column.appendChild(novaBolinha);

      await esperar(2000);
      novaBolinha.classList.remove("piscando");

      bloco.updateResult();

      // Recomeça o processo desde o início (recursão)
      return executarAnimacaoVaiUm(bloco);
    }
  }
}

async function executarAnimacaoVaiUmVisual(bloco) {
  const base = parseInt(bloco.baseSelector.value);
  const colunasOrdenadas = [...bloco.columns].sort((a, b) => a.power - b.power);

  for (let i = 0; i < colunasOrdenadas.length; i++) {
    const { column, power } = colunasOrdenadas[i];
    const bolas = Array.from(column.querySelectorAll(".ball"));

    if (bolas.length >= base) {
      // 🟥 Marca bolinhas que vão se transformar
      const bolinhasParaTransformar = bolas.slice(0, base);
      bolinhasParaTransformar.forEach((ball) => {
        ball.classList.add("bolinha-transformando"); // Esta classe agora só pisca (graças ao CSS)
      });

      column.classList.add("caixa-destacada"); // 👉 TOCA O SOM DE EXPLOSÃO (antes de remover as bolinhas)

      if (bloco.soundEnabled) {
        bloco.removeSound.pause();
        bloco.removeSound.currentTime = 0;
        bloco.removeSound.play();
      } //  GARANTE QUE COLUNA DESTINO EXISTE

      let destino = bloco.columns.find((c) => c.power === power + 1);
      if (!destino) {
        const novaColuna = bloco.createColumn(
          bloco.formatLabel(power + 1),
          power + 1
        );
        bloco.abacusContainer.insertBefore(
          novaColuna,
          bloco.abacusContainer.firstChild
        );
        destino = { column: novaColuna, power: power + 1 };
        bloco.columns.unshift(destino);
        console.log(`✅ Coluna ${power + 1} criada`);
      }

      mostrarSetaCurvaVisual(column, destino.column);
      await esperar(2000); // 🔄 Remove bolinhas antigas (explosão)

      bolinhasParaTransformar.forEach((ball) => ball.remove());
      column.classList.remove("caixa-destacada"); // ➕ Adiciona nova bolinha na próxima coluna com destaque

      const nova = document.createElement("div"); // ✅ CORREÇÃO 1: Usa a classe "bolinha-chegando" (que pisca só 2x)
      nova.className = "ball bolinha-chegando";
      bloco.applyBallStyle(nova, power + 1); // ✅ Isso agora vai definir a cor (ex: laranja)
      destino.column.appendChild(nova); // 👉 TOCA O SOM DE INSERÇÃO ao adicionar a nova bolinha

      if (bloco.soundEnabled) {
        bloco.addSound.pause();
        bloco.addSound.currentTime = 0;
        bloco.addSound.play();
      }

      destino.column.classList.add("caixa-destacada");

      await esperar(2000); // ✅ CORREÇÃO 2: Remove a classe de animação para parar o pisca-pisca

      nova.classList.remove("bolinha-chegando");
      destino.column.classList.remove("caixa-destacada");

      bloco.updateResult(); // 🌀 Recomeça para tratar outros possíveis "vai-um"

      return executarAnimacaoVaiUmVisual(bloco);
    }
  }
}

/**
 * Copia o estado (controles e bolinhas) de um bloco de origem para um bloco de destino.
 * Usado para passar o resultado agrupado do 'Bloco Animação' para o 'Bloco Final'.
 * @param {BaseNumberExplorer} blocoOrigem - O bloco do qual copiar.
 * @param {BaseNumberExplorer} blocoDestino - O bloco para o qual colar.
 */
async function copiarEstadoParaBlocoFinal(blocoOrigem, blocoDestino) {
  blocoDestino.baseSelector.value = blocoOrigem.baseSelector.value;
  blocoDestino.integerColumnSelector.value =
    blocoOrigem.integerColumnSelector.value;
  blocoDestino.decimalColumnSelector.value =
    blocoOrigem.decimalColumnSelector.value;

  blocoDestino.createAbacus();
  await esperar(50);

  const delay = 350;

  for (const { column: colOrigem, power } of blocoOrigem.columns) {
    const bolinhas = colOrigem.querySelectorAll(".ball");
    const colDestino = blocoDestino.columns.find(
      (c) => c.power === power
    )?.column;

    if (colDestino) {
      colDestino.classList.add("caixa-destacada");

      for (const bola of bolinhas) {
        const novaBola = document.createElement("div");
        novaBola.className = "ball";
        blocoDestino.applyBallStyle(novaBola, power);
        colDestino.appendChild(novaBola);

        // TOCA O SOM DE INSERÇÃO ao adicionar cada bolinha
        if (blocoDestino.soundEnabled) {
          blocoDestino.addSound.pause();
          blocoDestino.addSound.currentTime = 0;
          blocoDestino.addSound.play();
        }

        await esperar(delay);
      }

      colDestino.classList.remove("caixa-destacada");
    }
  }

  blocoDestino.updateResult();
}
/**
 * Anima o Bloco Final preenchendo-o com bolinhas (incluindo fracionárias)
 * com base em um valor decimal, uma bolinha de cada vez e com som.
 * @param {BaseNumberExplorer} blocoDestino - A instância do blocoFinal.
 * @param {number} valorDecimal - O resultado decimal da divisão (ex: 5 / 2 = 2.5).
 * @param {number} base - A base para a qual converter.
 * @param {number} intCols - O número de colunas inteiras (definido no Bloco Final).
 * @param {number} fracCols - O número de colunas fracionárias (definido no Bloco Final).
 */
async function animarResultadoDecimalNoBlocoFinal(
  blocoDestino,
  valorDecimal,
  base,
  intCols,
  fracCols
) {
  // 1. Configura o bloco de destino com os parâmetros corretos
  blocoDestino.baseSelector.value = base;
  blocoDestino.integerColumnSelector.value = intCols;
  blocoDestino.decimalColumnSelector.value = fracCols;
  blocoDestino.createAbacus(); // Limpa e constrói as colunas
  await esperar(50);

  // 2. Prepara a lógica de conversão
  let valorRestante = Math.abs(valorDecimal);
  blocoDestino.resultadoNegativo = valorDecimal < 0;

  // Pega todas as colunas (inteiras e fracionárias) ordenadas
  const colunasOrdenadas = [...blocoDestino.columns].sort(
    (a, b) => b.power - a.power // Da maior potência para a menor
  );

  // 3. Anima bolinha por bolinha
  for (const { column, power } of colunasOrdenadas) {
    // Calcula quantas bolinhas devem ir nesta coluna
    const valorDaCasa = Math.pow(base, power);
    // Usamos uma tolerância (1e-9) para evitar erros de ponto flutuante
    const quantidade = Math.floor(valorRestante / valorDaCasa + 1e-9);

    if (quantidade > 0) {
      // Subtrai o valor que acabamos de adicionar
      valorRestante -= quantidade * valorDaCasa;

      // Destaca a coluna que está sendo preenchida
      column.classList.add("caixa-destacada");

      // Adiciona cada bolinha individualmente
      for (let i = 0; i < quantidade; i++) {
        // (Não deve acontecer, mas previne que ultrapasse a base)
        if (i >= base) break;

        const novaBola = document.createElement("div");
        novaBola.className = "ball";
        blocoDestino.applyBallStyle(novaBola, power); // Aplica o estilo (cor ou SVG)

        // Estilos para animação de "fade-in"
        novaBola.style.opacity = "0";
        novaBola.style.transform = "scale(0.5)";
        novaBola.style.transition = "all 0.3s ease-out";

        column.appendChild(novaBola);

        // Toca o som de adicionar
        if (blocoDestino.soundEnabled) {
          blocoDestino.addSound.pause();
          blocoDestino.addSound.currentTime = 0;
          blocoDestino.addSound.play();
        }

        // Força a animação
        requestAnimationFrame(() => {
          novaBola.style.opacity = "1";
          novaBola.style.transform = "scale(1)";
        });

        await esperar(150); // Pausa entre cada bolinha
      }
      column.classList.remove("caixa-destacada");
      await esperar(100); // Pausa entre cada coluna
    }
  }

  // 4. Atualiza os textos (Polinômio, Base 10, etc.) no final
  blocoDestino.updateResult();
}

function mostrarSetaCurvaVisual(colunaOrigem, colunaDestino) {
  console.log("🚀 mostrarSetaCurvaVisual chamada");

  if (!colunaOrigem || !colunaDestino) {
    console.warn("❌ colunaOrigem ou colunaDestino inválidas");
    return;
  }

  requestAnimationFrame(() => {
    const svgNS = "http://www.w3.org/2000/svg";

    // Container principal como base de referência
    const container = document.querySelector(".container-bloco-final");
    const containerRect = container.getBoundingClientRect();

    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "seta-svg");
    svg.style.position = "absolute";
    svg.style.overflow = "visible";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "1000";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";

    // Calcula posições reais
    const origemRect = colunaOrigem.getBoundingClientRect();
    const destinoRect = colunaDestino.getBoundingClientRect();

    const xOrigem = origemRect.left + origemRect.width / 2 - containerRect.left;
    const yOrigem = origemRect.top - containerRect.top;

    const xDestino =
      destinoRect.left + destinoRect.width / 2 - containerRect.left;
    const yDestino = destinoRect.top - containerRect.top;

    // Encurta a seta mantendo a direção correta
    const encurtamento = 20;
    const angulo = Math.atan2(yDestino - yOrigem, xDestino - xOrigem);

    const x1 = xOrigem + Math.cos(angulo) * encurtamento;
    const y1 = yOrigem + Math.sin(angulo) * encurtamento;
    const x2 = xDestino - Math.cos(angulo) * encurtamento;
    const y2 = yDestino - Math.sin(angulo) * encurtamento;

    const ctrlX = (x1 + x2) / 2;
    const ctrlY = Math.min(y1, y2) - 30;

    // Cria marcador da ponta (menor)
    const idUnico = `arrowhead-${Date.now()}`;
    const defs = document.createElementNS(svgNS, "defs");
    const marker = document.createElementNS(svgNS, "marker");
    marker.setAttribute("id", idUnico);
    marker.setAttribute("markerWidth", "5");
    marker.setAttribute("markerHeight", "3.5");
    marker.setAttribute("refX", "0");
    marker.setAttribute("refY", "1.75");
    marker.setAttribute("orient", "auto");
    marker.setAttribute("markerUnits", "strokeWidth");

    const arrow = document.createElementNS(svgNS, "polygon");
    arrow.setAttribute("points", "0 0, 5 1.75, 0 3.5");
    arrow.setAttribute("fill", "#007bff");

    marker.appendChild(arrow);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Desenha a curva
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", `M ${x1} ${y1} Q ${ctrlX} ${ctrlY}, ${x2} ${y2}`);
    path.setAttribute("stroke", "#007bff");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("fill", "none");
    path.setAttribute("marker-end", `url(#${idUnico})`);
    path.style.animation = "piscarSetaSVG 1s infinite ease-in-out";

    svg.appendChild(path);

    // Debug
    console.log("✅ Adicionando seta ao container");
    console.log("📍 Origem:", x1, y1, "→ Destino:", x2, y2);

    container.appendChild(svg);

    // Remove depois de 3.5 segundos
    setTimeout(() => svg.remove(), 3500);
  });
}

function prepararVisualSubtracaoEmpilhada() {
  const colunas = document.querySelectorAll(
    "#blocoSubtracaoVisual .column-visual"
  );

  colunas.forEach((coluna) => {
    const bolinhas = coluna.querySelectorAll(".ball, .meia-bolinha");
    const totalBolinhas = bolinhas.length;

    // Estilo de 2 colunas
    coluna.classList.add("subtracao");

    // Ajusta altura conforme a quantidade de bolinhas (2 por linha)
    const linhas = Math.ceil(totalBolinhas / 2);
    const altura = linhas * 28 + 10; // altura aproximada por linha + padding
  });
}
function limparVisualSubtracaoEmpilhada() {
  const colunas = document.querySelectorAll(
    "#blocoSubtracaoVisual .column-visual.subtracao"
  );

  colunas.forEach((coluna) => {
    coluna.classList.remove("subtracao");
    coluna.style.removeProperty("height");
  });
}

function limparVisualMultiplicacao() {
  const blocoVisual = document.getElementById("blocoMultiplicacaoVisual");
  const container = document.getElementById("containerMultiplicacaoVisual");

  blocoVisual.style.display = "none";
  container.innerHTML = "";

  document.body.classList.remove("modo-multiplicacao"); // ✅ remove classe
}

/**
 * Zera TODOS os containers de animação visual (Subtração, Multiplicação, Divisão e Produto Parcial)
 * para garantir que a próxima operação comece do zero.
 */
function limparTodasAnimacoesVisuais() {
  console.log("Limpeza geral de animações iniciada.");

  // 1. Limpa Subtração
  const visualSubtracao = document.getElementById("blocoSubtracaoVisual");
  if (visualSubtracao) {
    visualSubtracao.style.display = "none";
    limparVisualSubtracaoEmpilhada(); // (Função que você já tem)

    const abacoMinuendo = document.getElementById("abacoMinuendo");
    const abacoSubtraendo = document.getElementById("abacoSubtraendo");
    const abacoDiferenca = document.getElementById("abacoDiferenca");

    if (abacoMinuendo) abacoMinuendo.innerHTML = "";
    if (abacoSubtraendo) abacoSubtraendo.innerHTML = "";
    if (abacoDiferenca) abacoDiferenca.innerHTML = "";
  }

  // 2. Limpa Multiplicação E Divisão (ambos usam o mesmo container)
  const blocoMultiplicacao = document.getElementById(
    "blocoMultiplicacaoVisual"
  );
  const containerMultiplicacao = document.getElementById(
    "containerMultiplicacaoVisual"
  );

  if (blocoMultiplicacao) {
    blocoMultiplicacao.style.display = "none";
  }
  // Limpa o container interno, SEM destruir o elemento
  if (containerMultiplicacao) {
    containerMultiplicacao.innerHTML = "";
    // Reseta estilos que a divisão pode ter bagunçado
    containerMultiplicacao.style.flexDirection = "column";
    containerMultiplicacao.style.gap = "20px";
  }

  // 3. Limpa Produto Parcial (Soma da Multiplicação)
  const blocoSomaParcial = document.getElementById(
    "blocoMultiplicacaoSomaParcial"
  );
  const containerSomaParcial = document.getElementById(
    "containerMultiplicacaoSomaParcial"
  );

  if (blocoSomaParcial) {
    blocoSomaParcial.style.display = "none";
  }
  if (containerSomaParcial) {
    containerSomaParcial.innerHTML = "";
  }
  // Remove a linha de resultado final se ela existir
  const linhaFinal = document.getElementById("linhaResultadoFinal");
  if (linhaFinal) {
    linhaFinal.remove();
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const operacaoSelect = document.getElementById("operacaoSelect");

  function atualizarClasseOperacao(operacao) {
    document.body.classList.remove(
      "modo-subtracao",
      "modo-multiplicacao",
      "modo-divisao"
    );

    if (operacao === "subtracao") {
      document.body.classList.add("modo-subtracao");
    } else if (operacao === "multiplicacao") {
      document.body.classList.add("modo-multiplicacao");
    } else if (operacao === "divisao") {
      document.body.classList.add("modo-divisao");
    }
  }

  operacaoSelect.addEventListener("change", function () {
    atualizarClasseOperacao(operacaoSelect.value);
  });

  // Aplica a classe correta ao carregar
  atualizarClasseOperacao(operacaoSelect.value);
});

function prepararColunasDiferencaComVirgula() {
  const abacoMinuendo = document.querySelectorAll(
    "#abacoMinuendo .column-visual"
  );
  const abacoDiferenca = document.getElementById("abacoDiferenca");

  abacoDiferenca.innerHTML = "";

  const potencias = Array.from(abacoMinuendo).map((col) =>
    parseFloat(col.dataset.power)
  );
  const temVirgula = potencias.some((p) => p < 0);
  const indexUltimaInteira = potencias.findIndex((p) => p < 0);

  abacoMinuendo.forEach((col, i) => {
    const novaCol = document.createElement("div");
    novaCol.className = "column-visual subtracao";
    novaCol.dataset.power = col.dataset.power;
    abacoDiferenca.appendChild(novaCol);

    //  Insere vírgula após a última potência positiva
    if (temVirgula && i === indexUltimaInteira - 1) {
      const virgula = document.createElement("div");
      virgula.className = "comma-separator";
      virgula.textContent = ",";
      abacoDiferenca.appendChild(virgula);
    }
  });
}

async function animarDiferencaColunaPorColuna() {
  const colunasMinuendo = document.querySelectorAll(
    "#abacoMinuendo .column-visual"
  );
  const colunasSubtraendo = document.querySelectorAll(
    "#abacoSubtraendo .column-visual"
  );
  const colunasDiferenca = document.querySelectorAll(
    "#abacoDiferenca .column-visual"
  );

  const total = colunasMinuendo.length;

  for (let i = total - 1; i >= 0; i--) {
    const colMin = colunasMinuendo[i];
    const colSub = colunasSubtraendo[i];
    const colDif = colunasDiferenca[i];

    if (!colMin || !colSub || !colDif) continue;

    const bolasMin = Array.from(
      colMin.querySelectorAll(".ball, .meia-bolinha")
    );
    const bolasSub = Array.from(
      colSub.querySelectorAll(".ball, .meia-bolinha")
    );

    //  Destacar as 3 colunas
    colMin.classList.add("caixa-destacada");
    colSub.classList.add("caixa-destacada");
    colDif.classList.add("caixa-destacada");

    colDif.innerHTML = ""; // limpa antes

    const pares = Math.min(bolasMin.length, bolasSub.length);

    //  Cancela bolinha por bolinha (azul + explode)
    for (let j = 0; j < pares; j++) {
      const bMin = bolasMin[j];
      const bSub = bolasSub[j];

      if (!bMin || !bSub) continue;

      //  Piscar em azul
      bMin.classList.add("bolinha-azul");
      bSub.classList.add("bolinha-azul");

      await esperar(400);

      //  Remove animação azul
      bMin.classList.remove("bolinha-azul");
      bSub.classList.remove("bolinha-azul");

      //  Aplica classe de bolinha apagada/fantasma (sem remover)
      bMin.classList.add("cancelada");
      bSub.classList.add("cancelada");

      //  Som de remoção/cancelamento (sempre que cancela par)
      if (blocoResultado.soundEnabled) {
        blocoResultado.removeSound.pause();
        blocoResultado.removeSound.currentTime = 0;
        blocoResultado.removeSound.play();
      }

      await esperar(200);
    }

    //  Sobra no minuendo → vai para o resultado
    const restantes = Array.from(
      colMin.querySelectorAll(
        ".ball:not(.cancelada), .meia-bolinha:not(.cancelada)"
      )
    );

    const power = colMin.dataset.power;

    if (restantes.length > 0) {
      //  Mostrar seta visual
      mostrarSetaCurvaVisual(colMin, colDif);

      await esperar(300);

      for (let k = 0; k < restantes.length; k++) {
        const original = restantes[k];
        const clone = original.cloneNode(true);
        clone.classList.add("bolinha-diferenca");

        // animação entrada
        clone.style.opacity = "0";
        clone.style.transform = "translateY(-10px)";
        clone.style.transition = "all 0.4s ease";

        colDif.appendChild(clone);

        //  Som de inserção de bolinha da diferença (sempre que entra no resultado)
        if (blocoResultado.soundEnabled) {
          blocoResultado.addSound.pause();
          blocoResultado.addSound.currentTime = 0;
          blocoResultado.addSound.play();
        }

        requestAnimationFrame(() => {
          setTimeout(() => {
            clone.style.opacity = "1";
            clone.style.transform = "translateY(0)";
          }, 10);
        });

        await esperar(120);
      }
    }

    await esperar(500);

    colMin.classList.remove("caixa-destacada");
    colSub.classList.remove("caixa-destacada");
    colDif.classList.remove("caixa-destacada");

    await esperar(300);
  }
}

document
  .getElementById("botaoVerDiferenca")
  .addEventListener("click", async () => {
    const destino = document.getElementById("abacoDiferenca");
    const linhaDiferenca = document.getElementById("linhaDiferenca");

    //  Limpa visual anterior
    destino.innerHTML = "";

    //  Cria as colunas da diferença com vírgula
    prepararColunasDiferencaComVirgula();

    //  Exibe linha de diferença
    destino.style.display = "flex";
    linhaDiferenca.style.display = "flex";

    //  Esconde botão após clique
    document.getElementById("botaoVerDiferenca").style.display = "none";

    // ▶ Executa animação visual passo a passo
    await animarDiferencaColunaPorColuna();
  });
/**
 * Junta visualmente as bolinhas dos blocos 1 e 2 no bloco de resultado.
 * Esta é a primeira etapa da animação da adição, mostrando o agrupamento
 * antes de executar a lógica do "vai-um".
 */
async function agruparBolinhasParaAdicao() {
  // Garante que o bloco de resultado use a mesma base dos blocos de entrada.
  const base = parseInt(bloco1.baseSelector.value);
  blocoResultado.baseSelector.value = base;

  // Determina o número de colunas necessárias (pega o máximo entre os dois blocos)
  const intCols = Math.max(
    parseInt(bloco1.integerColumnSelector.value),
    parseInt(bloco2.integerColumnSelector.value)
  );
  const fracCols = Math.max(
    parseInt(bloco1.decimalColumnSelector.value),
    parseInt(bloco2.decimalColumnSelector.value)
  );

  blocoResultado.integerColumnSelector.value = intCols;
  blocoResultado.decimalColumnSelector.value = fracCols;

  // Recria o ábaco do resultado com as dimensões corretas e limpo
  blocoResultado.createAbacus();
  await esperar(100); // Pequena pausa para garantir a renderização

  const blocosFonte = [bloco1, bloco2];

  // Para cada bloco de origem (bloco1, bloco2)
  for (const blocoFonte of blocosFonte) {
    // Itera sobre cada coluna do bloco de origem
    for (const { column: colunaFonte, power } of blocoFonte.columns) {
      const bolinhas = colunaFonte.querySelectorAll(".ball");
      const colunaDestino = blocoResultado.columns.find(
        (c) => c.power === power
      )?.column;

      if (colunaDestino && bolinhas.length > 0) {
        // Para cada bolinha na coluna de origem, adiciona uma nova no destino
        for (let i = 0; i < bolinhas.length; i++) {
          const novaBolinha = document.createElement("div");
          novaBolinha.className = "ball";
          blocoResultado.applyBallStyle(novaBolinha, power);

          // Animação de entrada da bolinha
          novaBolinha.style.opacity = "0";
          novaBolinha.style.transform = "scale(0.5)";
          novaBolinha.style.transition = "all 0.3s ease-out";

          colunaDestino.appendChild(novaBolinha);

          //  TOCA O SOM ao inserir cada bolinha
          if (blocoResultado.soundEnabled) {
            blocoResultado.addSound.pause();
            blocoResultado.addSound.currentTime = 0;
            blocoResultado.addSound.play();
          }

          // Força a animação a ser visível
          requestAnimationFrame(() => {
            novaBolinha.style.opacity = "1";
            novaBolinha.style.transform = "scale(1)";
          });

          await esperar(80); // Adiciona as bolinhas uma a uma
        }
      }
    }
  }
  // Atualiza os contadores e os textos do bloco de resultado
  blocoResultado.updateResult();
  document.querySelector(".bloco-resultado").style.display = "block";
}

function criarResultadoParcialComBolinhas(numeroDecimal, base, deslocamento) {
  const container = document.createElement("div");
  container.className = "abacus-container resultado-com-bolinhas";
  container.style.display = "flex";
  container.style.gap = "10px";

  // Convertemos o número inteiro SEM respeitar a base
  let valorRestante = numeroDecimal;

  // Mostra no máximo 12 colunas (opcional)
  const maxColunas = 12;

  for (let i = 0; i < maxColunas && valorRestante > 0; i++) {
    const coluna = document.createElement("div");
    coluna.className = "column";

    const fator = Math.pow(base, i + deslocamento); // potência real da base
    const qtd = Math.floor(valorRestante % base); // NÃO agrupa, só pega o valor direto

    //  Em vez de agrupar, só mostra quantas bolinhas precisa
    const totalBolas = Math.floor(valorRestante / fator);

    for (let j = 0; j < totalBolas; j++) {
      const bolinha = document.createElement("div");
      bolinha.className = "ball";
      bolinha.style.backgroundColor = "#FFA500";
      coluna.appendChild(bolinha);
    }

    container.insertBefore(coluna, container.firstChild);

    valorRestante -= totalBolas * fator;
  }

  return container;
}

function converterParaBase(decimal, base) {
  return decimal.toString(base).toUpperCase();
}

async function mostrarMultiplicacaoVisualCompleta() {
  document.body.classList.add("modo-multiplicacao");

  const blocoVisual = document.getElementById("blocoMultiplicacaoVisual");
  const container = document.getElementById("containerMultiplicacaoVisual");
  container.innerHTML = "";
  blocoVisual.style.display = "block";

  const base = parseInt(bloco1.baseSelector.value);
  const resultadoParcialFinal = [];

  const mapaColunas = new Map();
  for (const { column, power } of bloco2.columns) {
    const bolas = column.querySelectorAll(".ball");
    mapaColunas.set(power, (mapaColunas.get(power) || 0) + bolas.length);
  }

  const colunasMultiplicador = Array.from(mapaColunas.entries()).sort(
    (a, b) => a[0] - b[0]
  );
  const colunasMultiplicando = [...bloco1.columns].sort(
    (a, b) => b.power - a.power
  );

  for (let index = 0; index < colunasMultiplicador.length; index++) {
    const [expoenteMultiplicador, qtdBolasMultiplicador] =
      colunasMultiplicador[index];

    // ➕ Container principal da linha completa (cabeçalho + resultado)
    const linha = document.createElement("div");
    linha.className = "bloco-multiplicacao-linha";
    linha.style.display = "flex";
    linha.style.flexDirection = "column";
    linha.style.gap = "8px";

    // ➕ Cabeçalho: Bloco1 × Bloco2 =
    const cabecalho = document.createElement("div");
    cabecalho.className = "cabecalho-linha";
    cabecalho.style.display = "flex";
    cabecalho.style.flexWrap = "wrap";
    cabecalho.style.alignItems = "center";
    cabecalho.style.gap = "20px";

    const bloco1Clone = bloco1.abacusContainer.cloneNode(true);
    bloco1Clone.style.pointerEvents = "none";

    const sinalMultiplicacao = document.createElement("div");
    sinalMultiplicacao.className = "sinal-multiplicacao";
    sinalMultiplicacao.textContent = "×";

    const bloco2Visual = criarBloco2MultiplicadorVisual(expoenteMultiplicador);

    const sinalIgualdade = document.createElement("div");
    sinalIgualdade.className = "sinal-igual";
    sinalIgualdade.textContent = "=";

    cabecalho.appendChild(bloco1Clone);
    cabecalho.appendChild(sinalMultiplicacao);
    cabecalho.appendChild(bloco2Visual);
    cabecalho.appendChild(sinalIgualdade);

    // ➕ Resultado: linha separada
    const resultadoContainer = document.createElement("div");
    resultadoContainer.className = "resultado-parcial-container";
    resultadoContainer.style.display = "flex";
    resultadoContainer.style.flexDirection = "row";
    resultadoContainer.style.alignItems = "flex-end";
    resultadoContainer.style.gap = "6px";
    resultadoContainer.style.flexWrap = "wrap";

    const colunasParciais = [];

    for (let colIndex = 0; colIndex < colunasMultiplicando.length; colIndex++) {
      const { column: colunaMultiplicando } = colunasMultiplicando[colIndex];

      const qtdBolasMultiplicando =
        colunaMultiplicando.querySelectorAll(".ball").length;
      const resultadoParcial = qtdBolasMultiplicando * qtdBolasMultiplicador;

      const potenciaResultado =
        parseInt(colunaMultiplicando.dataset.power) + expoenteMultiplicador;

      resultadoParcialFinal[potenciaResultado] =
        (resultadoParcialFinal[potenciaResultado] || 0) + resultadoParcial;

      const colunaVisual = document.createElement("div");
      colunaVisual.className = "column";

      //  Mostra o resultado mesmo quando é zero
      if (resultadoParcial > 9) {
        const aviso = document.createElement("div");
        aviso.textContent = `${resultadoParcial} bolinhas`;
        aviso.className = "aviso-bolinhas";
        colunaVisual.appendChild(aviso);
      } else if (resultadoParcial > 0) {
        for (let i = 0; i < resultadoParcial; i++) {
          const bolinha = document.createElement("div");
          bolinha.className = `ball pos-${colIndex}`;
          colunaVisual.appendChild(bolinha);
        }
      } else {
        //  Linha com zero bolinhas
        const avisoZero = document.createElement("div");
        avisoZero.textContent = `0 bolinhas`;
        avisoZero.className = "aviso-bolinhas";
        colunaVisual.appendChild(avisoZero);
      }

      colunasParciais.push(colunaVisual);
    }

    //  Caixas vazias ao final, para alinhamento
    for (let i = 0; i < index; i++) {
      const caixaVazia = document.createElement("div");
      caixaVazia.classList.add("column", "caixa-vazia");
      colunasParciais.push(caixaVazia);
    }

    colunasParciais.forEach((coluna) => resultadoContainer.appendChild(coluna));

    //  Monta tudo na linha principal
    linha.appendChild(cabecalho);
    linha.appendChild(resultadoContainer);

    container.appendChild(linha);
    //  INÍCIO DA CORREÇÃO DE SOM
    // Toca o som de "adicionar bloco"
    if (blocoResultado.soundEnabled) {
      blocoResultado.addSound.pause();
      blocoResultado.addSound.currentTime = 0;
      blocoResultado.addSound.play();
    }
    //  FIM DA CORREÇÃO DE SOM

    await esperar(500);
  }

  await esperar(300);
  await mostrarEtapa2MultiplicacaoComoCloneVisual();
  await mostrarBlocoDeSomaDasEtapas();

  const resultadoParcialLimpo = resultadoParcialFinal.map((v) => v || 0);
  await mostrarEtapa2Multiplicacao(resultadoParcialLimpo, base);
}

function calcularTotaisProdutoParcial() {
  const colunasResultado = document.querySelectorAll(
    "#linhaResultadoFinal .column"
  );
  if (!colunasResultado.length) {
    console.warn(
      "A linha de resultado final do produto parcial não foi encontrada ou está vazia."
    );
    return [];
  }

  const totais = [];

  colunasResultado.forEach((coluna) => {
    let totalNaColuna = 0;

    // Prioridade 1: Procurar pelo texto "X bolinhas"
    const aviso = coluna.querySelector(".aviso-bolinhas-final");
    if (aviso) {
      const match = aviso.textContent.match(/(\d+)/); // Extrai o número do texto
      if (match) {
        totalNaColuna = parseInt(match[1], 10);
      }
    } else {
      // Prioridade 2: Se não houver texto, contar as bolinhas
      totalNaColuna = coluna.querySelectorAll(".ball").length;
    }

    totais.push(totalNaColuna);
  });

  console.log("Totais calculados do Produto Parcial:", totais);
  return totais;
}

function criarBloco2MultiplicadorVisual(expoenteAlvo) {
  const container = document.createElement("div");
  container.className = "abacus-container multiplicador-vermelho";
  container.style.display = "flex";
  container.style.gap = "10px";

  const casasInt = bloco2.integerColumns;
  const casasFrac = bloco2.decimalColumns;

  for (let i = casasInt - 1; i >= -casasFrac; i--) {
    //  INSERE vírgula ANTES da coluna -1
    if (i === -1) {
      const virgula = document.createElement("div");
      virgula.className = "comma-separator";
      virgula.textContent = ",";
      container.appendChild(virgula);
    }

    const coluna = document.createElement("div");
    coluna.className = "column";
    coluna.dataset.power = i;
    coluna.style.height = `calc(50px * (${bloco2.base - 1} + 1) + 20px)`;

    const label = document.createElement("div");
    label.className = "column-label";
    label.textContent = bloco2.formatLabel(i);
    coluna.appendChild(label);

    let count = 0;

    if (i === expoenteAlvo) {
      const original = bloco2.columns.find((c) => c.power === i);
      if (original?.column) {
        const bolas = original.column.querySelectorAll(".ball, .meia-bolinha");
        count = bolas.length;
        bolas.forEach((b) => {
          const copia = b.cloneNode(true);
          copia.style.pointerEvents = "none";
          coluna.appendChild(copia);
        });
      }
    }

    const contador = document.createElement("div");
    contador.className = "column-count";
    contador.textContent = count.toString();
    coluna.appendChild(contador);

    container.appendChild(coluna);
  }

  return container; // fecha corretamente a função
}

async function animarResultadoMultiplicacaoParcial(
  container,
  valorDecimal,
  base
) {
  container.innerHTML = ""; // Limpa o container

  // Determina a estrutura do ábaco de resultado
  const maiorPotInteira =
    valorDecimal >= 1
      ? Math.floor(Math.log(valorDecimal) / Math.log(base))
      : -1;
  const numCasasInt = Math.max(bloco1.integerColumns, maiorPotInteira + 1);
  const numCasasFrac = Math.max(bloco1.decimalColumns, 4); // Mostra pelo menos 4 casas frac.

  let valorRestante = valorDecimal;

  // Cria as colunas (da maior para a menor potência)
  for (let i = numCasasInt - 1; i >= -numCasasFrac; i--) {
    // Insere a vírgula
    if (i === -1) {
      const virgula = document.createElement("div");
      virgula.className = "comma-separator";
      virgula.textContent = ",";
      container.appendChild(virgula);
    }

    const coluna = document.createElement("div");
    coluna.className = "column";
    coluna.dataset.power = i;
    coluna.style.height = `calc(50px * (${bloco1.base - 1} + 1) + 20px)`;

    const label = document.createElement("div");
    label.className = "column-label";
    label.textContent = bloco1.formatLabel(i);
    coluna.appendChild(label);

    const countLabel = document.createElement("div");
    countLabel.className = "column-count";
    countLabel.textContent = "0";
    coluna.appendChild(countLabel);

    container.appendChild(coluna);

    const valorDaCasa = Math.pow(base, i);
    const quantidadeBolinhas = Math.floor(valorRestante / valorDaCasa + 1e-9);

    if (quantidadeBolinhas > 0) {
      valorRestante -= quantidadeBolinhas * valorDaCasa;

      for (let j = 0; j < quantidadeBolinhas; j++) {
        const bola = document.createElement("div");
        bola.className = "ball bolinha-resultado-multiplicacao";
        bloco1.applyBallStyle(bola, i);
        coluna.appendChild(bola);

        await esperar(100);
      }
      countLabel.textContent = quantidadeBolinhas;
    }
  }
}

async function mostrarBlocoDeSomaDasEtapas() {
  const container = document.getElementById(
    "containerMultiplicacaoSomaParcial"
  );
  container.innerHTML = "";

  const linhas = document.querySelectorAll(".bloco-multiplicacao-linha");

  linhas.forEach((linha) => {
    const resultadoParcial = linha.querySelector(
      ".resultado-parcial-container"
    );
    if (!resultadoParcial) return;

    const linhaEmpilhada = document.createElement("div");
    linhaEmpilhada.className = "linha-resultado-parcial";
    linhaEmpilhada.style.display = "flex";
    linhaEmpilhada.style.gap = "8px";

    const colunas = resultadoParcial.querySelectorAll(".column");

    colunas.forEach((colunaOriginal, indiceNaLinha) => {
      const colunaClonada = colunaOriginal.cloneNode(true);

      const posDaDireita = colunas.length - indiceNaLinha - 1;

      //  Colorir bolinhas, mas também lidar com aviso de texto
      const bolas = colunaClonada.querySelectorAll(".ball");
      if (bolas.length > 0) {
        bolas.forEach((bola) => {
          const cor =
            bloco1.powersColors[posDaDireita % bloco1.powersColors.length];
          bola.style.backgroundColor = cor;
        });
      } else {
        // Se não tem bolinhas, mas tem aviso de texto, adiciona uma cor
        const aviso = colunaClonada.querySelector(".aviso-bolinhas");
        if (aviso) {
          aviso.style.color =
            bloco1.powersColors[posDaDireita % bloco1.powersColors.length];
        }
      }

      linhaEmpilhada.appendChild(colunaClonada);
    });

    container.appendChild(linhaEmpilhada);
  });

  document.getElementById("blocoMultiplicacaoSomaParcial").style.display =
    "block";
}

async function mostrarEtapa2MultiplicacaoComoCloneVisual() {
  const containerOriginal = document.getElementById(
    "containerMultiplicacaoVisual"
  );
  if (!containerOriginal) {
    console.warn("❌ containerMultiplicacaoVisual não encontrado.");
    return;
  }

  const containerClonado = containerOriginal.cloneNode(true);
  containerClonado.removeAttribute("id");

  containerClonado.style.opacity = "0.5";
  containerClonado.style.transform = "scale(0.95)";
  containerClonado.style.marginBottom = "20px";

  const containerSoma = document.getElementById(
    "containerMultiplicacaoSomaParcial"
  );
  if (!containerSoma) {
    console.warn("❌ containerMultiplicacaoSomaParcial não encontrado.");
    return;
  }

  containerSoma.prepend(containerClonado);
}

async function animarSomaParcialPorColuna() {
  const containerSoma = document.getElementById(
    "containerMultiplicacaoSomaParcial"
  );
  if (!containerSoma) {
    console.warn("❌ containerMultiplicacaoSomaParcial não encontrado.");
    return;
  }

  // 🔥 Remove visual anterior
  const cloneVisual = containerSoma.querySelector(
    ":scope > div:not(.linha-resultado-parcial)"
  );
  if (cloneVisual) cloneVisual.remove();

  //  Remove linha final antiga (se existir)
  let resultadoFinal = document.getElementById("linhaResultadoFinal");
  if (resultadoFinal) resultadoFinal.remove();

  // 🔧 Cria nova linha final
  resultadoFinal = document.createElement("div");
  resultadoFinal.id = "linhaResultadoFinal";
  resultadoFinal.className = "linha-resultado-final";
  resultadoFinal.style.display = "flex";
  resultadoFinal.style.justifyContent = "flex-end";
  resultadoFinal.style.alignItems = "flex-end";
  resultadoFinal.style.gap = "9.5px";
  resultadoFinal.style.marginTop = "20px";

  const botao = document.getElementById("botaoAnimarProdutoParcial");
  botao.parentNode.insertBefore(resultadoFinal, botao.nextSibling);

  //  Coleta as linhas parciais
  const linhas = containerSoma.querySelectorAll(".linha-resultado-parcial");
  if (!linhas.length) {
    console.warn("❌ Nenhuma linha de resultado parcial encontrada.");
    return;
  }
  //  Determina a maior quantidade de colunas
  let maxColunas = 0;
  linhas.forEach((linha) => {
    const n = linha.querySelectorAll(".column").length;
    maxColunas = Math.max(maxColunas, n);
  });

  //  Preenche colunas faltantes à esquerda
  linhas.forEach((linha) => {
    const qtd = linha.querySelectorAll(".column").length;
    const faltam = maxColunas - qtd;
    for (let i = 0; i < faltam; i++) {
      const vazio = document.createElement("div");
      vazio.className = "column caixa-vazia";
      linha.prepend(vazio);
    }
  });

  //  Coleta as bolinhas por coluna
  const coresPorColuna = Array.from({ length: maxColunas }, () => []);

  linhas.forEach((linha) => {
    const colunas = linha.querySelectorAll(".column");
    colunas.forEach((coluna, idx) => {
      const balls = coluna.querySelectorAll(".ball");
      if (balls.length) {
        balls.forEach((ball) => {
          const cor = ball.style.backgroundColor || "#ffa500";
          coresPorColuna[idx].push(cor);
        });
      } else {
        const aviso = coluna.querySelector(
          ".aviso-bolinhas, .quantidade-texto"
        );
        if (aviso) {
          const texto = aviso.textContent.trim();
          coresPorColuna[idx].push({ tipo: "texto", valor: texto });
        }
      }
    });
  });

  //  Constrói linha final da direita para a esquerda
  for (let i = coresPorColuna.length - 1; i >= 0; i--) {
    const cores = coresPorColuna[i];

    // Cria a coluna final
    const colunaFinal = document.createElement("div");
    colunaFinal.className = "column";
    resultadoFinal.prepend(colunaFinal); // direita p/ esquerda

    //  Coleta colunas acima na mesma posição
    const colunasAcima = Array.from(linhas).map(
      (linha) => linha.querySelectorAll(".column")[i]
    );

    //  Piscar todas as colunas (acima + final)
    colunaFinal.classList.add("piscar-coluna");
    colunasAcima.forEach((coluna) => coluna?.classList.add("piscar-coluna"));

    await esperar(2000); // espera 2s

    colunaFinal.classList.remove("piscar-coluna");
    colunasAcima.forEach((coluna) => coluna?.classList.remove("piscar-coluna"));

    //  Processa o conteúdo
    let totalBolinhas = 0;
    let temAvisoTexto = false;

    cores.forEach((item) => {
      if (typeof item === "object" && item.tipo === "texto") {
        const match = item.valor.match(/\d+/);
        if (match) totalBolinhas += parseInt(match[0]);
        temAvisoTexto = true;
      } else {
        totalBolinhas += 1;
      }
    });

    //  Se passar de 9 bolinhas, mostrar como texto
    if (totalBolinhas > 9 || temAvisoTexto) {
      const aviso = document.createElement("div");
      aviso.className = "aviso-bolinhas-final";
      aviso.textContent = `${totalBolinhas} bolinhas`;
      colunaFinal.appendChild(aviso);
      colunaFinal.style.justifyContent = "center";
      colunaFinal.style.alignItems = "center";
    } else {
      for (let j = 0; j < cores.length; j++) {
        if (typeof cores[j] !== "object") {
          const bolinha = document.createElement("div");
          bolinha.className = "ball";
          bolinha.style.backgroundColor = cores[j];
          colunaFinal.appendChild(bolinha);
          await esperar(80);
        }
      }
    }
  }
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function animarProdutoParcialComTotais(totais) {
  const resultadoFinal = document.getElementById("linhaResultadoFinal");
  resultadoFinal.innerHTML = ""; // limpa resultado anterior

  for (let i = totais.length - 1; i >= 0; i--) {
    // direita → esquerda
    const total = totais[i];

    const coluna = document.createElement("div");
    coluna.className = "column resultado-animado";

    //  Anima bolinhas reais se <=9, senão mostra texto com total
    if (total <= 9) {
      for (let j = 0; j < total; j++) {
        const bola = document.createElement("div");
        bola.className = "ball";
        bola.style.opacity = "0";
        coluna.appendChild(bola);

        // anima a bolinha individualmente
        requestAnimationFrame(() => {
          bola.style.transition = "opacity 0.4s";
          bola.style.opacity = "1";
        });
        await esperar(80);
      }
    } else {
      const texto = document.createElement("div");
      texto.className = "quantidade-texto";
      texto.textContent = `${total} bolinhas`;
      coluna.appendChild(texto);
    }

    //  Destaca coluna atual com classe para efeito visual (opcional)
    coluna.classList.add("destacada");
    resultadoFinal.appendChild(coluna);

    await esperar(400); // pausa entre colunas
    coluna.classList.remove("destacada");
  }
}

/**
 * Anima o processo de "vai-um" de forma iterativa, com movimento direto
 * e explosão no destino. VERSÃO FINAL.
 * @param {BaseNumberExplorer} bloco - A instância do bloco a ser animada.
 */
async function animarVaiUmInterativo(bloco) {
  const base = bloco.base;
  let colunasElements = bloco.columns.map((c) => c.column);

  let valores = colunasElements.map((col) => {
    const contador = col.querySelector(".contador-bolinhas");
    return contador
      ? parseInt(contador.textContent, 10)
      : col.querySelectorAll(".ball").length;
  });

  for (let i = valores.length - 1; i >= 0; i--) {
    while (valores[i] >= base) {
      if (i === 0) {
        const novaPotencia = bloco.columns[0].power + 1;
        const novaColunaEl = bloco.createColumn(
          bloco.formatLabel(novaPotencia),
          novaPotencia
        );
        bloco.abacusContainer.prepend(novaColunaEl);
        const novaColunaObj = { column: novaColunaEl, power: novaPotencia };
        bloco.columns.unshift(novaColunaObj);

        colunasElements.unshift(novaColunaEl);
        valores.unshift(0);
        i = 1; // Ajusta o índice para processar a nova coluna se necessário
      }

      const colunaAtual = colunasElements[i];
      const colunaEsquerda = colunasElements[i - 1]; // Coluna de destino para o +1

      colunaAtual.classList.add("caixa-destacada");
      colunaEsquerda.classList.add("caixa-destacada");

      const contador = colunaAtual.querySelector(".contador-bolinhas");
      if (contador) contador.classList.add("processando-numero");

      //  NOVO: PISCAR E MUDAR DE COR AS BOLINHAS QUE IRÃO "EXPLODIR"
      const bolinhasNaColunaAtual = Array.from(
        colunaAtual.querySelectorAll(".ball")
      );
      // Seleciona as primeiras 'base' bolinhas para piscar
      const bolinhasParaExplodir = bolinhasNaColunaAtual.slice(0, base);

      bolinhasParaExplodir.forEach((b) =>
        b.classList.add("bolinha-vai-um-piscar")
      );

      await esperar(800); // Espera um pouco para o piscar antes da animação

      // --- LÓGICA DE ANIMAÇÃO DIRETA (SEM TRANSFORM) ---
      const vaiUmElemento = document.createElement("div");
      vaiUmElemento.className = "vai-um-animado";
      vaiUmElemento.textContent = "+1";
      document.body.appendChild(vaiUmElemento);

      if (bloco.soundEnabled) {
        bloco.removeSound.pause();
        bloco.removeSound.currentTime = 0;
        bloco.removeSound.play();
      }

      const rectAtual = colunaAtual.getBoundingClientRect();
      const rectEsquerda = colunaEsquerda.getBoundingClientRect();

      const startX = rectAtual.left + rectAtual.width / 2;
      const startY = rectAtual.top + rectAtual.height / 2;
      const targetX = rectEsquerda.left + rectEsquerda.width / 2;
      const targetY = rectEsquerda.top + rectEsquerda.height / 2;

      // Remove as bolinhas que "explodiram" (visualmente antes do contador)
      bolinhasParaExplodir.forEach((b) => b.remove());

      vaiUmElemento.style.left = `${startX - vaiUmElemento.offsetWidth / 2}px`;
      vaiUmElemento.style.top = `${startY - vaiUmElemento.offsetHeight / 2}px`;

      await esperar(50);

      requestAnimationFrame(() => {
        vaiUmElemento.style.left = `${
          targetX - vaiUmElemento.offsetWidth / 2
        }px`;
        vaiUmElemento.style.top = `${
          targetY - vaiUmElemento.offsetHeight / 2
        }px`;
      });
      // --- FIM DA LÓGICA DE ANIMAÇÃO DIRETA ---

      valores[i] -= base;
      if (contador) contador.classList.remove("processando-numero");
      atualizarColunaComBolinhasOuContador(
        colunaAtual,
        valores[i],
        bloco,
        bloco.columns[i].power
      );

      await esperar(800);

      vaiUmElemento.classList.add("explodindo");

      if (bloco.soundEnabled) {
        bloco.addSound.pause();
        bloco.addSound.currentTime = 0;
        bloco.addSound.play();
      }

      valores[i - 1] += 1;
      atualizarColunaComBolinhasOuContador(
        colunaEsquerda,
        valores[i - 1],
        bloco,
        bloco.columns[i - 1].power
      );

      const contadorDestino =
        colunaEsquerda.querySelector(".contador-bolinhas");
      if (contadorDestino) {
        contadorDestino.classList.add("numero-recebendo-vai-um");
        setTimeout(() => {
          contadorDestino.classList.remove("numero-recebendo-vai-um");
        }, 400);
      }

      await esperar(400);
      vaiUmElemento.remove();

      colunaAtual.classList.remove("caixa-destacada");
      colunaEsquerda.classList.remove("caixa-destacada");
      await esperar(400);
    }
  }

  valores.forEach((valor, index) => {
    if (colunasElements[index]) {
      atualizarColunaComBolinhasOuContador(
        colunasElements[index],
        valor,
        bloco,
        bloco.columns[index].power
      );
    }
  });

  bloco.updateResult();
}

// Função utilitária para pausar animação
function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Popula uma coluna com bolinhas individuais ou com um contador numérico,
 * dependendo da quantidade.
 * @param {HTMLElement} coluna - O elemento da coluna a ser atualizado.
 * @param {number} quantidade - O número de bolinhas a serem representadas.
 * @param {object} bloco - A instância do BaseNumberExplorer (bloco1, blocoFinal, etc.) para usar seus métodos.
 * @param {number} power - A potência da coluna, para estilizar as bolinhas corretamente.
 */
function atualizarColunaComBolinhasOuContador(
  coluna,
  quantidade,
  bloco,
  power
) {
  // Defina o número máximo de bolinhas que você quer desenhar.
  const LIMITE_VISUAL = 15;

  // Limpa o conteúdo anterior da coluna (exceto labels e contadores de baixo)
  coluna
    .querySelectorAll(".ball, .contador-bolinhas")
    .forEach((el) => el.remove());

  if (quantidade > LIMITE_VISUAL) {
    // Se a quantidade for grande, mostra o contador
    const contador = document.createElement("div");
    contador.className = "contador-bolinhas";
    contador.textContent = quantidade;
    coluna.appendChild(contador);
  } else {
    // Se a quantidade for pequena, desenha as bolinhas
    for (let i = 0; i < quantidade; i++) {
      const bolinha = document.createElement("div");
      bolinha.className = "ball";
      // Usa o método do próprio bloco para aplicar o estilo correto
      bloco.applyBallStyle(bolinha, power);
      coluna.appendChild(bolinha);
    }
  }

  // Atualiza o contador de baixo (o número que fica embaixo da coluna)
  const countLabel = coluna.querySelector(".column-count");
  if (countLabel) {
    countLabel.textContent = quantidade;
  }
}
