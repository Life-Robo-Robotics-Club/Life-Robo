-- Initial content for Life Robo. Everything here is editable from /admin.
-- Items marked "confirm" in README need verification by the club.

INSERT INTO settings (key, value) VALUES
('siteName', '"Life Robo — Robotics Club, FoET, University of Lucknow"'),
('shortName', '"Life Robo"'),
('tagline', '"Innovate. Build. Compete."'),
('logoUrl', '"/brand/logo-badge.png"'),
('heroEyebrow', '"Building robots at FoET, University of Lucknow, since 2023"'),
('heroHeadline', '"Where robots are built and ideas come alive."'),
('heroSubhead', '"A student-led robotics community at the Faculty of Engineering & Technology, University of Lucknow — learning electronics, code and mechanics by building real machines."'),
('heroPrimaryCta', '{"label":"Join the club","href":"/join"}'),
('heroSecondaryCta', '{"label":"Explore events","href":"/events"}'),
('heroImage', '"/photos/repo/repo-workshop-05.jpg"'),
('aboutHeading', '"A student-led robotics community that learns by building."'),
('aboutBody', '"Life Robo brings together students who want to go beyond the textbook. Through lecture series, hands-on workshops and guest talks from scientists at ISRO and DRDO, members learn engineering, coding and teamwork — and turn ideas into working robots."'),
('aboutImage', '"/photos/repo/repo-workshop-02.jpg"'),
('vision', '"To be the home of robotics at the University of Lucknow — a space where curiosity becomes engineering."'),
('mission', '"Make robotics accessible to every student through open sessions, mentorship and real builds, and prepare teams to compete."'),
('stats', '[{"value":"1,100+","label":"LinkedIn followers"},{"value":"2023","label":"Building since"},{"value":"10+","label":"Sessions & talks"},{"value":"Weekly","label":"Build sessions"}]'),
('tracks', '[{"title":"Robot building workshops","description":"Hands-on builds — from line followers to sensor-driven bots — with live demos."},{"title":"Coding & automation","description":"Microcontrollers, embedded C, sensors and control logic, taught by doing."},{"title":"Competition training","description":"Strategy, iteration and testing to take builds to inter-college events."},{"title":"Talks & mentorship","description":"Sessions with scientists and engineers from ISRO, DRDO and industry."}]'),
('process', '[{"title":"Join the club","description":"Sign up, attend an intro session and find your track."},{"title":"Design & prototype","description":"Sketch the mechanism, pick sensors, plan the circuit."},{"title":"Build & program","description":"Assemble, wire and write the code that brings it to life."},{"title":"Test & compete","description":"Tune, debug, demo — and take it to competitions."}]'),
('roboFacts', '["The word robot comes from the Czech robota, meaning forced labour, first used in Karel Čapek''s 1920 play R.U.R.","Unimate, the first industrial robot, started work on a General Motors assembly line in 1961.","A PID controller combines proportional, integral and derivative terms — the same idea that keeps a line follower on track.","Chandrayaan-3''s Pragyan rover is a six-wheeled robot that explored the lunar south polar region in 2023.","Most hobby servos read a pulse of about 1–2 ms every 20 ms to decide their angle."]'),
('importantLinks', '[{"label":"University of Lucknow","url":"https://www.lkouniv.ac.in/"},{"label":"Faculty of Engineering & Technology","url":"https://www.lkouniv.ac.in/en/page/faculty-of-engineering-and-technology"}]'),
('socials', '{"instagram":"https://www.instagram.com/liferobo.foet.lu/","x":"https://x.com/liferobo_foet/","linkedin":"https://www.linkedin.com/in/roboticsclublu/"}'),
('contactEmail', '""'),
('address', '"Faculty of Engineering & Technology, University of Lucknow, Lucknow, Uttar Pradesh"'),
('joinOpen', 'true'),
('joinHeading', '"Build with us."'),
('joinBody', '"Tell us a little about yourself and what you want to build. We will reach out with the next session and the right track for you."'),
('seoTitle', '"Life Robo — Robotics Club, FoET, University of Lucknow"'),
('seoDescription', '"Life Robo is the student-led robotics club of the Faculty of Engineering & Technology, University of Lucknow — workshops, lecture series, guest talks and real robot builds."'),
('ogImage', '"/brand/og-default.jpg"');

