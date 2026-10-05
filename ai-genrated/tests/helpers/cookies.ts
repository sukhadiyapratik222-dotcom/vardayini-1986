export interface CookieOptions {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  maxAge?: number;
  expires?: Date;
  [key: string]: any;
}

export interface CookieItem {
  name: string;
  value: string;
  options?: CookieOptions;
}

export class InMemoryCookieStore {
  private cookies = new Map<string, CookieItem>();

  get(name: string) {
    const item = this.cookies.get(name);
    return item ? { name: item.name, value: item.value } : undefined;
  }

  getAll() {
    return Array.from(this.cookies.values()).map((c) => ({ name: c.name, value: c.value }));
  }

  set(nameOrObj: string | CookieItem, value?: string, options?: CookieOptions) {
    if (typeof nameOrObj === "string") {
      this.cookies.set(nameOrObj, { name: nameOrObj, value: value ?? "", options });
    } else {
      this.cookies.set(nameOrObj.name, {
        name: nameOrObj.name,
        value: nameOrObj.value ?? "",
        options: nameOrObj.options,
      });
    }
  }

  delete(name: string) {
    this.cookies.delete(name);
  }

  has(name: string) {
    return this.cookies.has(name);
  }

  clear() {
    this.cookies.clear();
  }

  toHeaderString() {
    return Array.from(this.cookies.values())
      .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
      .join("; ");
  }
}

export const mockCookieStore = new InMemoryCookieStore();
