-- Vortex Workshop 1 (3 Oct 2026). Time and venue not on the poster; edit in admin if needed.
INSERT OR IGNORE INTO events (slug, title, starts_at, venue, summary, body, cover, cover_alt, images, series, featured) VALUES
('vortex-workshop-1-robotics-who-am-i',
 'Vortex Workshop 1: Robotics, Who am I?',
 '2026-10-03T08:10:00.000Z',
 'Faculty of Engineering & Technology, University of Lucknow',
 'The first workshop of the Vortex series, led by Dr. Manoj Kumar Jain, IEEE Senior Member.',
 'The first workshop of the Vortex series, organised by Life Robo with IEEE RAS and the IEEE Student Branch, FoET.\n\nDr. Manoj Kumar Jain, IEEE Senior Member, opened the series with an introduction to robotics: what a robot is, how it senses and responds to the world, and where the field is heading.',
 '/photos/vortex/vortex-06.jpg',
 'Poster for Vortex Workshop 1, Robotics: Who am I?',
 '["/photos/vortex/vortex-07.jpg","/photos/vortex/vortex-08.jpg","/photos/vortex/vortex-09.jpg","/photos/vortex/vortex-10.jpg","/photos/vortex/vortex-11.jpg","/photos/vortex/vortex-12.jpg"]',
 'vortex', 1);

-- Workshop 2 was on 10 Oct 2026 at 1:40 PM IST.
UPDATE events SET starts_at = '2026-10-10T08:10:00.000Z' WHERE slug = 'vortex-workshop-2-mathematics-of-motion';