INSERT INTO alerts (message, link_url, link_label, image, tone, active, priority) VALUES
('Robotics Workshop-III: Line Following Robot — live build and demo. See the highlights.', '/events/robotics-workshop-iii-line-following-robot', 'View event', '/photos/repo/repo-workshop-08.jpg', 'highlight', 1, 10);

INSERT INTO events (slug, title, starts_at, venue, summary, body, cover, cover_alt, images, register_url, featured) VALUES
('robotics-workshop-iii-line-following-robot',
 'Robotics Workshop-III: Line Following Robot — Live Building and Demo',
 '2026-04-19T07:00:00.000Z', 'Faculty of Engineering & Technology, University of Lucknow',
 'The third workshop of the series: building a line following robot live, followed by a demo.',
 'Life Robo conducted the third workshop of its Robotics Workshops Series — a live build of a line following robot, ending with a working demo.',
 '/photos/team-line-final.jpg', 'Arduino-based line following robot', '[]', '', 1),
('robotics-workshop-ii-iot-xr',
 'Robotics Workshop-II: Exploring Emerging Technologies with IoT & XR',
 '2026-04-17T07:00:00.000Z', 'Faculty of Engineering & Technology, University of Lucknow',
 'The second workshop of the series, exploring emerging technologies with IoT and XR.',
 'The second workshop in the Robotics Workshops Series explored emerging technologies — the Internet of Things and extended reality — and how they connect to robotics.',
 '/photos/repo/repo-workshop-03.jpg', 'Students at a Life Robo workshop', '[]', '', 0),
('robotics-workshops-series-2026',
 'Robotics Workshops Series 2026 — Inauguration',
 '2026-02-21T07:00:00.000Z', 'Vishwakarma Auditorium, FoET, University of Lucknow',
 'A weekend workshop series on robotics, inaugurated with chief guest Mr. Abhishek Singh of ISRO.',
 'The Robotics Workshops Series began on Saturday, 21 February 2026 and runs on weekends.

- **Chief Guest:** Mr. Abhishek Singh, Scientist at URSC & Program Manager, Chandrayaan-3, ISRO
- **Chief Patron:** Prof. J. P. Saini, Vice-Chancellor, University of Lucknow
- **Patron:** Prof. S. P. Singh, Dean, FoET
- **Student coordinators:** Amit Chauhan (Head) and Ahmad Tarique (Co-head)',
 '/photos/repo/repo-event-workshop-2026.jpg', 'Robotics Workshops Series 2026 poster',
 '["/photos/repo/repo-workshop-01.jpg","/photos/repo/repo-workshop-04.jpg","/photos/repo/repo-workshop-06.jpg","/photos/repo/repo-workshop-07.jpg"]', '', 1),
('antariksh-manthan-2026-career-in-space',
 'Antariksh Manthan 2026 — Talk on Career in Space',
 '2026-02-21T07:00:00.000Z', 'Vishwakarma Auditorium, FoET, University of Lucknow',
 'A talk on careers in space science by Mr. Abhishek Singh, Scientist at URSC and Program Manager, Chandrayaan-3.',
 'As part of Antariksh Manthan 2026, Life Robo hosted a talk on careers in space by **Mr. Abhishek Singh**, Scientist at the U R Rao Satellite Centre (URSC) and Program Manager for Chandrayaan-3, ISRO.',
 '/photos/workshop-today-banner.jpg', 'Antariksh Manthan 2026 — Talk on Career in Space poster', '[]', '', 1),
('roboeminence-2023',
 'Roboeminence',
 '2023-12-23T07:00:00.000Z', 'Vishwakarma Auditorium, New Building, FoET',
 'A session on robotics and a summary of the lecture series, with guest speaker Er. Vidya Shankar Pandey of DRDO.',
 'Roboeminence closed the 2023 lecture series with a session on robotics.

- **Guest speaker:** Er. Vidya Shankar Pandey, Scientist ''E'', DMSRDE, DRDO Kanpur
- **Patrons:** Prof. Alok Kumar Rai, Vice-Chancellor, and Prof. A. K. Singh, Dean, FoET
- **Program convenors:** Dr. Kamlesh Tiwari and Dr. Siddharth Singh; co-convenor Er. Prashant Kumar Singh
- **Student coordinator:** Mr. Pratham, Head — Life Robo
- **Supported by:** Codevirus Security',
 '/photos/repo/repo-event-roboeminence.jpg', 'Roboeminence event poster', '[]', '', 0),
