import { describe, expect, it } from "vitest";
import { zielNachFreigabe } from "../useScrollLock";

describe("zielNachFreigabe", () => {
  it("kehrt auf derselben Seite an die gemerkte Stelle zurueck", () => {
    expect(zielNachFreigabe("/uebungen", "/uebungen", 640)).toBe(640);
  });

  it("startet nach einem Seitenwechsel oben", () => {
    expect(zielNachFreigabe("/", "/uebungen/abc-123", 640)).toBe(0);
  });

  it("behandelt Position 0 wie jede andere gemerkte Stelle", () => {
    expect(zielNachFreigabe("/koerper", "/koerper", 0)).toBe(0);
  });
});
