function showTab(el, id) {
  const mainTabber = el.parentElement;
  const tabs = mainTabber.querySelectorAll("div.tabcontent");
  tabs.forEach(element => {
    if (element.id == id) {
      element.classList.add("active");
    } else {
      element.classList.remove("active");
    }
  });
}

function showHideNextSibling(el) {
  const targ = el.nextElementSibling;
  if (targ.style.display == "none") targ.style.display = "";
  else targ.style.display = "none";
}

const waterPurityData = [
  { name: "Pure Water", purity: 0.999, price: 2 },
  { name: "High-Quality Water", purity: 0.99, price: 1.5 },
  { name: "Basewater", purity: 0.98, price: 1 },
  { name: "Ghostwater", purity: 0.96, price: 0.67 },
  { name: "Rustwater", purity: 0.90, price: 0.25 },
  { name: "Gutterflow", purity: 0, price: 0.1 },
];
const waterAmtPerCredit = 25; // 25 ml = 1 credit

function getWaterPurity(purity) {
  return waterPurityData.find(x => x.purity <= purity);
}

function fillWaterQualityInfo() {
  let lines = [];

  for (const water of waterPurityData) {
    const cells = [
      water.name,
      printPurity(water.purity),
      Math.round(water.price * 1000 / waterAmtPerCredit) + "c/l",
    ];
    lines.push(cells.map(x => "<td>" + x + "</td>").join(""));
  }

  document.querySelectorAll(".waterPurityInfo").forEach(x => {
    x.innerHTML = lines.map(x => "<tr>" + x + "</tr>").join("");
  })
}

function numberWithSign(n) {
  if (n >= 0) return "+" + n;
  return "" + n;
}

// 99 -> 0.99; 99.1 -> 0.991; 991 -> 0.991; 99.11 -> 0.9911; 9911 -> 0.9911
function adjustPurity(n) {
  if (n > 1000) return n / 10000;
  if (n > 100) return n / 1000;
  return n / 100;
}

function validPurity(n) {
  return typeof n === "number" && !isNaN(n) && n > 0 && n <= 10000;
}

function printPurity(n) {
  return (Math.round(n * 10000) / 100).toFixed(2) + "%";
}

function waterDilutionInputChange() {
  const ans = calcWaterDilution(
    parseFloat(document.getElementById("waterMixer-amount").value),
    parseFloat(document.getElementById("waterMixer-purity").value),
    parseFloat(document.getElementById("waterMixer-mixer").value),
    parseFloat(document.getElementById("waterMixer-target").value)
  )
  if (ans) {
    document.getElementById("waterMixer-answer").innerHTML = ans;
  } else {
    document.getElementById("waterMixer-answer").innerHTML = "";
  }
}

function calcWaterDilution(waterAmt, waterPurity, mixerPurity, targetPurity) {
  if (!validPurity(mixerPurity) || !validPurity(waterPurity) || typeof waterAmt !== "number" || waterAmt <= 0) return;

  waterPurity = adjustPurity(waterPurity);
  mixerPurity = adjustPurity(mixerPurity);

  if (mixerPurity > waterPurity) return;

  const purObj = waterPurityData.find(x => waterPurity >= x.purity);
  if (!purObj) return;

  if (validPurity(targetPurity)) {
    targetPurity = adjustPurity(targetPurity);
  } else {
    targetPurity = purObj.purity;
  }
  if (mixerPurity >= targetPurity) return;
  const targPurObj = waterPurityData.find(x => targetPurity >= x.purity);

  // mixing x1 volume of y1 quality + x2 volume of y2 quality
  // we end up with x1 + x2 total volume and (x1 * y1 + x2 * y2) pure water content
  // therefore quality is (x1 * y1 + x2 * y2) / (x1 + x2) = qt
  // solving for x1:
  // qt * (x1 + x2) = (x1 * y1 + x2 * y2)
  // qt * x1 - x1 * y1 = x2 * y2 - qt * x2
  // x1 * (qt - y1) = ...
  // x1 = (x2 * y2 - qt * x2) / (qt - y1)

  const maxMix = Math.floor(waterAmt * (waterPurity - targetPurity) / (targetPurity - mixerPurity));

  return `Current water: ${waterAmt}ml of ${purObj.name}, ${printPurity(waterPurity)} purity, worth ${Math.round(Math.floor(waterAmt / waterAmtPerCredit) * purObj.price)}c<br>`
  + `Can add ${maxMix}ml of ${printPurity(mixerPurity)} purity mixer to make ${maxMix + waterAmt}ml of ${printPurity(targetPurity)} purity ${targPurObj.name}, worth ${Math.round(Math.floor((maxMix + waterAmt) / waterAmtPerCredit) * purObj.price)}c`
}

