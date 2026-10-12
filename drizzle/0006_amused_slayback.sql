CREATE TABLE `construction_diary_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`diary_id` text NOT NULL,
	`project_id` text NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `construction_diary_photos_object_key_unique` ON `construction_diary_photos` (`object_key`);