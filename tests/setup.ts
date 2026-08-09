import { readFileSync } from "node:fs";
import path from "node:path";

const envPath = path.resolve(import.meta.dirname, "../.env.local");
try {
  const contenido = readFileSync(envPath, "utf-8");
  for (const linea of contenido.split("\n")) {
    const match = linea.match(/^([\w.-]+)\s*=\s*"?(.*?)"?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
} catch {
  // .env.local no existe; las pruebas que dependen de variables de entorno fallarán con un mensaje claro
}
