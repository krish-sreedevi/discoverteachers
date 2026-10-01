export const SKILLS = [
  'Yoga', 'Dance', 'Art & craft', 'Music & singing', 'Storytelling', 'Phonics', 'Rhymes & action songs',
  'Drama & puppetry', 'Clay modelling', 'Sports & PE', 'Montessori methods', 'Abacus / early maths',
  'Special needs support', 'First aid / CPR', 'Computer basics', 'Gardening & nature', 'Cooking activities', 'Public speaking',
];

export const CURRICULA = [
  'Montessori', 'Play-way method', 'Kindergarten (CBSE-aligned)', 'Kindergarten (ICSE-aligned)',
  'Kindergarten (State board)', 'IB PYP (Early Years)', 'Reggio Emilia', 'Waldorf / Steiner',
  'EYFS (British Early Years)', 'Multiple intelligences', 'Own curriculum',
];

export const LANGUAGES = [
  'English', 'Hindi', 'Kannada', 'Malayalam', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Gujarati',
  'Punjabi', 'Odia', 'Urdu', 'Konkani', 'Assamese', 'Sanskrit', 'French', 'German', 'Arabic',
];

export const PROFICIENCY = ['Basic', 'Conversational', 'Fluent', 'Native'];
export const PROF_RANK = { Basic: 1, Conversational: 2, Fluent: 3, Native: 4 };

export const AGES = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8];

export const QUALIFICATIONS = [
  'NTT (Nursery Teacher Training)', 'Montessori Teacher Training', 'ECCE Diploma', 'D.El.Ed',
  'B.Ed', 'B.A. / B.Sc. / B.Com', 'Master\'s degree', 'Pre-primary Teacher Training (PPTT)', 'Other',
];

export const APP_STATUSES = ['applied', 'invited', 'shortlisted', 'interview', 'hired', 'rejected'];

// ---------- extracurricular & events ----------
export const ACTIVITIES = [
  'Yoga', 'Dance', 'Bharatanatyam', 'Western dance', 'Zumba & aerobics', 'Art & craft', 'Pottery', 'Clay modelling',
  'Music & singing', 'Keyboard / guitar', 'Drama & theatre', 'Storytelling', 'Puppetry', 'Karate / martial arts',
  'Chess', 'Abacus', 'Robotics / STEM', 'Phonics', 'Gardening & nature', 'Cooking (no-fire)', 'Sports & PE',
  'Swimming', 'Skating', 'Magic show', 'Face painting', 'Balloon art',
];

// What kind of work a teacher wants
export const WORK_TYPES = [
  ['class', 'Class teacher (full-time / part-time)', '🏫'],
  ['extracurricular', 'Extracurricular classes (weekly / regular)', '🎨'],
  ['event', 'One-time events & workshops', '🎉'],
];
export const WORK_LABEL = { class: 'Class teacher', extracurricular: 'Extracurricular', event: 'One-time events' };

// What kind of role a school posts
export const JOB_TYPES = [
  ['full_time', 'Class teacher — full-time', 'month'],
  ['part_time', 'Class teacher — part-time', 'month'],
  ['extracurricular', 'Extracurricular classes (regular)', 'session'],
  ['event', 'One-time event / workshop', 'event'],
];
export const JOB_TYPE_LABEL = { full_time: 'Full-time', part_time: 'Part-time', extracurricular: 'Extracurricular', event: 'One-time event' };
export const PAY_UNIT_LABEL = { month: '/month', session: '/session', event: ' total', hour: '/hour' };
export const jobWorkType = (t) => (t === 'extracurricular' ? 'extracurricular' : t === 'event' ? 'event' : 'class');
