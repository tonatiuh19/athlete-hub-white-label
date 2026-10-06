-- Purge Triboo marketplace communities, blog, and gamification tables from Atleita.
-- Historical migration files that created these tables remain for audit; this drops live schema.

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `athlete_achievements`;
DROP TABLE IF EXISTS `athlete_gamification`;
DROP TABLE IF EXISTS `achievement_definitions`;
DROP TABLE IF EXISTS `athlete_team_members`;
DROP TABLE IF EXISTS `athlete_teams`;
DROP TABLE IF EXISTS `blog_posts`;

SET FOREIGN_KEY_CHECKS = 1;
