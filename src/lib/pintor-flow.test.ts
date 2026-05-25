import { describe, expect, it } from "vitest";

describe("pintor detailed flow smoke", () => {
  it("keeps the detailed wizard CSS contract stable", () => {
    const cssPath = "/dev-server/public/pintor/lovable-theme.css";
    const css = Bun.file(cssPath).text();

    return css.then((content) => {
      expect(content).toContain(".modal-box");
      expect(content).toContain("linear-gradient(135deg, #ff8a3d 0%, #ff6b35 35%, #ec4899 65%, #7b5cff 100%)");
      expect(content).toContain("#wa-preview-inline");
      expect(content).toContain(".summary-box");
      expect(content).toContain("html.kbd-open");
    });
  });
});