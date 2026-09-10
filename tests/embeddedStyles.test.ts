import { expect, test } from "bun:test";
import { scopeEmbeddedCss } from "../src/shared/utils/embeddedStyles";

test("embedding scopes document selectors without corrupting the editor's classes", () => {
  const result = scopeEmbeddedCss(':root{--ink:white}html,body{height:100vh}.accordion-body,.picker-modal-body,#html-preview{max-height:82vh}html[data-display-mode="standalone"] .app-shell{height:100dvh}');
  expect(result).toContain(":host{--ink:white}.posteroom-surface,.posteroom-surface");
  expect(result).toContain(".accordion-body,.picker-modal-body,#html-preview");
  expect(result).toContain('.posteroom-surface[data-display-mode="standalone"]');
  expect(result).toContain("calc(var(--posteroom-height) * 0.82)");
  expect(result).not.toMatch(/\d+d?vh/);
});
