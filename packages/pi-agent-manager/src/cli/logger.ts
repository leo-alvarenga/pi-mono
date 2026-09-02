import type {
  ExtensionContext,
  Theme,
  ThemeColor,
} from "@earendil-works/pi-coding-agent";
import { LOGGER_PREFIX } from "../constants";

const TYPE_COLORS: Record<string, ThemeColor> = {
  info: "accent",
};

export class Logger {
  private theme: Theme;
  private ctx: ExtensionContext;

  constructor(ctx: ExtensionContext) {
    this.ctx = ctx;
    this.theme = ctx.ui.theme;
  }

  log(message: string, type: "info" | "error" | "warning" = "info"): void {
    const prefix = this.prefix(type);
    this.ctx.ui.notify(`${prefix} ${message}`, type);
  }

  bold(text: string): string {
    return this.theme.bold(text);
  }

  fg(color: ThemeColor, text: string): string {
    try {
      return this.theme.fg(color, text);
    } catch {
      return text;
    }
  }

  private prefix(type: string): string {
    const fg = TYPE_COLORS[type];
    let p = this.bold(LOGGER_PREFIX);
    return fg ? this.fg(fg, p) : p;
  }
}

export function createLogger(ctx: ExtensionContext): Logger {
  return new Logger(ctx);
}
