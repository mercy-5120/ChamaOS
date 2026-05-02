-- Add profile fields to Users table
ALTER TABLE Users ADD COLUMN date_of_birth DATE;
ALTER TABLE Users ADD COLUMN occupation VARCHAR(100);
ALTER TABLE Users ADD COLUMN emergency_contact_name VARCHAR(100);
ALTER TABLE Users ADD COLUMN emergency_contact_phone VARCHAR(15);