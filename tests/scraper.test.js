import { describe, it, expect } from "vitest";

import { parseOffers } from "../src/scraper.js";

const sampleHtml = `
<html><body>
  <div class="results">
    <article class="oposicio-card">
      <h2><a href="/oposicions/12345/educador-social-barcelona">Educador/a social</a></h2>
      <div class="institution">Ajuntament de Barcelona</div>
      <div class="termini">04/06/2026</div>
      <span class="estat">Termini obert</span>
    </article>
    <article class="oposicio-card">
      <h2><a href="/oposicions/67890/tecnic-educacio-girona">Tècnic d'educació</a></h2>
      <div class="institution">Diputació de Girona</div>
      <div class="termini">Obert permanentment</div>
      <span class="estat">Pendent</span>
    </article>
    <article class="oposicio-card">
      <h2><a href="/oposicions/12345/educador-social-barcelona-dup">Duplicada</a></h2>
      <div class="institution">Otra</div>
    </article>
    <a href="/otros/algo">Link no relevante</a>
  </div>
</body></html>
`;

describe("parseOffers", () => {
  it("extrae ofertas únicas con id, título y URL absoluta", () => {
    const offers = parseOffers(sampleHtml);
    expect(offers).toHaveLength(2);

    const first = offers.find((o) => o.id === "12345");
    expect(first).toBeDefined();
    expect(first.title).toBe("Educador/a social");
    expect(first.url).toBe("https://cido.diba.cat/oposicions/12345/educador-social-barcelona");
    expect(first.institution).toBe("Ajuntament de Barcelona");
    expect(first.deadline).toBe("04/06/2026");
    expect(first.status).toBe("Termini obert");
  });

  it("deduplica por id manteniendo el primer match", () => {
    const offers = parseOffers(sampleHtml);
    const first = offers.find((o) => o.id === "12345");
    expect(first.title).toBe("Educador/a social");
  });

  it("ignora enlaces que no son a /oposicions/{id}/", () => {
    const offers = parseOffers(sampleHtml);
    expect(offers.every((o) => o.id.match(/^\d+$/))).toBe(true);
  });

  it("devuelve lista vacía con HTML sin ofertas", () => {
    const offers = parseOffers("<html><body><p>nada</p></body></html>");
    expect(offers).toEqual([]);
  });

  it("tolera ofertas sin contenedor con metadatos completos", () => {
    const html = `<html><body><a href="/oposicions/999/x">Solo título</a></body></html>`;
    const offers = parseOffers(html);
    expect(offers).toHaveLength(1);
    expect(offers[0].id).toBe("999");
    expect(offers[0].title).toBe("Solo título");
  });

  it("captura 'Obert permanentment' como deadline", () => {
    const offers = parseOffers(sampleHtml);
    const second = offers.find((o) => o.id === "67890");
    expect(second.deadline).toBe("Obert permanentment");
  });
});
