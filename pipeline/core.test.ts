import assert from "node:assert/strict";
import test from "node:test";
import { canonicalParts, normalizeBoolean, normalizeCategory } from "./core";

test("normaliza categorías con tildes y typos históricos", () => {
  assert.equal(normalizeCategory("diseño"), "diseno");
  assert.equal(normalizeCategory("profesioal"), "profesional");
});

test("normaliza valores booleanos", () => {
  assert.equal(normalizeBoolean("SI"), true);
  assert.equal(normalizeBoolean("no"), false);
});

test("extrae clave canónica del nombre", () => {
  assert.deepEqual(canonicalParts("diseño_3_RNM.jpg"), { category: "diseno", number: "03", author: "rnm" });
});
