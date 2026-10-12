CREATE TABLE `board_columns` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`color` text DEFAULT '#4f46e5' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_system` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'Colaborador' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_email_unique` ON `team_members` (`email`);