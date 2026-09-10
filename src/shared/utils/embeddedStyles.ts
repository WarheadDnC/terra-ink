/** Convert document roots and viewport heights for the isolated shop mount. */
export function scopeEmbeddedCss(css: string): string {
  return css.replace(/:root/g, ":host")
    // Do not rewrite class names such as .accordion-body or #html-preview.
    .replace(/(?<![\w.#-])(?:html|body)(?=[\s,{.#:[>])/g, ".posteroom-surface")
    .replace(/(\d+(?:\.\d+)?)d?vh\b/g, (_, size) => `calc(var(--posteroom-height) * ${Number(size) / 100})`);
}
