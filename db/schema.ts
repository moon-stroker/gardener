import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const plantas = sqliteTable("plantas", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  especie: text("especie"),
  especieSugeridaIa: text("especie_sugerida_ia"),
  fechaInicio: text("fecha_inicio").notNull(),
  fotoPortadaUrl: text("foto_portada_url"),
  reglaRiegoDias: integer("regla_riego_dias").default(3),
  reglaPodaDias: integer("regla_poda_dias"),
  reglaFertilizacionDias: integer("regla_fertilizacion_dias"),
  activo: integer("activo").default(1),
  creadoEn: text("creado_en").notNull(),
});

export const fotos = sqliteTable("fotos", {
  id: text("id").primaryKey(),
  plantaId: text("planta_id").notNull().references(() => plantas.id),
  urlBlob: text("url_blob").notNull(),
  fecha: text("fecha").notNull(),
  nota: text("nota"),
});

export const recomendaciones = sqliteTable("recomendaciones", {
  id: text("id").primaryKey(),
  plantaId: text("planta_id").notNull().references(() => plantas.id),
  fotoId: text("foto_id").references(() => fotos.id),
  texto: text("texto").notNull(),
  tipo: text("tipo"),
  fechaSugerida: text("fecha_sugerida"),
  urgencia: text("urgencia"),
  atendida: integer("atendida").default(0),
  creadoEn: text("creado_en").notNull(),
});

export const bitacora = sqliteTable("bitacora", {
  id: text("id").primaryKey(),
  plantaId: text("planta_id").notNull().references(() => plantas.id),
  tipo: text("tipo").notNull(),
  fecha: text("fecha").notNull(),
  nota: text("nota"),
  editadoEn: text("editado_en"),
});
