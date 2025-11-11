class BaseNumberExplorer {
  constructor() {
    this.baseSelector = document.getElementById("baseSelector");
    this.integerColumnSelector = document.getElementById(
      "integerColumnSelector"
    );
    this.decimalColumnSelector = document.getElementById(
      "decimalColumnSelector"
    );
    this.abacusContainer = document.getElementById("abacusContainer");
    this.resultDisplay = document.getElementById("resultDisplay");
    this.baseDisplay = document.getElementById("baseDisplay");
    this.explanationText = document.getElementById("explanationText");
    this.resetButton = document.getElementById("resetButton");
    this.draggableBall = document.getElementById("draggableBall");
    this.ballContainer = document.getElementById("ballContainer");

    this.columns = [];
    this.setupEventListeners();
    this.createAbacus();
    this.addSound = new Audio("audio/add.mp3");
    this.removeSound = new Audio("audio/remove.mp3");
    this.addSound.volume = 0.4; // volume suave
    this.removeSound.volume = 0.4;

    this.soundEnabled = true;
    this.toggleSoundButton = document.getElementById("toggleSoundButton");

    this.toggleSoundButton.addEventListener("click", () => {
      this.soundEnabled = !this.soundEnabled;

      if (this.soundEnabled) {
        this.toggleSoundButton.querySelector(".sound-icon").textContent = "🔊";
        this.toggleSoundButton.querySelector(".sound-label").textContent =
          "Som ativado";
        this.toggleSoundButton.title = "Desativar som";
      } else {
        this.toggleSoundButton.querySelector(".sound-icon").textContent = "🔇";
        this.toggleSoundButton.querySelector(".sound-label").textContent =
          "Som desativado";
        this.toggleSoundButton.title = "Ativar som";
      }
    });
  }

  setupEventListeners() {
    this.baseSelector.addEventListener("change", () => this.createAbacus());
    this.integerColumnSelector.addEventListener("change", () =>
      this.createAbacus()
    );
    this.decimalColumnSelector.addEventListener("change", () =>
      this.createAbacus()
    );
    this.resetButton.addEventListener("click", () => this.resetAbacus());

    // Drag & Drop da bolinha
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
    const previousState = this.saveCurrentState();
    this.abacusContainer.innerHTML = "";
    this.base = parseInt(this.baseSelector.value);
    this.integerColumns = parseInt(this.integerColumnSelector.value);
    this.decimalColumns = parseInt(this.decimalColumnSelector.value);
    this.columns = [];

    this.powersColors = [
      "#ff6f61", // unidades
      "#ffa372", // dezenas
      "#ffd97d", // centenas
      "#a0e8af", // milhar
      "#5f9ea0", // dezenas de milhar
      "#a78bfa", // centenas de milhar
      "#ff99c8", // milhão
      "#ffb5a7", // dezenas de milhão
      "#9fc5e8", // centenas de milhão
      "#6fffe9", // bilhão
      "#dab6fc", // backup extra
      "#b4f8c8", // backup extra
    ];

    for (let i = this.integerColumns - 1; i >= 0; i--) {
      const label = this.formatLabel(i);
      const column = this.createColumn(label, i);
      this.abacusContainer.appendChild(column);
      this.columns.push({ column, power: i });
    }

    // ➕ Adiciona vírgula entre parte inteira e decimal
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

    this.restorePreviousState(previousState);
    this.updateResult();
    this.updateExplanation();
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

    column.addEventListener("click", (event) => {
      // Garante que o clique foi na coluna (não no botão de remover bolinha etc)
      // e evita adicionar ao clicar no número do topo.
      if (event.target === column) {
        this.addBallToColumn(column);
      }
    });

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
      setTimeout(() => {
        symbolicBall.remove();
      }, 500);

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

    // 🔥 Se não existir próxima coluna, cria uma nova
    if (nextColumnIndex < 0) {
      const newPower = power + 1;
      const label = this.formatLabel(newPower);
      const newColumn = this.createColumn(label, newPower);

      // Insere a nova coluna no início do Container
      this.abacusContainer.insertBefore(
        newColumn,
        this.abacusContainer.firstChild
      );

      //  Adiciona a classe para animação
      newColumn.classList.add("highlight");

      // (3 repetições x 1.2s)
      setTimeout(() => {
        newColumn.classList.remove("highlight");
      }, 4000);

      // Atualiza o array de colunas (coloca no começo)
      this.columns.unshift({ column: newColumn, power: newPower });

      //  Atualiza o índice da nova coluna
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

    //  Cores atualizadas
    const darkColor = "#FF0000"; // Vermelho intenso para a fatia
    const lightColor = "#ffecec"; // Fundo suave
    const strokeColor = "#cc0000"; // Borda levemente mais escura

    const angleStep = (2 * Math.PI) / divisions;
    const cx = size / 2;
    const cy = size / 2;

    // Fundo da bolinha
    const background = document.createElementNS(svgNS, "circle");
    background.setAttribute("cx", cx);
    background.setAttribute("cy", cy);
    background.setAttribute("r", radius);
    background.setAttribute("fill", lightColor);
    svg.appendChild(background);

    // Fatia da fração
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
    path.setAttribute("stroke", strokeColor); // contorno para contraste
    path.setAttribute("stroke-width", "1");

    svg.appendChild(path);
    return svg;
  }

  shouldShowTooltip(power) {
    if (power >= 1) {
      return true;
    } else if (power <= 0) {
      const nextColumnExists = this.columns.some((c) => c.power === power - 1);
      return nextColumnExists;
    }
    return false;
  }

  showTooltip(event, ball, power) {
    if (power >= 1 || (power <= 0 && this.shouldShowTooltip(power))) {
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

    let unitBallIcon = null;
    let nextBallIcon = null;

    if (power >= 1) {
      const baseValue = Math.pow(this.base, power);
      text.textContent = `= ${baseValue} ×`;
      unitBallIcon = document.createElement("div");
      unitBallIcon.className = "ball-icon";
      unitBallIcon.style.backgroundColor = this.powersColors[0];
    } else if (power <= 0) {
      const nextColumn = this.columns.find((c) => c.power === power - 1);
      if (nextColumn) {
        text.textContent = `= ${this.base} ×`;
        nextBallIcon = document.createElement("div");
        nextBallIcon.className = "ball-icon";

        const tempBall = document.createElement("div");
        tempBall.className = "ball";
        this.applyBallStyle(tempBall, power - 1);

        const svgNext = tempBall.querySelector("svg");
        if (svgNext) {
          const svgCloneNext = svgNext.cloneNode(true);
          svgCloneNext.setAttribute("width", "20");
          svgCloneNext.setAttribute("height", "20");
          svgCloneNext.setAttribute("viewBox", "0 0 50 50");
          nextBallIcon.appendChild(svgCloneNext);
        } else {
          nextBallIcon.style.backgroundColor = tempBall.style.backgroundColor;
        }
      }
    }

    const lineContainer = document.createElement("div");
    lineContainer.style.display = "flex";
    lineContainer.style.flexDirection = "row";
    lineContainer.style.alignItems = "center";
    lineContainer.style.gap = "5px";

    lineContainer.appendChild(currentBallIcon);
    lineContainer.appendChild(text);
    if (unitBallIcon) lineContainer.appendChild(unitBallIcon);
    if (nextBallIcon) lineContainer.appendChild(nextBallIcon);

    tooltip.appendChild(lineContainer);

    const infoLine = document.createElement("div");
    infoLine.style.fontSize = "12px";
    infoLine.style.fontWeight = "normal";
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
    let integerPart = "";
    let decimalPart = "";

    this.columns.forEach(({ column, power }) => {
      const ballCount = column.querySelectorAll(".ball").length;
      column.querySelector(".column-count").textContent = ballCount;

      if (power >= 0) {
        integerPart += ballCount;
      } else {
        decimalPart += ballCount;
      }

      total += ballCount * Math.pow(this.base, power);
    });

    if (this.decimalColumns === 0) {
      this.resultDisplay.textContent = `Resultado: ${Math.floor(total)}`;
      this.baseDisplay.textContent = `Número na Base ${this.base}: ${
        integerPart || "0"
      }`;
    } else {
      //  formatando o número com vírgula no lugar do ponto
      const totalFormatado = total.toFixed(this.decimalColumns).split(".");
      const resultadoFinal = `${totalFormatado[0]},${totalFormatado[1]}`;

      this.resultDisplay.textContent = `Representação do número na base 10: ${resultadoFinal}`;
      this.baseDisplay.textContent = `Número na Base ${this.base}: ${
        integerPart || "0"
      },${decimalPart || "0"}`;
    }

    const detailedCalculationDiv = document.getElementById(
      "detailedCalculation"
    );
    const polynomialTitle = document.getElementById("polynomialTitle");

    const detailedTerms = [];

    this.columns.forEach(({ column, power }) => {
      const ballCount = column.querySelectorAll(".ball").length;
      // Agora mostra até os zeros
      detailedTerms.push(`(${ballCount} × ${this.base}<sup>${power}</sup>)`);
    });

    if (detailedTerms.length > 0) {
      const expression = detailedTerms.join(" + ");
      const resultadoFinal = total
        .toFixed(this.decimalColumns)
        .replace(".", ",");

      // Atualiza o título dinamicamente com a base atual
      polynomialTitle.innerHTML = `Polinômio de Representação Posicional na Base ${this.base}: N =`;

      // Mostra a expressão completa
      detailedCalculationDiv.innerHTML = `${expression} = ${resultadoFinal}`;
    } else {
      detailedCalculationDiv.innerHTML = "";
    }
  }

  resetAbacus() {
    this.columns.forEach(({ column }) => {
      const power = Number(column.dataset.power);
      const label = this.formatLabel(power);
      column.innerHTML = `
        <div class="column-label">${label}</div>
        <div class="column-count">0</div>`;
    });
    this.updateResult();
  }

  updateExplanation() {
    this.explanationText.textContent =
      `Você está na base ${this.base}. ` +
      `Arraste a bolinha para uma coluna ou clique dentro de uma “caixa” para compor um número.`;
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

    const powerStr = String(power)
      .split("")
      .map((char) => superMap[char] || char)
      .join("");

    return `${this.base}${powerStr}`;
  }
}

new BaseNumberExplorer();
