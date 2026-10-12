ALTER TABLE `tasks` ADD `parent_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `estimated_minutes` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `tracked_minutes` integer DEFAULT 0 NOT NULL;