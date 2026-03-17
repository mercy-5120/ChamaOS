CREATE DATABASE ChamaOS;
USE ChamaOS;

-- 1. Chama table
CREATE TABLE Chama (
    chama_id INT PRIMARY KEY AUTO_INCREMENT,
    chama_name VARCHAR(50) NOT NULL UNIQUE,
    invite_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    meeting_day VARCHAR(15) NOT NULL,
    contribution_amount DECIMAL(10,2) NOT NULL,
    contribution_due_day TINYINT DEFAULT 5,
    currency VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active TINYINT(1) DEFAULT 1
) ENGINE=InnoDB;

-- 2. Users table
CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    gender VARCHAR(10),
    location VARCHAR(100),
    password_hash VARCHAR(255),
    user_type VARCHAR(20) DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Chama members (many-to-many)
CREATE TABLE Chama_Members (
    member_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    chama_id INT NOT NULL,
    role VARCHAR(20) DEFAULT 'member',        -- chairperson | secretary | treasurer | member
    email VARCHAR(100),                       -- member email for quick reference
    phone_number VARCHAR(15),                 -- member phone for quick reference
    joined_date DATE,
    total_contributions DECIMAL(10,2) DEFAULT 0.00,

    UNIQUE(user_id, chama_id),

    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (chama_id) REFERENCES Chama(chama_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Run this if the table already exists:
-- ALTER TABLE Chama_Members ADD COLUMN role VARCHAR(20) DEFAULT 'member' AFTER chama_id;

-- 4. Transactions table
CREATE TABLE Transactions (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    chama_id INT NOT NULL,
    user_id INT NOT NULL,
    transaction_type VARCHAR(30) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    month VARCHAR(7),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    loan_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (chama_id) REFERENCES Chama(chama_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
) ENGINE=InnoDB;

-- 5. Loans table
CREATE TABLE Loans (
    loan_id INT PRIMARY KEY AUTO_INCREMENT,
    chama_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 5.00,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    remaining_balance DECIMAL(10,2),
    approved_at DATETIME NULL,
    rejected_at DATETIME NULL,

    FOREIGN KEY (chama_id) REFERENCES Chama(chama_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
) ENGINE=InnoDB;

-- 6. Meetings table
CREATE TABLE Meetings (
    meeting_id INT PRIMARY KEY AUTO_INCREMENT,
    chama_id INT NOT NULL,
    meeting_date DATE NOT NULL,
    location VARCHAR(200),
    agenda TEXT,
    decisions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (chama_id) REFERENCES Chama(chama_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 7. Meeting attendance
CREATE TABLE Meeting_Attendance (
    attendance_id INT PRIMARY KEY AUTO_INCREMENT,
    meeting_id INT NOT NULL,
    user_id INT NOT NULL,
    attended TINYINT(1) DEFAULT 0,

    UNIQUE(meeting_id, user_id),

    FOREIGN KEY (meeting_id) REFERENCES Meetings(meeting_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
) ENGINE=InnoDB;


-- Migration: Add email and phone_number columns to Chama_Members.
-- These columns store contact details for quick reference in membership records.

-- If columns already exist, you can skip the ALTER statements.
-- Simply run the UPDATE to backfill missing values from Users table.

ALTER TABLE Chama_Members ADD COLUMN email VARCHAR(100);
ALTER TABLE Chama_Members ADD COLUMN phone_number VARCHAR(15);

-- Migration: Add monthly contribution due day setting on Chama.
ALTER TABLE Chama ADD COLUMN contribution_due_day TINYINT DEFAULT 5;

UPDATE Chama_Members
JOIN Users ON Users.user_id = Chama_Members.user_id
SET Chama_Members.email = IFNULL(Chama_Members.email, Users.email),
    Chama_Members.phone_number = IFNULL(Chama_Members.phone_number, Users.phone_number);

-- Migration: Add loan decision timestamps.
-- If these columns already exist, skip the ALTER statement that fails with Duplicate column.
ALTER TABLE Loans ADD COLUMN approved_at DATETIME NULL;
ALTER TABLE Loans ADD COLUMN rejected_at DATETIME NULL;

-- 8. Announcements table
CREATE TABLE Announcements (
    announcement_id INT PRIMARY KEY AUTO_INCREMENT,
    chama_id INT NOT NULL,
    posted_by INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (chama_id) REFERENCES Chama(chama_id) ON DELETE CASCADE,
    FOREIGN KEY (posted_by) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;