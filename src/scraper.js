import * as cheerio from "cheerio";

export const BASE_URL = "https://cido.diba.cat";
export const SEARCH_URL =
  "https://cido.diba.cat/oposicions?" +
  "filtreParaulaClau%5Bkeyword%5D=Educaci%C3%B3+social&" +
  "ordenacio=DEFAULT&ordre=DESC&showAs=GRID&" +
  "filtreEstat%5BterminiPendent%5D=1&filtreEstat%5BterminiObert%5D=1";
export const USER_AGENT =
  "oposiciones-monitor/1.0 (+https://github.com/USER/oposiciones-monitor)";

const OFFER_PATH_RE = /^\/oposicions\/(\d+)\//;

export async function fetchOffers({ timeoutMs = 30000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(SEARCH_URL, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Language": "es-ES,ca-ES;q=0.9,es;q=0.8",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} fetching ${SEARCH_URL}`);
    }

    const html = await res.text();
    return parseOffers(html);
  } finally {
    clearTimeout(timeout);
  }
}

export function parseOffers(html) {
  const $ = cheerio.load(html);
  const byId = new Map();

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const match = href.match(OFFER_PATH_RE);
    if (!match) return;

    const id = match[1];
    if (byId.has(id)) return;

    const offer = parseOfferFromLink($, $(el), id);
    if (offer) byId.set(id, offer);
  });

  return [...byId.values()];
}

function parseOfferFromLink($, $link, id) {
  const title = $link.text().trim();
  const url = BASE_URL + $link.attr("href");
  if (!title) return null;

  const $container = findContainer($link);
  if (!$container || $container.length === 0) {
    return { id, title, url, institution: "", deadline: "", status: "" };
  }

  return {
    id,
    title,
    url,
    institution: extractInstitution($container, title),
    deadline: extractDeadline($container),
    status: extractStatus($container),
  };
}

function findContainer($link) {
  const keywords = ["card", "item", "oposicio", "result", "entry", "post"];
  let current = $link.parent();
  for (let i = 0; i < 10 && current.length > 0; i++) {
    const tag = current.prop("tagName")?.toLowerCase();
    if (tag === "article" || tag === "li" || tag === "div") {
      const cls = (current.attr("class") || "").toLowerCase();
      if (keywords.some((kw) => cls.includes(kw))) {
        return current;
      }
    }
    current = current.parent();
  }
  return $link.closest("article, li, div");
}

function extractInstitution($container, title) {
  const candidates = ["institution", "organisme", "entity", "organitzador", "entitat"];
  for (const kw of candidates) {
    const $el = $container.find(`[class*="${kw}" i]`).first();
    if ($el.length > 0) {
      const text = $el.text().trim();
      if (text && text !== title) return text;
    }
  }
  const lines = $container
    .text()
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s && s !== title);
  return lines[0] || "";
}

function extractDeadline($container) {
  const candidates = ["deadline", "termini", "plazo", "data-fi"];
  for (const kw of candidates) {
    const $el = $container.find(`[class*="${kw}" i]`).first();
    if ($el.length > 0) {
      const text = $el.text().trim();
      if (text) return text;
    }
  }
  const text = $container.text();
  const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
  if (dateMatch) return dateMatch[0];
  if (/obert permanentment/i.test(text)) return "Obert permanentment";
  return "";
}

function extractStatus($container) {
  const candidates = ["status", "estat", "state", "badge"];
  for (const kw of candidates) {
    const $el = $container.find(`[class*="${kw}" i]`).first();
    if ($el.length > 0) {
      const text = $el.text().trim();
      if (text) return text;
    }
  }
  const lower = $container.text().toLowerCase();
  if (lower.includes("termini obert")) return "Termini obert";
  if (lower.includes("pendent")) return "Pendent";
  return "";
}