const wineBaseCost = 100;

function generateWines(bioreactor) {
  let ret = [];

  for (const berry1 of [2, 1, 0, -1]) {
    for (const berry2 of [2, 1, 0, null]) {
      for (const yeast of [true, false]) {
        if (bioreactor && !yeast) continue;
        for (const hqWater of [true, false]) {
          const recipe = new WineRecipe(berry1, berry2, yeast, hqWater);
          if (recipe.isValid) {
            ret.push(recipe);
          }
        }
      }
    }
  }

  ret.sort((a,b) => {
    return a.isVasteful - b.isVasteful;
  })

  return ret;
}

berryScoreToName = {
  "-1": "moldyBerry",
  "0": "badBerry",
  "1": "normalBerry",
  "2": "smallBerry",
}

itemInfo = {
  "yeast": { price: 10, name: "Yeast", type: "household" },
  "basewater": { price: 30, name: "Basewater", type: "water" },
  "HQwater": { price: 45, name: "High-Quality Water", type: "water" },
  "bottle": { price: 12, name: "Wine Bottle", type: "household" },

  "moldyBerry": { price: 14, name: "Berry (moldy)", type: "food" },
  "badBerry": { price: 14, name: "Berry (bad)", type: "food" },
  "normalBerry": { price: 14, name: "Berry (normal)", type: "food" },
  "smallBerry": { price: 14, name: "Berry (small)", type: "food" },
}

class WineCombo {
  comboList = [];

  moneyNeeded = 0;
  wineValue = 0;
  valueUsed = 0;
  usedItems = {};

  get profit() {
    return this.wineValue - this.valueUsed - this.moneyNeeded;
  }
}

class WineCalculator {
  credits = 0;
  bioreactor = false;
  hardmode = false;
  ageTarget = 0;

  traderInventory = {};
  playerInventory = {};
  priceEvents = {};

  getItemCost(item, markup, includeEvent) {
    let priceMod = 1 + markup;
    if (includeEvent) {
      const event = this.priceEvents[itemInfo[item].type];
      if (event) priceMod += event / 100;
    }
    return Math.round(itemInfo[item].price * priceMod);
  }

  static createFromPage() {
    const ret = new WineCalculator();
    ret.hardmode = document.getElementById("wine-hardmode").checked;
    ret.bioreactor = document.getElementById("wine-bioreactor").checked;

    const money = parseInt(document.getElementById("wine-money").value);
    ret.credits = isNaN(money) ? Infinity : money;

    const age = parseInt(document.getElementById("wine-age").value);
    ret.ageTarget = isNaN(age) ? 0 : age;

    const inputs = document.querySelectorAll("#wine-item-table input");
    for (const input of inputs) {
      const side = input.dataset.side;
      let amt = parseInt(input.value);
      if (isNaN(amt)) amt = 0;

      if (side == "trader") {
        ret.traderInventory[input.dataset.item] = amt;
      } else {
        ret.playerInventory[input.dataset.item] = amt;
      }
    }

    const priceInputs = document.querySelectorAll("#wine-price-table input");
    for (const input of priceInputs) {
      let amt = parseInt(input.value);
      if (isNaN(amt)) continue;
      ret.priceEvents[input.dataset.item] = amt;
    }

    return ret;
  }

  findBestCombo(/** @type WineRecipe[] */ wines) {
    //const forceCombo = []; // DEBUG
    const toProcess = [new WineCombo()];
    const finishedCombos = [];
    while (toProcess.length) {
      const curCombo = toProcess.shift();
      let finished = true;
      const nextWine = curCombo.comboList.length ? curCombo.comboList[curCombo.comboList.length - 1] : 0;
      for (let i = nextWine; i < wines.length; ++i) {
        //if (i != forceCombo[curCombo.comboList.length]) continue; // DEBUG
        const wine = wines[i];
        const newCombo = this.tryAddWineToCombo(curCombo, wine, i);
        if (newCombo) {
          toProcess.push(newCombo);
          finished = false;
        }
      }
      if (finished && curCombo.comboList.length) {
        finishedCombos.push(curCombo);
      }
    }
    finishedCombos.sort((a,b) => {
      return (b.profit) - (a.profit);
    })

    let lines = [];
    if (finishedCombos.length == 0) {
      lines.push("No profitable wine making possible!");
    } else {
      const c = finishedCombos[0];
      lines.push(`Best combo:`);
      if (c.moneyNeeded) {
        const purchases = [];
        for (const it in c.usedItems) {
          const buy = c.usedItems[it] - (this.playerInventory[it] || 0);
          if (buy > 0) {
            purchases.push(`${buy}x ${itemInfo[it].name}`);
          }
        }
        lines.push(`Purchase ${purchases.join(", ")} (worth ${c.moneyNeeded})`);
      }
      if (c.valueUsed) {
        const purchases = [];
        for (const it in c.usedItems) {
          const buy = Math.min(c.usedItems[it], (this.playerInventory[it] || 0));
          if (buy) {
            purchases.push(`${buy}x ${itemInfo[it].name}`);
          }
        }
        lines.push(`Use ${purchases.join(", ")} from inventory (worth ${c.valueUsed})`);
      }
      lines.push(`Total profit: ${Math.round(c.wineValue)} - ${Math.round(c.moneyNeeded + c.valueUsed)} = ${Math.round(c.profit)}`);
      lines.push("Recipes:");
      for (const i of c.comboList) {
        lines.push(wines[i].print + " → " + wines[i].name);
      }
    }
    document.getElementById("wine-result").innerHTML = lines.join("<br>");
  }

