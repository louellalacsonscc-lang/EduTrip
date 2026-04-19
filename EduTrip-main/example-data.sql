USE eduevent;

-- =====================================================
-- 1. INSERT EXAMPLE STUDENTS
-- =====================================================

INSERT IGNORE INTO users (name, student_number, course, section, year, birthdate, age, sex, email, password, role, verified) VALUES
-- BSCS Students
('Delacruz, Juan M', 'S2026001', 'BSCS', 'A', '2nd yr', '2004-03-15', 20, 'male', 'juan.delacruz@student.edu', '$2b$10$gFlN0xAss0OKcVNnhpryBeqhtUEyx3p968HSpCh75aYaV51ofXLb.', 'student', 1),
('Santos, Maria C', 'S2026002', 'BSCS', 'B', '3rd yr', '2003-07-22', 21, 'female', 'maria.santos@student.edu', '$2b$10$gFlN0xAss0OKcVNnhpryBeqhtUEyx3p968HSpCh75aYaV51ofXLb.', 'student', 1),
('Reyes, Pedro L', 'S2026003', 'BSCS', 'A', '1st yr', '2005-11-08', 19, 'male', 'pedro.reyes@student.edu', '$2b$10$gFlN0xAss0OKcVNnhpryBeqhtUEyx3p968HSpCh75aYaV51ofXLb.', 'student', 1),
('Villanueva, Angela R', 'S2026006', 'BSCS', 'C', '2nd yr', '2004-08-12', 20, 'female', 'angela.villanueva@student.edu', '$2b$10$gFlN0xAss0OKcVNnhpryBeqhtUEyx3p968HSpCh75aYaV51ofXLb.', 'student', 1),

-- BSHM Students
('Garcia, Sofia A', 'S2026004', 'BSHM', 'C', '2nd yr', '2004-05-30', 20, 'female', 'sofia.garcia@student.edu', '$2b$10$gFlN0xAss0OKcVNnhpryBeqhtUEyx3p968HSpCh75aYaV51ofXLb.', 'student', 1),
('Mendoza, Carlo R', 'S2026005', 'BSHM', 'D', '4th yr', '2002-09-14', 22, 'male', 'carlo.mendoza@student.edu', '$2b$10$gFlN0xAss0OKcVNnhpryBeqhtUEyx3p968HSpCh75aYaV51ofXLb.', 'student', 1),
('Cruz, Isabella Marie S', 'S2026007', 'BSHM', 'B', '3rd yr', '2003-12-03', 21, 'female', 'isabella.cruz@student.edu', '$2b$10$gFlN0xAss0OKcVNnhpryBeqhtUEyx3p968HSpCh75aYaV51ofXLb.', 'student', 1),

-- BSBA Students
('Fernandez, Miguel T', 'S2026008', 'BSBA', 'A', '4th yr', '2002-02-28', 22, 'male', 'miguel.fernandez@student.edu', '$2b$10$gFlN0xAss0OKcVNnhpryBeqhtUEyx3p968HSpCh75aYaV51ofXLb.', 'student', 1),
('Torres, Jasmine B', 'S2026009', 'BSBA', 'B', '1st yr', '2005-06-17', 19, 'female', 'jasmine.torres@student.edu', '$2b$10$gFlN0xAss0OKcVNnhpryBeqhtUEyx3p968HSpCh75aYaV51ofXLb.', 'student', 1),

-- BSED Student
('Aquino, Rafael D', 'S2026010', 'BSED', 'A', '3rd yr', '2003-10-05', 21, 'male', 'rafael.aquino@student.edu', '$2b$10$gFlN0xAss0OKcVNnhpryBeqhtUEyx3p968HSpCh75aYaV51ofXLb.', 'student', 1);

-- =====================================================
-- 2. INSERT EXAMPLE EVENTS
-- =====================================================
-- Event 1: Tech Conference (Active - for BSCS)
INSERT INTO events (title, description, date, location, course, image_url, status, max_participants, current_participants) VALUES
('Tech Innovators Conference 2026', 
 'Join us for a day of cutting-edge technology discussions, workshops, and networking with industry professionals. Topics include AI, Web Development, and Cybersecurity.',
 DATE_ADD(CURDATE(), INTERVAL 14 DAY),
 'Main Convention Hall',
 'BSCS',
 NULL,
 'active',
 50,
 0);

SET @event1_id = LAST_INSERT_ID();

-- Event 2: Hospitality Excellence Seminar (Active - for BSHM)
INSERT INTO events (title, description, date, location, course, image_url, status, max_participants, current_participants) VALUES
('Hospitality Excellence Seminar 2026',
 'A comprehensive seminar covering hotel management, customer service excellence, and tourism trends. Perfect for hospitality students looking to enhance their skills.',
 DATE_ADD(CURDATE(), INTERVAL 21 DAY),
 'Hotel Grand Ballroom',
 'BSHM',
 NULL,
 'active',
 30,
 0);

SET @event2_id = LAST_INSERT_ID();

-- =====================================================
-- 3. INSERT REGISTRATION REQUESTS (APPROVED)
-- =====================================================
-- Tech Conference Registrations (BSCS students)
INSERT INTO registration_requests (user_id, event_id, status, created_at) VALUES
((SELECT id FROM users WHERE email = 'juan.delacruz@student.edu'), @event1_id, 'approved', NOW()),
((SELECT id FROM users WHERE email = 'maria.santos@student.edu'), @event1_id, 'approved', NOW()),
((SELECT id FROM users WHERE email = 'pedro.reyes@student.edu'), @event1_id, 'approved', NOW()),
((SELECT id FROM users WHERE email = 'angela.villanueva@student.edu'), @event1_id, 'approved', NOW());

-- Hospitality Seminar Registrations (BSHM students)
INSERT INTO registration_requests (user_id, event_id, status, created_at) VALUES
((SELECT id FROM users WHERE email = 'sofia.garcia@student.edu'), @event2_id, 'approved', NOW()),
((SELECT id FROM users WHERE email = 'carlo.mendoza@student.edu'), @event2_id, 'approved', NOW()),
((SELECT id FROM users WHERE email = 'isabella.cruz@student.edu'), @event2_id, 'approved', NOW());

-- Add one pending registration for testing
INSERT INTO registration_requests (user_id, event_id, status, created_at) VALUES
((SELECT id FROM users WHERE email = 'miguel.fernandez@student.edu'), @event1_id, 'pending', NOW());

-- =====================================================
-- 4. INSERT EXAMPLE BUSES
-- =====================================================
INSERT INTO buses (bus_number, capacity, current_passengers) VALUES
('001', 40, 0),
('002', 30, 0),
('003', 25, 0);

-- =====================================================
-- 5. VERIFY DATA WAS INSERTED
-- =====================================================
SELECT '=== USERS ===' as '';
SELECT id, name, email, course, section, year FROM users WHERE email LIKE '%@student.edu' ORDER BY course, name;

SELECT '=== EVENTS ===' as '';
SELECT id, title, date, location, course, status FROM events WHERE status = 'active';

SELECT '=== REGISTRATIONS ===' as '';
SELECT u.name, u.course, e.title, rr.status 
FROM registration_requests rr
JOIN users u ON rr.user_id = u.id
JOIN events e ON rr.event_id = e.id
ORDER BY e.title, rr.status, u.name;

SELECT '=== BUSES ===' as '';
SELECT * FROM buses;