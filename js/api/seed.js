// Sample data for demo mode (Bengaluru). All people and schools here are fictional.
const d = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const p = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
const inv = [0,4,3,2,1,5,6,7,8,9];
function withCheck(s11) { let c = 0; s11.split('').reverse().forEach((ch, i) => { c = d[c][p[(i + 1) % 8][Number(ch)]]; }); return s11 + inv[c]; }

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const L = (language, proficiency) => ({ language, proficiency });

export async function seedData(hash) {
  const pw = await hash('demo1234');
  const users = [
    { id: 'u-admin', email: 'admin@demo.in', role: 'admin' },
    { id: 's-sunshine', email: 'sunshine@demo.in', role: 'school' },
    { id: 's-banyan', email: 'banyan@demo.in', role: 'school' },
    { id: 's-littlesteps', email: 'littlesteps@demo.in', role: 'school' },
  ];
  const schools = [
    { id: 's-sunshine', name: 'Sunshine Montessori House', contact_name: 'Lakshmi Rao', phone: '9845012345', email: 'sunshine@demo.in', year_established: 2011,
      avg_fees: 85000, curriculum: 'Montessori', num_students: 140, age_min: 1.5, age_max: 6, website: 'https://example.com/sunshine', bus_service: true, food_service: true,
      languages: [L('English', 'Fluent'), L('Kannada', 'Conversational'), L('Hindi', 'Conversational')],
      address: '12th Main, HAL 2nd Stage, Indiranagar, Bengaluru 560038', lat: 12.9719, lng: 77.6412, maps_link: '',
      about: 'A warm Montessori house with a large garden, a sand pit and a mud kitchen.', proof_path: null, status: 'approved', admin_note: null, created_at: daysAgo(40), updated_at: daysAgo(40) },
    { id: 's-banyan', name: 'Banyan Tree Playschool', contact_name: 'Farhan Ali', phone: '9900112233', email: 'banyan@demo.in', year_established: 2016,
      avg_fees: 60000, curriculum: 'Play-way method', num_students: 90, age_min: 2, age_max: 5, website: '', bus_service: false, food_service: true,
      languages: [L('English', 'Fluent'), L('Kannada', 'Fluent')],
      address: '4th Block, Jayanagar, Bengaluru 560011', lat: 12.9250, lng: 77.5838, maps_link: '', about: 'Play-based learning in a converted heritage bungalow.',
      proof_path: null, status: 'approved', admin_note: null, created_at: daysAgo(25), updated_at: daysAgo(25) },
    { id: 's-littlesteps', name: 'Little Steps Kindergarten', contact_name: 'Anita George', phone: '9886554433', email: 'littlesteps@demo.in', year_established: 2021,
      avg_fees: 48000, curriculum: 'Own curriculum', num_students: 45, age_min: 2, age_max: 6, website: '', bus_service: true, food_service: false,
      languages: [L('English', 'Fluent'), L('Malayalam', 'Native')],
      address: 'Sector 2, HSR Layout, Bengaluru 560102', lat: 12.9121, lng: 77.6446, maps_link: '', about: 'New neighbourhood kindergarten.',
      proof_path: null, status: 'pending', admin_note: null, created_at: daysAgo(1), updated_at: daysAgo(1) },
  ];
  const T = [
    ['t-priya', 'Priya Nair', 'priya@demo.in', 12.9784, 77.6408, 'Indiranagar, Bengaluru', 5, 28000, ['Yoga', 'Storytelling', 'Phonics', 'Montessori methods'], [L('English', 'Fluent'), L('Malayalam', 'Native'), L('Kannada', 'Conversational')], 'Montessori Teacher Training', 'approved', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['t-kavya', 'Kavya Shetty', 'kavya@demo.in', 12.9352, 77.6245, 'Koramangala, Bengaluru', 3, 22000, ['Dance', 'Rhymes & action songs', 'Art & craft'], [L('English', 'Fluent'), L('Kannada', 'Native'), L('Hindi', 'Fluent')], 'NTT (Nursery Teacher Training)', 'approved', ''],
    ['t-sana', 'Sana Fathima', 'sana@demo.in', 12.9591, 77.6974, 'Marathahalli, Bengaluru', 7, 35000, ['Art & craft', 'Clay modelling', 'Special needs support'], [L('English', 'Fluent'), L('Urdu', 'Native'), L('Hindi', 'Native')], 'ECCE Diploma', 'approved', ''],
    ['t-deepa', 'Deepa Krishnan', 'deepa@demo.in', 12.9165, 77.6101, 'BTM Layout, Bengaluru', 1, 16000, ['Music & singing', 'Storytelling'], [L('English', 'Conversational'), L('Tamil', 'Native'), L('Kannada', 'Basic')], 'D.El.Ed', 'approved', ''],
    ['t-rhea', 'Rhea D\'Souza', 'rhea@demo.in', 13.0358, 77.5970, 'Hebbal, Bengaluru', 10, 45000, ['Montessori methods', 'Public speaking', 'Drama & puppetry', 'First aid / CPR'], [L('English', 'Native'), L('Konkani', 'Fluent'), L('Kannada', 'Conversational')], 'Montessori Teacher Training', 'approved', ''],
    ['t-anjali', 'Anjali Verma', 'anjali@demo.in', 12.9698, 77.7500, 'Whitefield, Bengaluru', 4, 26000, ['Yoga', 'Sports & PE', 'Gardening & nature'], [L('English', 'Fluent'), L('Hindi', 'Native')], 'B.Ed', 'approved', ''],
    ['t-lakshmi', 'Lakshmi Gowda', 'lakshmi@demo.in', 12.9279, 77.5619, 'Banashankari, Bengaluru', 2, 18000, ['Rhymes & action songs', 'Clay modelling', 'Cooking activities'], [L('Kannada', 'Native'), L('English', 'Conversational')], 'Pre-primary Teacher Training (PPTT)', 'approved', ''],
    ['t-nisha', 'Nisha Menon', 'nisha@demo.in', 12.9900, 77.6600, 'Old Airport Road, Bengaluru', 6, 32000, ['Abacus / early maths', 'Phonics', 'Computer basics'], [L('English', 'Fluent'), L('Malayalam', 'Native'), L('Tamil', 'Conversational')], 'B.A. / B.Sc. / B.Com', 'approved', ''],
    ['t-arjun', 'Arjun Rao', 'arjun@demo.in', 12.9450, 77.6050, 'Koramangala 6th Block, Bengaluru', 6, null, ['Yoga', 'Sports & PE'], [L('English', 'Fluent'), L('Kannada', 'Native'), L('Hindi', 'Conversational')], 'Other', 'approved', ''],
    ['t-fatima', 'Fatima Begum', 'fatima@demo.in', 12.9800, 77.6200, 'Ulsoor, Bengaluru', 9, null, ['Art & craft', 'Clay modelling'], [L('English', 'Fluent'), L('Urdu', 'Native'), L('Hindi', 'Fluent')], 'Other', 'approved', ''],
    ['t-shruthi', 'Shruthi Iyer', 'shruthi@demo.in', 12.9300, 77.5800, 'Jayanagar, Bengaluru', 12, null, ['Dance', 'Music & singing'], [L('English', 'Fluent'), L('Tamil', 'Native'), L('Kannada', 'Fluent')], 'Other', 'approved', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
    ['t-vikram', 'Vikram "Magic" Menon', 'vikram@demo.in', 12.9600, 77.6400, 'Domlur, Bengaluru', 8, null, ['Storytelling', 'Drama & puppetry'], [L('English', 'Native'), L('Malayalam', 'Fluent'), L('Hindi', 'Conversational')], 'Other', 'approved', ''],
    ['t-meera', 'Meera Pillai', 'meera@demo.in', 12.9010, 77.6300, 'Bommanahalli, Bengaluru', 0, 15000, ['Art & craft', 'Dance'], [L('English', 'Conversational'), L('Malayalam', 'Native')], 'NTT (Nursery Teacher Training)', 'pending', ''],
  ];
  const teachers = [], teacher_private = [];
  T.forEach(([id, full_name, email, lat, lng, address, exp, sal, skills, languages, qualification, status, video_link], i) => {
    users.push({ id, email, role: 'teacher' });
    teachers.push({ id, full_name, phone: `98${String(45000000 + i * 1234567).slice(0, 8)}`, email, whatsapp: '', qualification, experience_years: exp,
      experience: exp ? [{ school: ['Tiny Tots Academy', 'Rainbow Kids', 'Blossom Preschool', 'Kidz Kingdom'][i % 4], role: 'Class teacher', from: String(2026 - exp), to: 'Present', notes: '' }] : [],
      skills, skills_other: '', languages, expected_salary: sal, address, lat, lng, maps_link: '',
      about: 'I love helping little ones discover the world through play, songs and stories.', video_path: null, video_link,
      aadhaar_last4: null, status, admin_note: null, created_at: daysAgo(30 - i * 3), updated_at: daysAgo(30 - i * 3) });
    const a = withCheck(String(23456789000 + i * 7919).slice(0, 11));
    teacher_private.push({ teacher_id: id, aadhaar: a });
    teachers[i].aadhaar_last4 = a.slice(-4);
  });

  // Extracurricular / event details
  const X = {
    't-priya': { work_types: ['class', 'extracurricular'], activities: ['Yoga', 'Storytelling', 'Phonics'], session_fee: 600 },
    't-kavya': { work_types: ['class', 'event'], activities: ['Western dance', 'Dance'], event_fee: 5000 },
    't-sana': { work_types: ['class', 'extracurricular', 'event'], activities: ['Art & craft', 'Clay modelling', 'Face painting'], session_fee: 700, event_fee: 4000 },
    't-anjali': { work_types: ['class', 'extracurricular'], activities: ['Yoga', 'Zumba & aerobics', 'Gardening & nature'], session_fee: 500 },
    't-arjun': { work_types: ['extracurricular', 'event'], activities: ['Yoga', 'Karate / martial arts', 'Sports & PE'], session_fee: 800, event_fee: 6000, travel_km: 12,
      about: 'Certified kids-yoga and karate instructor. I run 30–40 minute playful sessions for 3–6 year olds and sports-day warm-ups.' },
    't-fatima': { work_types: ['extracurricular', 'event'], activities: ['Pottery', 'Clay modelling', 'Art & craft'], session_fee: 900, event_fee: 7000, travel_km: 15,
      about: 'Studio potter. I bring a portable wheel and air-dry clay for hands-on pottery workshops and weekly art classes.' },
    't-shruthi': { work_types: ['extracurricular', 'event'], activities: ['Bharatanatyam', 'Dance', 'Music & singing'], session_fee: 1000, event_fee: 15000, travel_km: 10,
      about: 'Bharatanatyam dancer with 12 years of teaching. I choreograph annual-day and festival performances for little ones.' },
    't-vikram': { work_types: ['event'], activities: ['Magic show', 'Storytelling', 'Puppetry', 'Balloon art'], event_fee: 8000, travel_km: 25,
      about: 'Magic, puppets and stories — 45-minute shows for preschool celebrations, Children\'s Day and summer camps.' },
  };
  teachers.forEach((t) => {
    Object.assign(t, { work_types: ['class'], activities: [], session_fee: null, event_fee: null, travel_km: null }, X[t.id] || {});
    if (!t.work_types.includes('class')) { t.expected_salary = null; t.qualification = null; }
  });
  users.forEach((u) => { u.pw = pw; u.created_at = daysAgo(30); });

  const jobs = [
    { id: 'j-1', school_id: 's-sunshine', title: 'Montessori Directress (Casa, 3–6 yrs)', openings: 2,
      description: 'Lead a mixed-age Casa environment of 20 children with an assistant. Plan the monthly cycle, keep observation notes and run parent meetings each term.',
      requirements: 'Montessori training (AMI/IMC or equivalent) preferred. Warm, patient and good at observing children.', min_experience: 2,
      salary_min: 25000, salary_max: 35000, timings: '8:30 AM – 3:30 PM', working_days: 'Monday – Friday', start_date: null, age_group: '3 – 6 years',
      bus_provided: true, food_provided: true, languages: [L('English', 'Fluent'), L('Kannada', 'Conversational')], skills_preferred: ['Montessori methods', 'Storytelling'],
      curriculum: 'Montessori', address: schools[0].address, lat: schools[0].lat, lng: schools[0].lng, status: 'open', created_at: daysAgo(3), updated_at: daysAgo(3) },
    { id: 'j-2', school_id: 's-sunshine', title: 'Weekly kids yoga sessions', openings: 1, job_type: 'extracurricular', pay_unit: 'session', activity: 'Yoga', duration: '3 × 40-min sessions per week',
      description: 'Three 40-minute yoga and movement sessions each morning for toddlers and pre-K.', requirements: 'Yoga certification and experience with under-6s.', min_experience: 1,
      salary_min: 600, salary_max: 900, timings: '9:00 AM – 12:00 PM', working_days: 'Mon, Wed, Fri', start_date: null, age_group: '2 – 6 years',
      bus_provided: false, food_provided: true, languages: [L('English', 'Conversational')], skills_preferred: ['Yoga', 'Sports & PE'],
      curriculum: 'Montessori', address: schools[0].address, lat: schools[0].lat, lng: schools[0].lng, status: 'open', created_at: daysAgo(6), updated_at: daysAgo(6) },
    { id: 'j-3', school_id: 's-banyan', title: 'Nursery Class Teacher', openings: 1,
      description: 'Class teacher for our Nursery section (15 children) with a helper. Theme-based play-way curriculum is provided.', requirements: 'NTT/ECCE preferred. Kannada speaking is a plus.', min_experience: 1,
      salary_min: 20000, salary_max: 26000, timings: '9:00 AM – 2:00 PM', working_days: 'Monday – Saturday (2nd & 4th Sat off)', start_date: null, age_group: '3 – 4 years',
      bus_provided: false, food_provided: true, languages: [L('English', 'Fluent'), L('Kannada', 'Conversational')], skills_preferred: ['Rhymes & action songs', 'Art & craft'],
      curriculum: 'Play-way method', address: schools[1].address, lat: schools[1].lat, lng: schools[1].lng, status: 'open', created_at: daysAgo(2), updated_at: daysAgo(2) },
    { id: 'j-4', school_id: 's-banyan', title: 'Annual Day dance choreography', openings: 1, job_type: 'event', pay_unit: 'event', activity: 'Dance',
      description: 'Choreograph two short dances (Nursery and UKG, about 15 children each) for our Annual Day. Six practice sessions in the 3 weeks before the event, plus the event morning.',
      requirements: 'Experience choreographing for under-6s. Please share a video of a past performance.', min_experience: 2,
      salary_min: 12000, salary_max: 18000, timings: 'Practice 11:30 AM – 12:30 PM', working_days: '6 practice sessions + event day', start_date: null, event_date: '2026-12-12', duration: '3 weeks of practice + event day',
      age_group: '3 – 5 years', bus_provided: false, food_provided: true, languages: [L('English', 'Conversational')], skills_preferred: [],
      curriculum: 'Play-way method', address: schools[1].address, lat: schools[1].lat, lng: schools[1].lng, status: 'open', created_at: daysAgo(1), updated_at: daysAgo(1) },
  ];
  jobs.forEach((j) => { j.job_type ||= 'full_time'; j.pay_unit ||= 'month'; j.activity ||= null; j.event_date ||= null; j.duration ||= null; });
  const applications = [
    { id: 'a-1', job_id: 'j-1', teacher_id: 't-nisha', initiated_by: 'teacher', status: 'applied', message: 'I live 3 km away and would love to join.', created_at: daysAgo(2), updated_at: daysAgo(2) },
    { id: 'a-2', job_id: 'j-3', teacher_id: 't-priya', initiated_by: 'school', status: 'invited', message: '', created_at: daysAgo(1), updated_at: daysAgo(1) },
  ];
  return { users, schools, teachers, teacher_private, jobs, applications };
}
