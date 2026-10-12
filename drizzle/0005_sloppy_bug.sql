CREATE TABLE `task_time_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`task_id` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text DEFAULT '' NOT NULL,
	`duration_seconds` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `construction_costs` ADD `supplier` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `construction_costs` ADD `payment_status` text DEFAULT 'Pago' NOT NULL;--> statement-breakpoint
ALTER TABLE `construction_diary` ADD `occurrences` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `construction_diary` ADD `created_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `construction_settings` ADD `contract_value` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `timer_started_at` text DEFAULT '' NOT NULL;