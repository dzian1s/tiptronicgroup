const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const INPUT_FILE = path.join(__dirname, "..", "imports", "upload.htm");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "catalog.json");
const IMAGE_BASE_URL = "https://img.tiptronicgroup.com";

function makeImageUrl(rawPath) {
  const value = normalizeText(rawPath);
  if (!value) return "";

  const fileName = value.split("/").filter(Boolean).pop();
  if (!fileName) return "";

  return `${IMAGE_BASE_URL}/${fileName}`;
}

function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(value) {
  const cleaned = normalizeText(value)
    .replace(/\s/g, "")
    .replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function cleanType(group, type) {
  const g = normalizeText(group);
  const t = normalizeText(type);

  if (!t) return "";

  if (g && t.toLowerCase().startsWith(g.toLowerCase())) {
    return normalizeText(t.slice(g.length));
  }

  return t;
}

function prettifyType(value) {
  const v = normalizeText(value);
  if (!v) return "";

  return v
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function makeCardKey(item) {
  return [
    item.group,
    item.displayType,
    item.brand,
    item.article,
    item.name,
    item.price,
    item.image
  ].join("||");
}

function safeId(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`Не найден файл выгрузки: ${INPUT_FILE}`);
  process.exit(1);
}

const html = fs.readFileSync(INPUT_FILE, "utf8");
const $ = cheerio.load(html, { decodeEntities: false });

const tables = $("table");
if (!tables.length) {
  console.error("В HTML не найдено ни одной таблицы.");
  process.exit(1);
}

let bestTable = null;
let maxRows = 0;

tables.each((_, table) => {
  const rowCount = $(table).find("tr").length;
  if (rowCount > maxRows) {
    maxRows = rowCount;
    bestTable = table;
  }
});

if (!bestTable) {
  console.error("Не удалось определить таблицу с данными.");
  process.exit(1);
}

const rows = $(bestTable).find("tr");

let headerRowIndex = -1;
let headers = [];

rows.each((index, row) => {
  const cells = $(row)
    .find("th, td")
    .map((_, cell) => normalizeText($(cell).text()))
    .get();

  const joined = cells.join(" | ").toLowerCase();

  if (
    joined.includes("группа") &&
    joined.includes("артикул") &&
    joined.includes("цена")
  ) {
    headerRowIndex = index;
    headers = cells;
    return false;
  }
});

if (headerRowIndex === -1 || headers.length === 0) {
  console.error("Не найдена строка заголовков с нужными колонками.");
  process.exit(1);
}

const headerMap = {};
headers.forEach((header, i) => {
  headerMap[header] = i;
});

function getCell(cells, ...headerNames) {
  for (const headerName of headerNames) {
    const idx = headerMap[headerName];
    if (idx !== undefined) {
      return normalizeText(cells[idx] || "");
    }
  }
  return "";
}

const rawItems = [];

rows.each((index, row) => {
  if (index <= headerRowIndex) return;

  const cells = $(row)
    .find("td")
    .map((_, cell) => normalizeText($(cell).text()))
    .get();

  if (!cells.length) return;

  const article = getCell(cells, "Артикул", "Номенклатура.Артикул");
  const name = getCell(
    cells,
    "Наименование для печати",
    "Номенклатура.Наименование для печати"
  );
  const price = parseNumber(getCell(cells, "Цена"));

  if (!article && !name) return;

  const rawGroup = getCell(cells, "Группа");
  const rawType = getCell(cells, "Номенклатура.Группа");
  const cleanedType = cleanType(rawGroup, rawType);

    const item = {
        group: rawGroup,
        type: rawType,
        displayType: prettifyType(cleanedType),
        brand: getCell(cells, "Производитель", "Номенклатура.Производитель"),
        article,
        name,
        image: makeImageUrl(
            getCell(cells, "Текстовое описание", "Номенклатура.Текстовое описание")
        ),
        warehouse: getCell(cells, "Склад"),
        stock: parseNumber(getCell(cells, "Остаток")),
        price
    };

  rawItems.push(item);
});

const grouped = new Map();

for (const item of rawItems) {
  const key = makeCardKey(item);

  if (!grouped.has(key)) {
    grouped.set(key, {
      id: "",
      group: item.group,
      type: item.type,
      displayType: item.displayType,
      brand: item.brand,
      article: item.article,
      name: item.name,
      image: item.image,
      price: item.price,
      totalStock: 0,
      available: false,
      stocks: []
    });
  }

  const card = grouped.get(key);

  if (item.warehouse) {
    const existingWarehouse = card.stocks.find(
      (stock) => normalizeText(stock.warehouse) === normalizeText(item.warehouse)
    );

    if (existingWarehouse) {
      existingWarehouse.qty += item.stock;
    } else {
      card.stocks.push({
        warehouse: item.warehouse,
        qty: item.stock
      });
    }
  }

  card.totalStock += item.stock;
  card.available = card.totalStock > 0;
}

const result = Array.from(grouped.values()).map((item, index) => {
  const base = safeId(
    `${item.group}-${item.displayType}-${item.article}-${item.price}`
  );

  return {
    ...item,
    id: base ? `${base}-${index + 1}` : `item-${index + 1}`
  };
});

result.sort((a, b) => {
  return (
    normalizeText(a.group).localeCompare(normalizeText(b.group), "ru") ||
    normalizeText(a.displayType).localeCompare(normalizeText(b.displayType), "ru") ||
    normalizeText(a.name).localeCompare(normalizeText(b.name), "ru")
  );
});

fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), "utf8");

console.log(`Готово. Сохранено ${result.length} карточек в ${OUTPUT_FILE}`);