('lecture-series-robotics-automation-2023',
 'Lecture Series on Robotics and Automation',
 '2023-10-15T07:00:00.000Z', 'Faculty of Engineering & Technology, University of Lucknow',
 'An on-campus lecture series introducing robotics and automation, starting with "What is a robot?".',
 'Life Robo ran a lecture series on robotics and automation on campus, beginning with *Lecture 01: Introduction to Robotics — What is a robot?*',
 '/photos/repo/repo-event-lecture-series.jpg', 'Lecture series on robotics and automation poster',
 '["/photos/workshop-whatsapp-02.jpg","/photos/workshop-whatsapp-16.jpg","/photos/repo/repo-lecture-03.jpg","/photos/repo/repo-lecture-06.jpg","/photos/repo/repo-lecture-09.jpg"]', '', 0),
('introductory-workshop-robotics-automation-2023',
 'Introductory Workshop: Robotics and Automation',
 '2023-10-07T07:00:00.000Z', 'Faculty of Engineering & Technology, University of Lucknow',
 'The club''s introductory workshop on robotics and automation.',
 'Life Robo''s introductory workshop on robotics and automation at FoET, University of Lucknow.',
 '/photos/repo/repo-event-workshop-main.jpg', 'Introductory workshop on robotics and automation poster', '[]', '', 0);

INSERT INTO projects (slug, title, category, summary, body, cover, cover_alt, tags, links, featured, sort) VALUES
('line-following-robot', 'Line Following Robot', 'Line Followers',
 'An Arduino-based line follower built and demoed live during Workshop-III.',
 'An IR-sensor line follower built on an Arduino, tuned for stable tracking. Built live during Robotics Workshop-III.',
 '/photos/team-line-final.jpg', 'Arduino line following robot car', '["Arduino","IR sensors","PID"]', '[]', 1, 1),
('desktop-robotic-arm', 'Desktop Robotic Arm', 'Automation',
 'A servo-driven desktop robotic arm controlled by a microcontroller.',
 'A multi-axis desktop robotic arm built with hobby servos and a microcontroller.',
 '/photos/team-arduino-arm.jpg', 'Desktop robotic arm', '["Servos","Arduino","Kinematics"]', '[]', 1, 2);

INSERT INTO team (name, role, grp, photo, sort) VALUES
('Amit Chauhan', 'Head', 'Leads', '', 1),
('Ahmad Tarique', 'Co-head', 'Leads', '', 2),
('Harsh Prajapati', 'Software Team Lead', 'Leads', '', 3),
('Jatin Pandey', 'Software Team Co-lead', 'Leads', '', 4),
('Vineeta', 'Circuit Design Lead', 'Leads', '', 5),
('Lakshya Soni', 'Circuit Design Co-lead', 'Leads', '', 6),
('Akhand', 'Core Member', 'Core', '/photos/repo/repo-team-akhand.jpg', 7),
('Angel', 'Core Member', 'Core', '/photos/repo/repo-team-angel.jpg', 8),
('Anshika', 'Core Member', 'Core', '/photos/repo/repo-team-anshika.jpg', 9),
('Ayush', 'Core Member', 'Core', '/photos/repo/repo-team-ayush.jpg', 10),
('Bushra', 'Core Member', 'Core', '/photos/repo/repo-team-bushra.jpg', 11),
('Prince', 'Core Member', 'Core', '/photos/repo/repo-team-prince.jpg', 12);

