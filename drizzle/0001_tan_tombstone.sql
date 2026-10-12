CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `construction_costs` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`amount` integer NOT NULL,
	`spent_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `construction_diary` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`entry_date` text NOT NULL,
	`summary` text NOT NULL,
	`team_size` integer DEFAULT 0 NOT NULL,
	`weather` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `construction_schedule` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`planned_start` text NOT NULL,
	`planned_end` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `construction_settings` (
	`project_id` text PRIMARY KEY NOT NULL,
	`budget` integer DEFAULT 0 NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`planned_end` text DEFAULT '' NOT NULL
);
