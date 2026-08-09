class StrictJsonScanner {
  private index = 0;
  private readonly source: string;

  constructor(source: string) {
    this.source = source;
  }

  scan() {
    this.skipWhitespace();
    this.scanValue();
    this.skipWhitespace();
    if (this.index !== this.source.length)
      throw new Error("Malformed JSON trailing data");
  }

  private character() {
    return this.source[this.index];
  }

  private skipWhitespace() {
    while (/\s/.test(this.character() ?? "")) this.index += 1;
  }

  private scanValue() {
    this.skipWhitespace();
    const character = this.character();
    if (character === "{") return this.scanObject();
    if (character === "[") return this.scanArray();
    if (character === '"') return void this.scanString();
    if (character === "t") return this.scanLiteral("true");
    if (character === "f") return this.scanLiteral("false");
    if (character === "n") return this.scanLiteral("null");
    this.scanNumber();
  }

  private scanObject() {
    this.index += 1;
    this.skipWhitespace();
    const keys = new Set<string>();
    if (this.character() === "}") {
      this.index += 1;
      return;
    }
    while (true) {
      if (this.character() !== '"')
        throw new Error("Malformed JSON object key");
      const key = this.scanString();
      if (keys.has(key)) throw new Error(`Duplicate JSON key: ${key}`);
      keys.add(key);
      this.skipWhitespace();
      if (this.character() !== ":") throw new Error("Malformed JSON object");
      this.index += 1;
      this.scanValue();
      this.skipWhitespace();
      if (this.character() === "}") {
        this.index += 1;
        return;
      }
      if (this.character() !== ",") throw new Error("Malformed JSON object");
      this.index += 1;
      this.skipWhitespace();
    }
  }

  private scanArray() {
    this.index += 1;
    this.skipWhitespace();
    if (this.character() === "]") {
      this.index += 1;
      return;
    }
    while (true) {
      this.scanValue();
      this.skipWhitespace();
      if (this.character() === "]") {
        this.index += 1;
        return;
      }
      if (this.character() !== ",") throw new Error("Malformed JSON array");
      this.index += 1;
      this.skipWhitespace();
    }
  }

  private scanString() {
    const start = this.index;
    this.index += 1;
    while (this.index < this.source.length) {
      const character = this.character();
      if (character === '"') {
        this.index += 1;
        return JSON.parse(this.source.slice(start, this.index)) as string;
      }
      if (character === "\\") {
        this.index += 2;
        continue;
      }
      if (!character || character.charCodeAt(0) < 0x20)
        throw new Error("Malformed JSON string");
      this.index += 1;
    }
    throw new Error("Unterminated JSON string");
  }

  private scanLiteral(literal: string) {
    if (this.source.slice(this.index, this.index + literal.length) !== literal)
      throw new Error("Malformed JSON literal");
    this.index += literal.length;
  }

  private scanNumber() {
    const match = this.source
      .slice(this.index)
      .match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!match) throw new Error("Malformed JSON value");
    this.index += match[0].length;
  }
}

export function parseStrictJsonObject(source: string) {
  new StrictJsonScanner(source).scan();
  const value = JSON.parse(source) as unknown;
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("JSON document must be one object");
  return value as Record<string, unknown>;
}
