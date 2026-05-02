-- Remove profile fields from Users table
ALTER TABLE Users DROP COLUMN date_of_birth;
ALTER TABLE Users DROP COLUMN occupation;
ALTER TABLE Users DROP COLUMN emergency_contact_name;
ALTER TABLE Users DROP COLUMN emergency_contact_phone;