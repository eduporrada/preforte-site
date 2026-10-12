CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`amount` integer NOT NULL,
	`paid_at` text NOT NULL,
	`method` text DEFAULT 'Pix' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`client` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`paid_value` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'backlog' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`type` text DEFAULT 'Projeto arquitetônico' NOT NULL,
	`area_m2` real DEFAULT 0 NOT NULL,
	`color` text DEFAULT '#f2535c' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