  tryAddWineToCombo(/** @type WineCombo */ combo, /** @type WineRecipe */ wine, index) {
    let moneyNeeded = 0;
    let valueUsed = 0;
    for (const [k, v] of Object.entries(wine.items)) {
      if (k == "yeast" && this.bioreactor) continue;
      const playerInv = this.playerInventory[k] || 0;
      const traderInv = this.traderInventory[k] || 0;
      const used = combo.usedItems[k] || 0;
      if (playerInv + traderInv < used + v) return;
      
      const inInventory = Math.max(playerInv - used, 0);
      const fromInventory = Math.min(inInventory, v);
      const fromTrader = Math.max(v - fromInventory, 0);
      moneyNeeded += this.getItemCost(k, 0.15, true) * fromTrader;
      valueUsed += this.getItemCost(k, this.hardmode ? 0 : 0.15, false) * fromInventory;
    }
    if (moneyNeeded > this.credits - combo.moneyNeeded) return;
    const wineValue = wine.agedPrice(this.ageTarget) * (this.hardmode ? 1 : 1.15); // TODO: consider no yeast is -2 days?
    if (wineValue < moneyNeeded + valueUsed) return;

    const ret = new WineCombo();
    ret.comboList = combo.comboList.concat(index);
    ret.moneyNeeded = combo.moneyNeeded + moneyNeeded;
    ret.valueUsed = combo.valueUsed + valueUsed;
    ret.wineValue = combo.wineValue + wineValue;
    for (const key in combo.usedItems) {
      ret.usedItems[key] = combo.usedItems[key];
    }
    for (const key in wine.items) {
      if (key == "yeast" && this.bioreactor) continue;
      ret.usedItems[key] = (ret.usedItems[key] || 0) + wine.items[key];
    }
    return ret;
  }
}

class WineRecipe {
  hasYeast = false;
  recipe = [];
  score = 0;

  constructor(berry1, berry2, yeast, hqWater) {
    let score = berry1 + berry2 + yeast + hqWater;
    if (berry2 !== null) ++score;
    this.score = score;
    this.hasYeast = yeast;
    this.recipe = [berry1, berry2, yeast, hqWater];
  }

  get isValid() {
    if (this.score <= 0) return false;
    if (this.recipe[1] !== null) {
      if (this.recipe[0] < this.recipe[1]) return false;
      const noBerry2Recipe = new WineRecipe(this.recipe[0], null, this.recipe[2], this.recipe[3]);
      if (this.priceMod == noBerry2Recipe.priceMod) {
        return false;
      }
    }
    return true;
  }

  get isVasteful() {
    return this.score === 4 || this.score > 6;
  }

  get items() {
    let ret = {};
    if (this.recipe[0] == this.recipe[1]) {
      ret[berryScoreToName[this.recipe[0]]] = 2;
    } else {
      ret[berryScoreToName[this.recipe[0]]] = 1;
      if (this.recipe[1] !== null) {
        ret[berryScoreToName[this.recipe[1]]] = 1;
      }
    }
    if (this.recipe[2]) {
      ret["yeast"] = 1;
    }
    if (this.recipe[3]) {
      ret["HQwater"] = 1;
    } else {
      ret["basewater"] = 1;
    }
    ret["bottle"] = 1;
    return ret;
  }

  get name() {
    if (this.score <= 0) {
      return "Undrinkable";
    } else if (this.score == 1) {
      return "Bucket Brew";
    } else if (this.score == 2) {
      return "Homebrew";
    } else if (this.score == 3 || this.score == 4) {
      return "Production Wine";
    } else if (this.score == 5) {
      return "Reserve";
    } else if (this.score >= 6) {
      return "Master Vintage";
    }
    throw new Error("Something is really wrong with wine recipes");
  }

