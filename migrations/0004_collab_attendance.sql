-- Collaborations page (partners + workshop series), on-site event registration,
-- attendance and certificates.

ALTER TABLE events ADD COLUMN series TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN registration_open INTEGER NOT NULL DEFAULT 0;

CREATE TABLE partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  linkedin TEXT NOT NULL DEFAULT '',
  on_certificate INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- One row per person per event. Online sign-ups and walk-ins added at the door both live here.
-- `code` is the public certificate id (/certificates/<code>).
CREATE TABLE registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  course TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online','walk_in')),
  attended INTEGER NOT NULL DEFAULT 0,
  attended_at TEXT,
  code TEXT NOT NULL UNIQUE,
  confirmation_sent_at TEXT,
  certificate_sent_at TEXT,
  email_error TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_reg_event ON registrations (event_id, created_at);
CREATE UNIQUE INDEX idx_reg_event_email ON registrations (event_id, email) WHERE email <> '';
CREATE INDEX idx_reg_ip ON registrations (ip_hash, created_at);

INSERT INTO partners (name, short_name, logo, summary, body, website, instagram, linkedin, on_certificate, sort) VALUES
('IEEE Student Branch, FoET, University of Lucknow', 'IEEE SB FoET LU', '/brand/partners/ieee-sb-foet-lu.jpg',
 'The IEEE Student Branch at the Faculty of Engineering and Technology is a student-driven community focused on technical skills, innovation, leadership and professional growth.',
 'The branch connects FoET students to IEEE and runs its own events, along with groups like WIE and RAS. We plan sessions together, bring in speakers from the IEEE network and keep our workshops open to their members, so students from both groups learn in the same room.',
 '', 'https://www.instagram.com/ieeesbfoetlu/', '', 1, 1),
('IEEE Robotics and Automation Society', 'IEEE RAS', '/brand/partners/ieee-ras.png',
 'IEEE RAS is the IEEE society for robotics and automation. It supports research, education and student activity in the field around the world.',
 'RAS co-organises the Vortex workshop series with us. Through RAS, our members get a route to robotics resources, competitions and a wider community of people who build and study robots.',
 'https://www.ieee-ras.org/', '', '', 1, 2);

INSERT INTO settings (key, value) VALUES
('collabHeading', '"Learning robotics, together."'),
('collabIntro', '"Life Robo works with the IEEE Student Branch of FoET and IEEE Robotics and Automation Society on workshops, talks and hands-on sessions. The aim is simple: more students building robots, and more people around them to learn from."'),
('collabGoals', '[{"title":"Open to every branch","description":"Our sessions are open to students from any branch or year. You do not need prior experience to walk in and start."},{"title":"Learn from people who build","description":"Faculty, IEEE members and senior students lead the sessions, so what you learn comes from real work."},{"title":"Hands on, every time","description":"Each workshop leaves you with something to try yourself: a circuit, a piece of code or a working part."},{"title":"A network beyond campus","description":"Through IEEE and RAS, members can reach competitions, resources and people working on robots elsewhere."}]'),
('seriesName', '"Vortex"'),
('seriesTagline', '"Hands on × Minds on × Future ready"'),
('seriesBody', '"Vortex is the robotics workshop series run by Life Robo with IEEE RAS and the IEEE Student Branch, FoET, under the patronage of Prof. Jai Prakash Saini, Vice-Chancellor, University of Lucknow, and Prof. Satendra Pal Singh, Dean, FoET. Each workshop takes one idea in robotics and works through it from the basics.\n\nWorkshop 1, Robotics: Who am I?, was led by Dr. Manoj Kumar Jain, IEEE Senior Member. Workshop 2, The Mathematics of Motion, was led by Kunal Anand (Mechanical Engineering, 3rd year) and covered vectors and matrices, coordinate systems, kinematics, dynamics and simulation. More sessions are on the way."'),
('seriesKey', '"vortex"'),
('seriesImages', '["/photos/vortex/vortex-01.jpg","/photos/vortex/vortex-03.jpg","/photos/vortex/vortex-04.jpg","/photos/vortex/vortex-02.jpg","/photos/vortex/vortex-07.jpg","/photos/vortex/vortex-08.jpg","/photos/vortex/vortex-10.jpg","/photos/vortex/vortex-12.jpg","/photos/vortex/vortex-09.jpg","/photos/vortex/vortex-11.jpg","/photos/vortex/vortex-05.jpg","/photos/vortex/vortex-06.jpg"]'),
('seriesLinks', '[{"label":"Instagram","url":"https://www.instagram.com/vortex_life_robo/"},{"label":"LinkedIn","url":"https://www.linkedin.com/company/vortex-life-robo/"}]'),
('certSignatories', '[]');

INSERT INTO events (slug, title, starts_at, venue, summary, body, cover, cover_alt, images, series, featured) VALUES
('vortex-workshop-2-mathematics-of-motion',
 'Vortex Workshop 2: The Mathematics of Motion',
 '2026-10-10T08:10:00.000Z',
 'Room 229, 2nd floor, Old Block, FoET',
 'Understanding kinematics and dynamics in robotics, with speaker Kunal Anand (Mechanical Engineering, 3rd year).',
 'The second workshop of the Vortex series, organised by Life Robo with IEEE RAS and the IEEE Student Branch, FoET.\n\n**What we covered**\n\n- Vectors and matrices for robot motion\n- Coordinate systems and 3D position\n- Kinematics and dynamics of robotic motion\n- Simulation and how it maps to real robots\n\n**Patrons:** Prof. Jai Prakash Saini, Vice-Chancellor, University of Lucknow, and Prof. Satendra Pal Singh, Dean, FoET.',
 '/photos/vortex/vortex-05.jpg',
 'Poster for Vortex Workshop 2, The Mathematics of Motion',
 '["/photos/vortex/vortex-01.jpg","/photos/vortex/vortex-02.jpg","/photos/vortex/vortex-03.jpg","/photos/vortex/vortex-04.jpg"]',
 'vortex', 1);
