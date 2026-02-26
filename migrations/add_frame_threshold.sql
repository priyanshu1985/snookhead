-- Add frame_threshold to games
ALTER TABLE `games` ADD COLUMN IF NOT EXISTS `frame_threshold` INT DEFAULT 30;

-- Add current_frame_start_time to active_tables
ALTER TABLE `active_tables` ADD COLUMN IF NOT EXISTS `current_frame_start_time` datetime DEFAULT NULL;
