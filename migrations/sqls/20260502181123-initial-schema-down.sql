-- Rollback initial schema migration - drops all tables

-- Drop tables in reverse order to handle foreign key constraints
DROP TABLE IF EXISTS Contact_Messages;
DROP TABLE IF EXISTS Welfare_Requests;
DROP TABLE IF EXISTS Disciplinary_Records;
DROP TABLE IF EXISTS Member_Reminder_Preferences;
DROP TABLE IF EXISTS Group_Documents;
DROP TABLE IF EXISTS Announcements;
DROP TABLE IF EXISTS Meeting_Attachments;
DROP TABLE IF EXISTS Meeting_Attendance;
DROP TABLE IF EXISTS Meetings;
DROP TABLE IF EXISTS Loans;
DROP TABLE IF EXISTS Transactions;
DROP TABLE IF EXISTS Chama_Members;
DROP TABLE IF EXISTS Users;
DROP TABLE IF EXISTS Chama;