  get priceMod() {
    if (this.score <= 0) {
      return 0;
    } else if (this.score == 1) {
      return 0.85;
    } else if (this.score == 2) {
      return 1;
    } else if (this.score == 3 || this.score == 4) {
      return 1.25;
    } else if (this.score == 5) {
      return 1.5;
    } else if (this.score >= 6) {
      return 1.75;
    }
    throw new Error("Something is really wrong with wine recipes");
  }

  get print() {
    let lines = [];
    lines.push(berryScoreToName[this.recipe[0]]);
    if (this.recipe[1] !== null) lines.push(berryScoreToName[this.recipe[1]]);
    if (this.recipe[2]) lines.push("yeast");
    if (this.recipe[3]) lines.push("HQwater");
    else lines.push("basewater");
    return lines.map(x => itemInfo[x].name).join(" + ");
  }

  agedPrice(age) {
    return (wineBaseCost + age * 3) * this.priceMod;
  }
}

function calculateWine() {
  const calc = WineCalculator.createFromPage();
  const wines = generateWines(calc.bioreactor);
  //console.log(wines.map((x,i) => `${i} ${x.print} ${x.score} ${x.priceMod} ${x.name}`));
  calc.findBestCombo(wines);
}

class AppraiseCategory {
  getName(n) {
    return "?";
  }

  getValue(n) {
    return 0;
  }

  createHTML() {
    return document.createElement("tr");
  }
}

class AppraiseCategoryPicker extends AppraiseCategory {
  constructor(name, options, values) {
    super();
    this.name = name;
    this.options = options;
    this.values = values;
  }

  getName(n) {
    return this.options[n];
  }

  getValue(n) {
    return this.values[n];
  }

  createHTML(i) {
    const tr = document.createElement("tr");

    const header = document.createElement("th")
    header.dataset.row = i;
    header.textContent = this.name;
    tr.appendChild(header);

    for (let j = 0; j < this.options.length; ++j) {
      const cell = document.createElement("td");
      cell.textContent = this.options[j];
      cell.dataset.row = i;
      cell.dataset.col = j;
      tr.appendChild(cell);
    }

    return tr;
  }
}

class AppraiseCategoryYesNo extends AppraiseCategory {
  constructor(name, noValue, yesValue) {
    super();
    this.name = name;
    this.noValue = noValue;
    this.yesValue = yesValue;
  }

  getName(n) {
    if (!n) return `No ${this.name}`;
    return this.name;
  }

  getValue(n) {
    return n ? this.yesValue : this.noValue;
  }

  createHTML(i) {
    const tr = document.createElement("tr");

    const header = document.createElement("th")
    header.dataset.row = i;
    header.textContent = this.name;
    tr.appendChild(header);
    
    const cellNo = document.createElement("td");
    cellNo.textContent = "No";
    cellNo.dataset.row = i;
    cellNo.dataset.col = 0;
    tr.appendChild(cellNo);
    
    const cellYes = document.createElement("td");
    cellYes.textContent = "Yes";
    cellYes.dataset.row = i;
    cellYes.dataset.col = 1;
    tr.appendChild(cellYes);

    return tr;
  }
}

class AppraiseCategoryInput extends AppraiseCategory {
  input;

  constructor(name, valueFunc) {
    super();
    this.name = name;
    this.valueFunc = valueFunc;
  }

  getName(n) {
    return this.valueFunc(n).name;
  }

  getValue(n) {
    return this.valueFunc(n).value;
  }

  createHTML(i) {
    const tr = document.createElement("tr");

    const header = document.createElement("th")
    header.textContent = this.name;
    tr.appendChild(header);

    const cell = document.createElement("td");
    tr.appendChild(cell);

    this.input = document.createElement("input");
    cell.appendChild(this.input);
    this.input.addEventListener("change", () => {
      this.input.parentElement.click();
    })

    return tr;
  }
}

class Appraiser {
  static name = "Error";
  static baseValue = 0;
  static minValue = 0;

  static logElement;
  /** @type {HTMLElement} */ static inputContainer;
  /** @type {AppraiseCategory[]} */ static categories;
  /** @type {{ row: number, col: number, img: string }[]} */ static imageList = [];

  static resetOptions() {
    this.inputContainer.querySelectorAll("td.selected").forEach(x => x.classList.remove("selected"));
    this.inputContainer.querySelectorAll("input").forEach(x => x.value = "");
    this.updateValue();
  }