INSERT INTO gallery (url, caption, alt, featured, sort) VALUES
('/photos/repo/repo-workshop-01.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 1, 1),
('/photos/repo/repo-workshop-02.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 1, 2),
('/photos/repo/repo-workshop-03.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 1, 3),
('/photos/repo/repo-workshop-04.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 1, 4),
('/photos/repo/repo-workshop-05.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 1, 5),
('/photos/repo/repo-workshop-06.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 1, 6),
('/photos/repo/repo-workshop-07.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 0, 7),
('/photos/repo/repo-workshop-08.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 0, 8),
('/photos/repo/repo-workshop-09.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 0, 9),
('/photos/repo/repo-workshop-10.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 0, 10),
('/photos/repo/repo-workshop-11.jpg', 'Robotics workshop', 'Students at a Life Robo robotics workshop', 0, 11),
('/photos/repo/repo-lecture-03.jpg', 'Lecture series', 'Lecture on robotics and automation', 0, 12),
('/photos/repo/repo-lecture-06.jpg', 'Lecture series', 'Lecture on robotics and automation', 0, 13),
('/photos/repo/repo-lecture-09.jpg', 'Lecture series', 'Lecture on robotics and automation', 0, 14),
('/photos/workshop-whatsapp-01.jpg', 'Session moments', 'Life Robo session', 0, 15),
('/photos/workshop-whatsapp-02.jpg', 'Lecture 01: Introduction to Robotics', 'Lecture 01: What is a robot', 0, 16),
('/photos/workshop-whatsapp-03.jpg', 'Session moments', 'Life Robo session', 0, 17),
('/photos/workshop-whatsapp-04.jpg', 'Session moments', 'Life Robo session', 0, 18),
('/photos/workshop-whatsapp-05.jpg', 'Session moments', 'Life Robo session', 0, 19),
('/photos/workshop-whatsapp-06.jpg', 'Session moments', 'Life Robo session', 0, 20),
('/photos/workshop-whatsapp-07.jpg', 'Session moments', 'Life Robo session', 0, 21),
('/photos/workshop-whatsapp-08.jpg', 'Session moments', 'Life Robo session', 0, 22),
('/photos/workshop-whatsapp-09.jpg', 'Session moments', 'Life Robo session', 0, 23),
('/photos/workshop-whatsapp-10.jpg', 'Session moments', 'Life Robo session', 0, 24),
('/photos/workshop-whatsapp-11.jpg', 'Session moments', 'Life Robo session', 0, 25),
('/photos/workshop-whatsapp-12.jpg', 'Session moments', 'Life Robo session', 0, 26),
('/photos/workshop-whatsapp-13.jpg', 'Session moments', 'Life Robo session', 0, 27),
('/photos/workshop-whatsapp-14.jpg', 'Session moments', 'Life Robo session', 0, 28),
('/photos/workshop-whatsapp-15.jpg', 'Session moments', 'Life Robo session', 0, 29),
('/photos/workshop-whatsapp-16.jpg', 'Lecture 01: Introduction to Robotics', 'Lecture 01: What is a robot', 0, 30),
('/photos/workshop-whatsapp-17.jpg', 'Session moments', 'Life Robo session', 0, 31);

INSERT INTO posts (slug, title, published_at, cover, cover_alt, excerpt, body, author) VALUES
('career-in-space-key-takeaways', 'Talk on Career in Space: highlights', '2026-02-22T04:30:00.000Z',
 '/photos/workshop-today-banner.jpg', 'Antariksh Manthan 2026 poster',
 'Antariksh Manthan 2026 opened our workshop series with a talk by Chandrayaan-3 Program Manager Mr. Abhishek Singh.',
 'On 21 February 2026, Life Robo opened the Robotics Workshops Series with **Antariksh Manthan 2026** — a talk on careers in space by Mr. Abhishek Singh, Scientist at URSC and Program Manager for Chandrayaan-3, ISRO.

*Edit this post from the admin panel to add the key takeaways from the talk.*', 'Life Robo'),
('workshop-iii-line-follower', 'Workshop-III: building a line follower live', '2026-04-20T04:30:00.000Z',
 '/photos/team-line-final.jpg', 'Arduino line following robot',
 'Our third workshop built a line following robot from scratch and ended with a live demo.',
 'In Robotics Workshop-III, participants built a line following robot live and finished with a demo on track.

*Edit this post from the admin panel to add photos and details.*', 'Life Robo');
