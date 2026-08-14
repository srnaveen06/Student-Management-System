-- ============================================
-- Student Management System - Database Schema
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS student_management;
USE student_management;

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    gender VARCHAR(20) NOT NULL,
    branch VARCHAR(50) NOT NULL,
    semester INT NOT NULL,
    dob DATE NOT NULL,
    address TEXT NOT NULL,
    image VARCHAR(255) DEFAULT NULL,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Admin table for authentication
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default admin (password: admin123)
-- Password is hashed using bcrypt
INSERT INTO admins (username, password) VALUES
('admin', '$2a$10$6ZrEKl9AoJsfzPx6jMK7ue5poxz.R/wOu.naGxcK53a3FiKSaWa32');

-- Insert sample students for testing
INSERT INTO students (student_id, name, email, phone, gender, branch, semester, dob, address, status) VALUES
('STU-2024-001', 'Aarav Sharma', 'aarav.sharma@email.com', '9876543210', 'Male', 'Computer Science', 5, '2002-05-15', '123 MG Road, Mumbai, Maharashtra', 'Active'),
('STU-2024-002', 'Priya Patel', 'priya.patel@email.com', '9876543211', 'Female', 'Electronics', 3, '2003-08-22', '456 Anna Salai, Chennai, Tamil Nadu', 'Active'),
('STU-2024-003', 'Rohan Gupta', 'rohan.gupta@email.com', '9876543212', 'Male', 'Mechanical', 7, '2001-12-10', '789 Park Street, Kolkata, West Bengal', 'Inactive'),
('STU-2024-004', 'Sneha Reddy', 'sneha.reddy@email.com', '9876543213', 'Female', 'Computer Science', 1, '2004-03-28', '321 Jubilee Hills, Hyderabad, Telangana', 'Active'),
('STU-2024-005', 'Vikram Singh', 'vikram.singh@email.com', '9876543214', 'Male', 'Civil', 5, '2002-07-05', '654 Rajouri Garden, New Delhi', 'Active'),
('STU-2024-006', 'Ananya Nair', 'ananya.nair@email.com', '9876543215', 'Female', 'Electronics', 3, '2003-11-18', '987 MG Road, Kochi, Kerala', 'Active'),
('STU-2024-007', 'Karthik Menon', 'karthik.menon@email.com', '9876543216', 'Male', 'Computer Science', 5, '2002-01-30', '147 Vasant Vihar, New Delhi', 'Inactive'),
('STU-2024-008', 'Divya Joshi', 'divya.joshi@email.com', '9876543217', 'Female', 'Mechanical', 1, '2004-06-12', '258 Deccan Gymkhana, Pune, Maharashtra', 'Active'),
('STU-2024-009', 'Arjun Das', 'arjun.das@email.com', '9876543218', 'Male', 'Civil', 7, '2001-09-25', '369 Salt Lake, Kolkata, West Bengal', 'Active'),
('STU-2024-010', 'Meera Iyer', 'meera.iyer@email.com', '9876543219', 'Female', 'Computer Science', 3, '2003-04-08', '741 T Nagar, Chennai, Tamil Nadu', 'Active'),
('STU-2024-011', 'Rahul Verma', 'rahul.verma@email.com', '9876543220', 'Male', 'Electronics', 5, '2002-10-14', '852 Andheri West, Mumbai, Maharashtra', 'Active'),
('STU-2024-012', 'Nisha Agarwal', 'nisha.agarwal@email.com', '9876543221', 'Female', 'Mechanical', 3, '2003-02-20', '963 Hazratganj, Lucknow, Uttar Pradesh', 'Active'),
('STU-2024-013', 'Suresh Kumar', 'suresh.kumar@email.com', '9876543222', 'Male', 'Civil', 1, '2004-07-16', '159 Malviya Nagar, Jaipur, Rajasthan', 'Active'),
('STU-2024-014', 'Pooja Das', 'pooja.das@email.com', '9876543223', 'Female', 'Computer Science', 7, '2001-05-09', '357 Gariahat, Kolkata, West Bengal', 'Inactive'),
('STU-2024-015', 'Amit Chauhan', 'amit.chauhan@email.com', '9876543224', 'Male', 'Electronics', 1, '2004-12-03', '468 Sector 18, Noida, Uttar Pradesh', 'Active');