  static selectOption(row, col) {
    const rowEl = this.inputContainer.querySelectorAll("tr")[row];
    const cells = rowEl.querySelectorAll("td");
    cells.forEach(x => x.classList.remove("selected"));
    if (col !== undefined) {
      cells[col].classList.add("selected");
    }
  }

  static updateValue() {
    const item = [];
    item.length = this.categories.length;
    const rows = this.inputContainer.querySelectorAll("tr");
    for (let i = 0; i < rows.length; ++i) {
      const input = rows[i].querySelector("input");
      if (input) {
        if (input.value) {
          item[i] = input.value;
        }
        continue;
      }
      const cells = Array.from(rows[i].querySelectorAll("td"));
      const selected = cells.findIndex(x => x.classList.contains("selected"));
      if (selected == -1) continue;
      item[i] = selected;
    }
    this.appraiseValue(item);
  }

  static specialValue(item) {
    return;
  }

  static appraiseValue(item) {
    const lines = [];

    if (this.specialValue(item)) {
      return this.minValue;
    }

    let ret = this.baseValue;
    lines.push(`Base: ${numberWithSign(this.baseValue)}`);

    for (let i = 0; i < item.length; ++i) {
      if (item[i] === undefined) continue;
      const val = this.categories[i].getValue(item[i]);
      if (val != 0) {
        ret += val;
        lines.push(`${this.categories[i].getName(item[i])}: ${numberWithSign(val)}`);
      }
    }

    const extra = this.extraValue(item);
    if (extra != 0) {
      ret += extra;
      lines.push(`Set bonus: ${numberWithSign(extra)}`);
    }

    if (ret < this.minValue) {
      lines.push(`CANNOT BE LOWER THAN ${this.minValue}`);
      ret = this.minValue;
    }

    lines.push(`----------------`);
    lines.push(`TOTAL: <b>${ret}</b>`);
    
    this.logElement.innerHTML = lines.join("<br>");
  }

  static extraValue(item) {
    return 0;
  }

  static createHTML(element) {
    const h3 = document.createElement("h3");
    h3.textContent = this.name;
    element.appendChild(h3);

    const containerDiv = document.createElement("div");
    containerDiv.style.display = "grid";
    containerDiv.style.gridTemplateColumns = "60% 40%";
    element.appendChild(containerDiv);

    const leftDiv = document.createElement("div");
    containerDiv.appendChild(leftDiv);

    this.inputContainer = document.createElement("table");
    this.inputContainer.classList.add("appraiser-table");
    leftDiv.appendChild(this.inputContainer);

    for (let i = 0; i < this.categories.length; ++i) {
      const cat = this.categories[i];
      const row = cat.createHTML(i);
      this.inputContainer.appendChild(row);
    }

    for (let image of this.imageList) {
      const cell = this.inputContainer.querySelectorAll("tr")[image.row].querySelectorAll("td")[image.col];
      cell.prepend(document.createElement("br"));
      const imgEl = document.createElement("img");
      imgEl.src = "images/" + image.img;
      imgEl.style.maxWidth = "200px";
      cell.prepend(imgEl);
    }

    this.inputContainer.addEventListener("click", (event) => {
      let target = event.target;
      if (target.tagName == "IMG") target = target.parentElement;
      if (target.dataset.row) {
        this.selectOption(target.dataset.row, target.dataset.col);
      }
      this.updateValue();
    })

    const resetButton = document.createElement("button");
    leftDiv.appendChild(resetButton);
    resetButton.onclick = () => {
      this.resetOptions();
    }
    resetButton.textContent = "Reset";

    const rightDiv = document.createElement("div");
    containerDiv.appendChild(rightDiv);

    this.logElement = document.createElement("div");
    rightDiv.appendChild(this.logElement);

    this.updateValue();
  }
}

class CyberHandAppraiser extends Appraiser {
  static name = "Cybernetic Hand";
  static baseValue = 100;
  static minValue = 50;

  static categories = [
    new AppraiseCategoryPicker("Material", ["Aluminium Alloy", "Carbon Composite", "Gold Plated"], [0, 50, 200]),
    new AppraiseCategoryPicker("Condition", ["None", "Wears", "Damages"], [0, -35, -85]),
    new AppraiseCategoryPicker("Control Interface", ["EMG", "EMG+", "Neural Interface", "Unspecified"], [0, 45, 120, -60]),
    new AppraiseCategoryYesNo("Armored", 0, 50),
    new AppraiseCategoryYesNo("Blade", 0, 80),
  ];

  static extraValue(item) {
    if (item[0] == 1 && item[1] == 0 && (item[2] == 1 || item[2] == 2) && item[3] == 1 && item[4] == 1) return 100;
    if (item[0] == 2 && item[1] == 0 && item[2] == 2) return 200;
    return 0;
  }
}

