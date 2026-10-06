-- Resend broadcast topic for organizer event updates (platform-wide, admin-editable).

INSERT INTO `platform_settings` (`setting_key`, `setting_value`)
VALUES ('resend_event_updates_topic', JSON_OBJECT('topicId', NULL))
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;
