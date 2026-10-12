CREATE TABLE IF NOT EXISTS `construction_covers` (
	`project_id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `construction_covers_object_key_unique` ON `construction_covers` (`object_key`);--> statement-breakpoint
ALTER TABLE `construction_costs` ADD `payer` text DEFAULT '' NOT NULL;