class PlasmaCartAppraiser extends Appraiser {
  static name = "Plasma Cartridge";
  static baseValue = 100;
  static minValue = 30;

  static categories = [
    new AppraiseCategoryPicker("Condition", ["Standard", "Light Wear", "Heavy Wear"], [0, -15, -30]),
    new AppraiseCategoryYesNo("Cracked", 0, -50),
    new AppraiseCategoryYesNo("Exposed Screws", 0, -10),
    new AppraiseCategoryYesNo("Reinforced", 0, 20),
    new AppraiseCategoryPicker("Color", ["Standard", "Low-Grade", "High-Grade"], [0, -50, 50]),
    new AppraiseCategoryPicker("Seal", ["None", "WLD", "ZHS", "RNR", "IGN"], [0, 0, 0, 0, 0]),
  ];

  static imageList = [
    { row: 5, col: 1, img: "PlasmaCart-WLD.png" },
    { row: 5, col: 2, img: "PlasmaCart-ZHS.png" },
    { row: 5, col: 3, img: "PlasmaCart-RNR.png" },
    { row: 5, col: 4, img: "PlasmaCart-IGN.png" },
  ]

  static extraValue(item) {
    if (item[5] == 1) {
      if (item[4] == 0 || item[4] == 1) return 20;
    } else if (item[5] == 2) {
      if (item[0] == 0 && item[1] == 0 && item[2] == 0 && item[4] == 0) return 40;
    } else if (item[5] == 3) {
      if (item[1] == 0 && item[4] == 0) return 40;
    } else if (item[5] == 4) {
      if (item[0] == 0 && item[1] == 0 && item[2] == 0 && item[3] == 0 && item[4] == 2) return 80;
    }
    return 0;
  }
}

class RibwichAppraiser extends Appraiser {
  static name = "Ribwich";
  static baseValue = 150;
  static minValue = 40;

  static categories = [
    new AppraiseCategoryPicker("Packaging", ["OK", "Torn/missing"], [0, -Infinity]),
    new AppraiseCategoryInput("Production date", (n) => {
      const parsed = n.match(/(\d{1,2})\/(\d{3})/);
      if (!parsed) return { name: "Wrong production date?", value: -Infinity, counterfeit: true };
      const month = parseInt(parsed[1]); const year = parseInt(parsed[2]);
      if (isNaN(month) || isNaN(year)
        || month < 1 || month > 12
        || year < 425 || (year > 429 && year < 432) || year > 438) {
          return { name: "Production date must be 425-429 or 432-438", value: -Infinity, counterfeit: true };
        }
        if (year == 425 && month == 1) return { name: "First run + first month", value: 130, ribLogo: false };
        if (year == 438 && month == 12) return { name: "Last month", value: 50, ribLogo: true };
        if (year >= 425 && year <= 429) return { name: "First run", value: 80, ribLogo: false };
        if (year >= 432 && year <= 438) return { name: "", value: 0, ribLogo: true };
        return { name: "PLEASE REPORT THIS TO DEV, SOMETHING WRONG WITH RIBWICH APPRAISER", value: -Infinity, counterfeit: true };
    }),
    new AppraiseCategoryPicker("Davre logo", ["Correct", "Incorrect/Absent"], [0, -Infinity]),
    new AppraiseCategoryPicker("Ribwich logo", ["Correct", "Absent", "Incorrect"], [0, 0, -Infinity]),
    new AppraiseCategoryInput("Packing facility", (n) => {
      const fac = parseInt(n);
      if (isNaN(fac)) return { name: "No packing facility?", value: -Infinity, counterfeit: true }
      if ([1, 2, 5, 8, 21, 34].includes(fac)) return { name: "HQ packing facility", value: 50 };
      if ([5, 17, 18, 26, 31].includes(fac)) return { name: "LQ packing facility", value: -50 };
      if (fac > 35 || fac < 1) return { name: "Packing facility not from 1-35", value: -Infinity, counterfeit: true }
      return { name: "", value: 0 };
    }),
    new AppraiseCategoryPicker("Sesame bun and extra pickles", ["Neither", "One", "Both"], [0, -Infinity, 300]),
    new AppraiseCategoryYesNo("Double meat patty", 0, 800),
  ];

  static imageList = [
    { row: 2, col: 0, img: "Ribwich-DA.png" },
    { row: 3, col: 0, img: "Ribwich-logo.png" },
    { row: 5, col: 2, img: "Ribwich-sesame-pickles.png" },
    { row: 6, col: 1, img: "Ribwich-double-meat.png" },
  ];

