export function makeId(prefix = "id") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function"
      ? Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) =>
          n.toString(36),
        ).join("")
      : Math.random().toString(36).slice(2);

  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}
