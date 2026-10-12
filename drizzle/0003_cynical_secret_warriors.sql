ALTER TABLE `projects` ADD COLUMN `completed_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `projects`
SET `completed_at` = `due_date`
WHERE `status` = 'done' AND `completed_at` = '' AND `due_date` <> '';