  static specialValue(item) {
    const reasons = [];
    if (item[0] == 1) {
      reasons.push("Package torn/missing");
    }
    if (item[2] == 1) {
      reasons.push("Incorrect/missing Davre logo");
    }
    if (item[3] == 2) {
      reasons.push("Incorrect Ribwich logo");
    }
    if (item[5] == 1) {
      reasons.push("Counterfeit deluxe edition");
    }
    if (item[1] !== undefined) {
      const v = this.categories[1].valueFunc(item[1]);
      if (v.counterfeit) reasons.push(v.name);
      if (item[3] !== undefined) {
        if (v.ribLogo && item[3] == 1) {
          reasons.push("2nd run must have Ribwich logo");
        } else if (!v.ribLogo && item[3] == 0) {
          reasons.push("1st run must NOT have Ribwich logo");
        }
      }
    }
    if (item[4] !== undefined) {
      const v = this.categories[4].valueFunc(item[4]);
      if (v.counterfeit) reasons.push(v.name);
    }
    if (reasons.length) {
      this.logElement.innerHTML = `COUNTERFEIT<br>${reasons.join("<br>")}<br>BASE VALUE: <b>${this.minValue}</b>`;
      return 40;
    }
  }
}

function calculatePurifier() {
  const performance = parseInt(document.getElementById("waterPurifier-performance").value);
  const quality = parseInt(document.getElementById("waterPurifier-quality").value);
  const volume = parseInt(document.getElementById("waterPurifier-volume").value);

  if (isNaN(performance)) {
    document.getElementById("waterPurifier-performance").style.border = "2px solid red";
  } else {
    document.getElementById("waterPurifier-performance").style.border = "";
  }

  if (isNaN(quality)) {
    document.getElementById("waterPurifier-quality").style.border = "2px solid red";
  } else {
    document.getElementById("waterPurifier-quality").style.border = "";
  }

  if (isNaN(volume)) {
    document.getElementById("waterPurifier-volume").style.border = "2px solid red";
  } else {
    document.getElementById("waterPurifier-volume").style.border = "";
  }

  if (isNaN(performance) || isNaN(quality) || isNaN(volume)) return;

  let waterState = {};
  let total = 0;

  const inputs = document.querySelectorAll("#waterPurifier-purity input");
  for (const input of inputs) {
    const vol = parseVolume(input.value, volume);
    waterState[input.dataset.item] = vol;
    total += vol;
  }
  waterState.total = total;


  const lines = [];
  let day = 0;
  while (day < 100) {
    lines.push(printWaterState(day, waterState));
    ++day;
    waterState = purifierStep(performance, quality, waterState);
    if (!waterState.converted) {
      break;
    }
  }

  document.getElementById("waterPurity-result").tBodies[0].innerHTML = lines.map(x => "<tr>" + x + "</tr>").join("");
}

const contaminants = [
  { tag: "heavyMetal", name: "Heavy Metal", minConc: 0.0024, base: 2_000 },
  { tag: "organicWaste", name: "Organic Waste", minConc: 0.001, base: 5_000, filter: 1 },
  { tag: "microbes", name: "Microbes", minConc: 0.0009, base: 5_000, filter: 2 },
  { tag: "chemicals", name: "Chemical Contaminant", minConc: 0.0016, base: 3_000 },
  { tag: "physical", name: "Physical Contaminant", minConc: 0.0007, base: 5_000, filter: 0.75 },
  { tag: "mineral", name: "Mineral", minConc: 0.0007, base: 5_000, filter: 2 },
]

function printWaterState(day, waterState) {
  const cells = [
    day,
    waterState.converted || "-",
    printPurity(waterState.water / waterState.total),
    getWaterPurity(waterState.water / waterState.total).name,
  ]
  for (const cont of contaminants) {
    cells.push(waterState[cont.tag] || 0);
  }
  let filt = getFilterResult(waterState);
  cells.push(`${printPurity(filt.purity)} ${getWaterPurity(filt.purity).name} (~${filt.dur} dur)`);
  filt = getFilterResult(waterState, true);
  cells.push(`${printPurity(filt.purity)} ${getWaterPurity(filt.purity).name} (~${filt.dur} dur)`);
  return cells.map(x => "<td>" + x + "</td>").join("");
}

function getFilterResult(waterState, useUV = false) {
  let water = waterState.water;
  let dur = 0;
  let nonWater = 0;
  for (const cont of contaminants) {
    if (!waterState[cont.tag]) continue;
    if (cont.tag == "microbes" && useUV) {
      water += waterState[cont.tag];
    } else if (cont.filter) {
      dur += Math.ceil(waterState[cont.tag] / 1000 / cont.filter);
    } else {
      nonWater += waterState[cont.tag];
    }
  }
  const volume = water + nonWater
  return { purity: water / volume, volume, dur };
}

