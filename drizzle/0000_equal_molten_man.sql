CREATE TABLE `bitacora` (
	`id` text PRIMARY KEY NOT NULL,
	`planta_id` text NOT NULL,
	`tipo` text NOT NULL,
	`fecha` text NOT NULL,
	`nota` text,
	`editado_en` text,
	FOREIGN KEY (`planta_id`) REFERENCES `plantas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `fotos` (
	`id` text PRIMARY KEY NOT NULL,
	`planta_id` text NOT NULL,
	`url_blob` text NOT NULL,
	`fecha` text NOT NULL,
	`nota` text,
	FOREIGN KEY (`planta_id`) REFERENCES `plantas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `plantas` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`especie` text,
	`especie_sugerida_ia` text,
	`fecha_inicio` text NOT NULL,
	`foto_portada_url` text,
	`regla_riego_dias` integer DEFAULT 3,
	`regla_poda_dias` integer,
	`regla_fertilizacion_dias` integer,
	`activo` integer DEFAULT 1,
	`creado_en` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recomendaciones` (
	`id` text PRIMARY KEY NOT NULL,
	`planta_id` text NOT NULL,
	`foto_id` text,
	`texto` text NOT NULL,
	`tipo` text,
	`fecha_sugerida` text,
	`urgencia` text,
	`atendida` integer DEFAULT 0,
	`creado_en` text NOT NULL,
	FOREIGN KEY (`planta_id`) REFERENCES `plantas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`foto_id`) REFERENCES `fotos`(`id`) ON UPDATE no action ON DELETE no action
);