function purifierStep(performance, quality, waterState) {

  let qualityImpact = 1;
  if (quality >= 200) qualityImpact = 0;
  else if (quality >= 100) qualityImpact = 1 / 12.5;
  else if (quality >= 75) qualityImpact = 1 / 5;
  else if (quality >= 50) qualityImpact = 1 / 3;

  const concentrationToMult = (c) => {
    if (c > 0.5) return 20;
    if (c > 0.25) return 15;
    if (c > 0.15) return 10;
    if (c > 0.08) return 5;
    if (c > 0.04) return 2;
    return 1;
  }
  const mult = concentrationToMult(1 - waterState.water / waterState.total);

  const extraThresh = 3000000;
  const extraFromVolume = waterState.total > extraThresh ? 0.05 + (waterState.total - extraThresh) * 0.1 / 1000000 : 0;

  let converted = 0;
  let newState = {};

  for (const key in waterState) {
    const contaminantInfo = contaminants.find(x => x.tag == key);
    if (!contaminantInfo) continue;
    
    const maxRemoval = Math.round(contaminantInfo.base * mult + contaminantInfo.base * extraFromVolume + contaminantInfo.base * performance / 100);

    const minConcentration = contaminantInfo.minConc * qualityImpact;
    const minAmount = Math.round(minConcentration * waterState.total);

    const removed = Math.min(maxRemoval, waterState[key] - minAmount);

    if (removed > 0) {
      converted += removed;
      newState[key] = waterState[key] - removed;
    } else {
      newState[key] = waterState[key];
    }
  }

  newState.total = waterState.total;
  newState.converted = converted;
  newState.water = waterState.water + converted;
  return newState;
}

function parseVolume(input = "", volume = 0) {
  let percentValue = null;
  const percentParsed = input.trim().match(/([\d.]+)%/);
  if (percentParsed) {
    percentValue = Math.round(parseFloat(percentParsed[1]) * volume * 10);
  }

  const unitParsed = input.trim().match(/([\d.]+)\s*([a-zA-Z]+)/);
  if (unitParsed) {
    const value = parseFloat(unitParsed[1]);
    const unit = unitParsed[2].toLowerCase();

    const units = {
      "ul": 1,
      "ml": 1e3,
      "l": 1e6,
    }

    if (percentValue && unit == "l") return percentValue;

    if (units[unit]) {
      return Math.round(value * units[unit]);
    }
  }
  return percentValue || 0;  
}

function setPasteStatus(t) {
  document.getElementById("waterPurifier-paste-status").textContent = t;
}

function setPurifierInputs(text) {
  const lines = text.split(/\r|\n|\r\n/);
  document.querySelectorAll("#waterPurifier-purity input").forEach(x => x.value = "");
  for (const line of lines) {
    if (!line) continue;
    console.log(line);
    const contMatch = line.trim().match(/^([a-zA-Z ]+)(?::|;)\s*(.+)$/);
    if (!contMatch) continue;
    const contInfo = contaminants.find(x => x.name == contMatch[1]);
    if (contInfo) {
      document.getElementById(`waterPurifier-${contInfo.tag}`).value = contMatch[2];
    } else if (contMatch[1] == "Water") {
      document.getElementById(`waterPurifier-water`).value = contMatch[2];
    }
  }
}

async function handlePastedImage(/** @type DataTransferItem */ item) {
  setPasteStatus("Processing...");

  const file = item.getAsFile();

  const dataURL = await convertToDataURL(file);

  document.getElementById("waterPurifier-paste-img").src = dataURL;

  const text = await runOCR(dataURL);

  setPurifierInputs(text);
  
  setPasteStatus("Done!");
}

async function convertToDataURL(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    }

    reader.readAsDataURL(file);
  })
}

async function runOCR(dataURL) {
  const result = await Tesseract.recognize(
    dataURL,
    "eng"
  );
  return result.data.text;
}

fillWaterQualityInfo();

CyberHandAppraiser.createHTML(document.getElementById("CyberHand"));
PlasmaCartAppraiser.createHTML(document.getElementById("PlasmaCart"));
RibwichAppraiser.createHTML(document.getElementById("Ribwich"));

document.addEventListener("paste", (event) => {
  const items = event.clipboardData.items;
  for (const key in items) {
    const item = items[key];
    if (item.kind == "file" && item.type.startsWith("image/")) {
      handlePastedImage(item);
      break;
    }
  }
});