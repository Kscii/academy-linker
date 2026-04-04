// ============================================================
// Academy Linker — Mock Data
// Mirrors the parentlink_v4_final.html prototype data
// ============================================================

import type {
  UserSummary,
  StudentSummary,
  TeacherSummary,
  SubjectSummary,
  DashboardResponse,
  SubjectDetailResponse,
  Report,
  ReportDetail,
  Announcement,
  DiscussionTeacherItem,
  ThreadPost,
  TeacherStudentItem,
  TeacherClass,
  TeacherDashboardResponse,
} from '@/types/api';

// ── Users ────────────────────────────────────────────────────

export const mockParentUser: UserSummary = {
  uuid: 'parent-001',
  role: 'parent',
  display_name: 'Li Wei',
  email: 'li.wei@email.com',
  avatar_url: undefined,
};

export const mockTeacherUser: UserSummary = {
  uuid: 'teacher-001',
  role: 'teacher',
  display_name: 'Ms. Thompson',
  email: 'thompson@westside.edu.au',
  avatar_url: undefined,
};

// ── Students ─────────────────────────────────────────────────

export const mockStudents: StudentSummary[] = [
  {
    uuid: 'student-001',
    display_name: 'Emily Wei',
    grade: 'Year 7',
    class_name: '7A',
    overall_score: 78,
  },
];

// ── Subjects ─────────────────────────────────────────────────

export const SUBJECT_COLORS: Record<string, string> = {
  math:    '#E8614E',
  english: '#3DB6A8',
  science: '#4A90D9',
  hass:    '#F0A732',
  pe:      '#8B5CF6',
  arts:    '#E91E8C',
};

export const SUBJECT_BG: Record<string, string> = {
  math:    'rgba(232,97,78,0.12)',
  english: 'rgba(61,182,168,0.12)',
  science: 'rgba(74,144,217,0.12)',
  hass:    'rgba(240,167,50,0.12)',
  pe:      'rgba(139,92,246,0.12)',
  arts:    'rgba(233,30,140,0.12)',
};

export const mockTeachers: Record<string, TeacherSummary> = {
  math: { uuid: 'teacher-math-001', display_name: 'Mr. Roberts', subject: 'Mathematics', email: 'roberts@westside.edu.au' },
  english: { uuid: 'teacher-eng-001', display_name: 'Ms. Thompson', subject: 'English', email: 'thompson@westside.edu.au' },
  science: { uuid: 'teacher-sci-001', display_name: 'Dr. Chen', subject: 'Science', email: 'chen@westside.edu.au' },
  hass: { uuid: 'teacher-hass-001', display_name: 'Mr. Williams', subject: 'HASS', email: 'williams@westside.edu.au' },
  pe: { uuid: 'teacher-pe-001', display_name: 'Ms. Davis', subject: 'Physical Education', email: 'davis@westside.edu.au' },
  arts: { uuid: 'teacher-arts-001', display_name: 'Ms. Rivera', subject: 'Arts', email: 'rivera@westside.edu.au' },
};

export const mockSubjects: SubjectSummary[] = [
  { uuid: 'sub-math', name: 'Mathematics',        code: 'math',    color: SUBJECT_COLORS.math,    score: 82, progress: 72, teacher: mockTeachers.math },
  { uuid: 'sub-eng',  name: 'English',             code: 'english', color: SUBJECT_COLORS.english, score: 75, progress: 68, teacher: mockTeachers.english },
  { uuid: 'sub-sci',  name: 'Science',             code: 'science', color: SUBJECT_COLORS.science, score: 88, progress: 80, teacher: mockTeachers.science },
  { uuid: 'sub-hass', name: 'Humanities & SS',     code: 'hass',    color: SUBJECT_COLORS.hass,    score: 70, progress: 60, teacher: mockTeachers.hass },
  { uuid: 'sub-pe',   name: 'Physical Education',  code: 'pe',      color: SUBJECT_COLORS.pe,      score: 91, progress: 90, teacher: mockTeachers.pe },
  { uuid: 'sub-arts', name: 'Arts',                code: 'arts',    color: SUBJECT_COLORS.arts,    score: 79, progress: 74, teacher: mockTeachers.arts },
];

// ── Teacher Posts per Subject ─────────────────────────────────

const makePost = (
  uuid: string,
  authorUuid: string,
  authorName: string,
  subjectCode: string,
  title: string,
  content: string,
  daysAgo: number,
  replies?: ThreadPost[]
): ThreadPost => ({
  uuid,
  author: {
    uuid: authorUuid,
    role: 'teacher',
    display_name: authorName,
    email: `${authorName.toLowerCase().replace(' ', '.')}@westside.edu.au`,
  },
  title,
  content_markdown: content,
  subject_uuid: `sub-${subjectCode}`,
  subject_name: subjectCode === 'math' ? 'Mathematics' : subjectCode === 'eng' ? 'English' :
    subjectCode === 'sci' ? 'Science' : subjectCode === 'hass' ? 'Humanities & SS' :
    subjectCode === 'pe' ? 'Physical Education' : 'Arts',
  subject_color: SUBJECT_COLORS[subjectCode] ?? '#888',
  created_at: new Date(Date.now() - daysAgo * 86400_000).toISOString(),
  replies: replies ?? [],
  tags: [],
});

export const mockSubjectPosts: Record<string, ThreadPost[]> = {
  'sub-math': [
    makePost('post-m1', 'teacher-math-001', 'Mr. Roberts', 'math',
      'Algebra Unit — Week 8 Progress',
      "Emily is showing good understanding of linear equations. Her last quiz scored **82%**. Areas to watch: word problems with multi-step reasoning. I'd recommend 20 minutes of practice each evening using Khan Academy's linear equations module.",
      2),
    makePost('post-m2', 'teacher-math-001', 'Mr. Roberts', 'math',
      'Upcoming Assessment Notice',
      "We have a **Chapter 4 Test** scheduled for next Thursday covering quadratic expressions. Emily should review factoring techniques and the quadratic formula. Past papers have been added to the class portal.",
      7),
  ],
  'sub-eng': [
    makePost('post-e1', 'teacher-eng-001', 'Ms. Thompson', 'eng',
      'Creative Writing Assignment Feedback',
      "Emily's short story submission was creative and well-structured. She received **75/100**. The narrative voice was distinctive — her main growth area is varied sentence structure to improve flow. Encourage her to read widely this term.",
      1),
    makePost('post-e2', 'teacher-eng-001', 'Ms. Thompson', 'eng',
      'Reading Log Reminder',
      "A gentle reminder that **reading logs** are due every Friday. Emily has been consistent — keep it up! The next comprehension task covers persuasive texts, so non-fiction reading at home is especially helpful.",
      5),
  ],
  'sub-sci': [
    makePost('post-s1', 'teacher-sci-001', 'Dr. Chen', 'sci',
      'Science Fair Project Update',
      "Emily's science fair project on **plant growth under different light spectra** is progressing excellently — currently one of the top 3 in class. Her hypothesis is well-defined and her data collection is rigorous. Final submission is in 3 weeks.",
      3),
  ],
  'sub-hass': [
    makePost('post-h1', 'teacher-hass-001', 'Mr. Williams', 'hass',
      'Geography Research Task',
      "Emily submitted a solid research task on climate change impacts in the Asia-Pacific. Score: **70%**. She demonstrated good source selection but needs to improve her analysis depth. I have added detailed comments to her returned work in the portal.",
      4),
  ],
  'sub-pe': [
    makePost('post-p1', 'teacher-pe-001', 'Ms. Davis', 'pe',
      'Athletics Carnival Performance',
      "Emily had a fantastic athletics carnival — she placed **2nd in the 800m** and contributed strongly to the relay team. Her fitness levels have improved significantly this term. Encourage continued aerobic activity outside school.",
      2),
  ],
  'sub-arts': [
    makePost('post-a1', 'teacher-arts-001', 'Ms. Rivera', 'arts',
      'Visual Arts Portfolio Progress',
      "Emily's portfolio is coming along beautifully. Her mixed-media piece on identity has real depth. Score so far: **79/100** for process work. The final piece will be displayed at the school's mid-year exhibition in Week 10.",
      6),
  ],
};

// ── Dashboard ─────────────────────────────────────────────────

export const mockParentDashboard: DashboardResponse = {
  summary_cards: [
    { label: 'Overall Average',  value: '78%',  sub: '+3 this term',   trend: 'up',   color: 'a1' },
    { label: 'Attendance',       value: '96%',  sub: '2 absences',     trend: 'flat', color: 'a2' },
    { label: 'Tasks Due',        value: 4,      sub: 'this week',      trend: 'down', color: 'a3' },
    { label: 'New Posts',        value: 3,      sub: 'from teachers',  trend: 'up',   color: 'a4' },
  ],
  subject_chart: [
    { label: 'Maths',   value: 82, avg: 74 },
    { label: 'English', value: 75, avg: 71 },
    { label: 'Science', value: 88, avg: 76 },
    { label: 'HASS',    value: 70, avg: 69 },
    { label: 'PE',      value: 91, avg: 80 },
    { label: 'Arts',    value: 79, avg: 75 },
  ],
  trend_chart: [
    { label: 'Wk 1',  value: 70, avg: 68 },
    { label: 'Wk 2',  value: 72, avg: 69 },
    { label: 'Wk 3',  value: 68, avg: 70 },
    { label: 'Wk 4',  value: 75, avg: 71 },
    { label: 'Wk 5',  value: 74, avg: 72 },
    { label: 'Wk 6',  value: 78, avg: 72 },
    { label: 'Wk 7',  value: 76, avg: 73 },
    { label: 'Wk 8',  value: 82, avg: 74 },
  ],
  important_post_banners: [
    {
      uuid: 'post-m2',
      title: 'Upcoming Assessment Notice',
      subject: 'Mathematics',
      teacher_name: 'Mr. Roberts',
      created_at: new Date(Date.now() - 7 * 86400_000).toISOString(),
    },
  ],
  subjects: mockSubjects,
};

// ── Subject Detail ────────────────────────────────────────────

export const mockSubjectDetails: Record<string, SubjectDetailResponse> = {
  'sub-math': {
    subject: mockSubjects[0],
    overview: { current_score: 82, term_avg: 76, highest: 95, lowest: 61, class_avg: 74 },
    trend_data: [
      { label: 'Wk 1', value: 70, avg: 68 }, { label: 'Wk 2', value: 74, avg: 70 },
      { label: 'Wk 3', value: 71, avg: 71 }, { label: 'Wk 4', value: 78, avg: 72 },
      { label: 'Wk 5', value: 76, avg: 72 }, { label: 'Wk 6', value: 80, avg: 73 },
      { label: 'Wk 7', value: 79, avg: 73 }, { label: 'Wk 8', value: 82, avg: 74 },
    ],
    class_avg_data: [
      { label: 'Wk 1', value: 68 }, { label: 'Wk 2', value: 70 },
      { label: 'Wk 3', value: 71 }, { label: 'Wk 4', value: 72 },
      { label: 'Wk 5', value: 72 }, { label: 'Wk 6', value: 73 },
      { label: 'Wk 7', value: 73 }, { label: 'Wk 8', value: 74 },
    ],
    timeline: [
      { uuid: 'tl-m1', title: 'Number & Algebra Basics',       status: 'done',    week: 1 },
      { uuid: 'tl-m2', title: 'Linear Equations',              status: 'done',    week: 3 },
      { uuid: 'tl-m3', title: 'Quadratic Expressions',         status: 'current', week: 7 },
      { uuid: 'tl-m4', title: 'Geometry & Measurement',        status: 'future',  week: 9 },
      { uuid: 'tl-m5', title: 'Statistics & Probability',      status: 'future',  week: 11 },
    ],
    posts: mockSubjectPosts['sub-math'],
    ai_summary: {
      summary: "Emily is performing above class average in Mathematics. Her algebra skills are strong; she should focus on multi-step word problems before the Chapter 4 assessment.",
      suggestions: [
        'Review Khan Academy: Linear Equations module',
        'Practice 5 word problems per night this week',
        'Ask Mr. Roberts about extra help sessions before the test',
      ],
      generated_at: new Date().toISOString(),
    },
  },
  'sub-eng': {
    subject: mockSubjects[1],
    overview: { current_score: 75, term_avg: 71, highest: 88, lowest: 58, class_avg: 71 },
    trend_data: [
      { label: 'Wk 1', value: 68 }, { label: 'Wk 2', value: 70 }, { label: 'Wk 3', value: 72 },
      { label: 'Wk 4', value: 71 }, { label: 'Wk 5', value: 73 }, { label: 'Wk 6', value: 74 },
      { label: 'Wk 7', value: 74 }, { label: 'Wk 8', value: 75 },
    ],
    class_avg_data: [
      { label: 'Wk 1', value: 70 }, { label: 'Wk 2', value: 70 }, { label: 'Wk 3', value: 71 },
      { label: 'Wk 4', value: 71 }, { label: 'Wk 5', value: 71 }, { label: 'Wk 6', value: 71 },
      { label: 'Wk 7', value: 71 }, { label: 'Wk 8', value: 71 },
    ],
    timeline: [
      { uuid: 'tl-e1', title: 'Short Story Writing',    status: 'done',    week: 1 },
      { uuid: 'tl-e2', title: 'Poetry Analysis',        status: 'done',    week: 4 },
      { uuid: 'tl-e3', title: 'Persuasive Texts',       status: 'current', week: 7 },
      { uuid: 'tl-e4', title: 'Novel Study',            status: 'future',  week: 9 },
      { uuid: 'tl-e5', title: 'Oral Presentation',      status: 'future',  week: 11 },
    ],
    posts: mockSubjectPosts['sub-eng'],
  },
  'sub-sci': {
    subject: mockSubjects[2],
    overview: { current_score: 88, term_avg: 80, highest: 96, lowest: 72, class_avg: 76 },
    trend_data: [
      { label: 'Wk 1', value: 80 }, { label: 'Wk 2', value: 82 }, { label: 'Wk 3', value: 83 },
      { label: 'Wk 4', value: 85 }, { label: 'Wk 5', value: 84 }, { label: 'Wk 6', value: 86 },
      { label: 'Wk 7', value: 87 }, { label: 'Wk 8', value: 88 },
    ],
    class_avg_data: [
      { label: 'Wk 1', value: 74 }, { label: 'Wk 2', value: 75 }, { label: 'Wk 3', value: 75 },
      { label: 'Wk 4', value: 76 }, { label: 'Wk 5', value: 76 }, { label: 'Wk 6', value: 76 },
      { label: 'Wk 7', value: 76 }, { label: 'Wk 8', value: 76 },
    ],
    timeline: [
      { uuid: 'tl-s1', title: 'Scientific Method',      status: 'done',    week: 1 },
      { uuid: 'tl-s2', title: 'Cells & Living Things',  status: 'done',    week: 3 },
      { uuid: 'tl-s3', title: 'Science Fair Project',   status: 'current', week: 6 },
      { uuid: 'tl-s4', title: 'Chemical Reactions',     status: 'future',  week: 9 },
      { uuid: 'tl-s5', title: 'Earth & Space',          status: 'future',  week: 11 },
    ],
    posts: mockSubjectPosts['sub-sci'],
  },
  'sub-hass': {
    subject: mockSubjects[3],
    overview: { current_score: 70, term_avg: 69, highest: 85, lowest: 52, class_avg: 69 },
    trend_data: [
      { label: 'Wk 1', value: 65 }, { label: 'Wk 2', value: 66 }, { label: 'Wk 3', value: 67 },
      { label: 'Wk 4', value: 68 }, { label: 'Wk 5', value: 69 }, { label: 'Wk 6', value: 69 },
      { label: 'Wk 7', value: 70 }, { label: 'Wk 8', value: 70 },
    ],
    class_avg_data: [
      { label: 'Wk 1', value: 67 }, { label: 'Wk 2', value: 67 }, { label: 'Wk 3', value: 68 },
      { label: 'Wk 4', value: 68 }, { label: 'Wk 5', value: 69 }, { label: 'Wk 6', value: 69 },
      { label: 'Wk 7', value: 69 }, { label: 'Wk 8', value: 69 },
    ],
    timeline: [
      { uuid: 'tl-h1', title: 'Australian History',     status: 'done',    week: 1 },
      { uuid: 'tl-h2', title: 'Geography Research',     status: 'done',    week: 4 },
      { uuid: 'tl-h3', title: 'Civics & Citizenship',   status: 'current', week: 7 },
      { uuid: 'tl-h4', title: 'Economics Basics',       status: 'future',  week: 9 },
    ],
    posts: mockSubjectPosts['sub-hass'],
  },
  'sub-pe': {
    subject: mockSubjects[4],
    overview: { current_score: 91, term_avg: 85, highest: 98, lowest: 75, class_avg: 80 },
    trend_data: [
      { label: 'Wk 1', value: 84 }, { label: 'Wk 2', value: 86 }, { label: 'Wk 3', value: 87 },
      { label: 'Wk 4', value: 88 }, { label: 'Wk 5', value: 89 }, { label: 'Wk 6', value: 90 },
      { label: 'Wk 7', value: 91 }, { label: 'Wk 8', value: 91 },
    ],
    class_avg_data: [
      { label: 'Wk 1', value: 78 }, { label: 'Wk 2', value: 78 }, { label: 'Wk 3', value: 79 },
      { label: 'Wk 4', value: 79 }, { label: 'Wk 5', value: 80 }, { label: 'Wk 6', value: 80 },
      { label: 'Wk 7', value: 80 }, { label: 'Wk 8', value: 80 },
    ],
    timeline: [
      { uuid: 'tl-p1', title: 'Fitness Testing',        status: 'done',    week: 1 },
      { uuid: 'tl-p2', title: 'Team Sports',            status: 'done',    week: 3 },
      { uuid: 'tl-p3', title: 'Athletics Carnival',     status: 'done',    week: 6 },
      { uuid: 'tl-p4', title: 'Swimming Program',       status: 'current', week: 8 },
      { uuid: 'tl-p5', title: 'Gymnastics',             status: 'future',  week: 10 },
    ],
    posts: mockSubjectPosts['sub-pe'],
  },
  'sub-arts': {
    subject: mockSubjects[5],
    overview: { current_score: 79, term_avg: 75, highest: 90, lowest: 62, class_avg: 75 },
    trend_data: [
      { label: 'Wk 1', value: 72 }, { label: 'Wk 2', value: 73 }, { label: 'Wk 3', value: 74 },
      { label: 'Wk 4', value: 75 }, { label: 'Wk 5', value: 76 }, { label: 'Wk 6', value: 77 },
      { label: 'Wk 7', value: 78 }, { label: 'Wk 8', value: 79 },
    ],
    class_avg_data: [
      { label: 'Wk 1', value: 73 }, { label: 'Wk 2', value: 74 }, { label: 'Wk 3', value: 74 },
      { label: 'Wk 4', value: 74 }, { label: 'Wk 5', value: 75 }, { label: 'Wk 6', value: 75 },
      { label: 'Wk 7', value: 75 }, { label: 'Wk 8', value: 75 },
    ],
    timeline: [
      { uuid: 'tl-a1', title: 'Drawing Fundamentals',   status: 'done',    week: 1 },
      { uuid: 'tl-a2', title: 'Colour Theory',          status: 'done',    week: 3 },
      { uuid: 'tl-a3', title: 'Portfolio Project',      status: 'current', week: 6 },
      { uuid: 'tl-a4', title: 'Digital Art',            status: 'future',  week: 9 },
      { uuid: 'tl-a5', title: 'Exhibition Preparation', status: 'future',  week: 10 },
    ],
    posts: mockSubjectPosts['sub-arts'],
  },
};

// ── Reports ───────────────────────────────────────────────────

export const mockReports: Report[] = [
  {
    uuid: 'report-001',
    title: 'Week 8 Progress Report',
    week: 8, term: 2,
    created_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
    is_read: false,
    subjects: [
      { subject_uuid: 'sub-math',  subject_name: 'Mathematics',       subject_color: SUBJECT_COLORS.math,    score: 82, summary: 'Excellent progress in algebra. Needs work on word problems.' },
      { subject_uuid: 'sub-eng',   subject_name: 'English',           subject_color: SUBJECT_COLORS.english, score: 75, summary: 'Good creative writing. Focus on sentence variety.' },
      { subject_uuid: 'sub-sci',   subject_name: 'Science',           subject_color: SUBJECT_COLORS.science, score: 88, summary: 'Outstanding science fair project. Top 3 in class.' },
      { subject_uuid: 'sub-hass',  subject_name: 'Humanities & SS',   subject_color: SUBJECT_COLORS.hass,    score: 70, summary: 'Solid geography task. Analysis depth can improve.' },
      { subject_uuid: 'sub-pe',    subject_name: 'Physical Education', subject_color: SUBJECT_COLORS.pe,      score: 91, summary: 'Excellent athletics carnival performance.' },
      { subject_uuid: 'sub-arts',  subject_name: 'Arts',              subject_color: SUBJECT_COLORS.arts,    score: 79, summary: 'Beautiful portfolio work. Great creative depth.' },
    ],
  },
  {
    uuid: 'report-002',
    title: 'Week 6 Progress Report',
    week: 6, term: 2,
    created_at: new Date(Date.now() - 14 * 86400_000).toISOString(),
    is_read: true,
    subjects: [
      { subject_uuid: 'sub-math',  subject_name: 'Mathematics',       subject_color: SUBJECT_COLORS.math,    score: 80, summary: 'Good understanding of linear equations.' },
      { subject_uuid: 'sub-eng',   subject_name: 'English',           subject_color: SUBJECT_COLORS.english, score: 74, summary: 'Poetry analysis showed strong comprehension skills.' },
      { subject_uuid: 'sub-sci',   subject_name: 'Science',           subject_color: SUBJECT_COLORS.science, score: 86, summary: 'Science fair project proposal approved.' },
      { subject_uuid: 'sub-hass',  subject_name: 'Humanities & SS',   subject_color: SUBJECT_COLORS.hass,    score: 69, summary: 'Working well in group discussions.' },
      { subject_uuid: 'sub-pe',    subject_name: 'Physical Education', subject_color: SUBJECT_COLORS.pe,      score: 90, summary: 'Excellent team sport participation.' },
      { subject_uuid: 'sub-arts',  subject_name: 'Arts',              subject_color: SUBJECT_COLORS.arts,    score: 77, summary: 'Colour theory project submitted on time.' },
    ],
  },
];

export const mockReportDetail: ReportDetail = {
  ...mockReports[0],
  student: mockStudents[0],
  content_markdown: `# Week 8 Progress Report — Emily Wei

**Term 2, Week 8** | Westside Academy

---

## Mathematics — 82%
Emily is performing above class average. Her algebra skills are particularly strong, and she completed the linear equations assessment with 82%. The next focus area is multi-step word problems ahead of the Chapter 4 test.

## English — 75%
Emily's creative writing voice is developing nicely. Her short story was imaginative and well-structured. To further improve, she should practise varying sentence length and structure. Reading widely — particularly non-fiction — will help with the upcoming persuasive text unit.

## Science — 88%
Exceptional work on the science fair project. Emily's experimental design on plant light spectra is rigorous and she is tracking toward a top placement. Well done!

## Humanities & Social Sciences — 70%
Emily submitted a well-researched geography task. The next step is to deepen analytical thinking — moving beyond description to evaluation of causes and impacts.

## Physical Education — 91%
Emily had an outstanding athletics carnival, placing 2nd in the 800m. Her aerobic fitness has improved markedly this term.

## Arts — 79%
Emily's portfolio is progressing beautifully. Her mixed-media exploration of identity shows maturity and creativity. Looking forward to the exhibition in Week 10.
`,
};

// ── Announcements ─────────────────────────────────────────────

export const mockAnnouncements: Announcement[] = [
  {
    uuid: 'ann-001',
    title: 'End of Term Concert — Friday Week 10',
    body_preview: 'Students are invited to perform at our annual end-of-term concert. Sign up by Week 9.',
    created_at: new Date(Date.now() - 3 * 86400_000).toISOString(),
    is_read: false,
    author: 'School Admin',
    category: 'Event',
  },
  {
    uuid: 'ann-002',
    title: 'Parent-Teacher Interview Bookings Now Open',
    body_preview: 'Book your interview slot via the school portal. Sessions run Week 9 Monday–Wednesday.',
    created_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
    is_read: false,
    author: 'School Admin',
    category: 'Interviews',
  },
  {
    uuid: 'ann-003',
    title: 'Excursion Permission Forms Due',
    body_preview: 'Year 7 excursion to the Museum of Natural History on Friday Week 9. Forms due by Wednesday.',
    created_at: new Date(Date.now() - 8 * 86400_000).toISOString(),
    is_read: true,
    author: 'Year 7 Coordinator',
    category: 'Excursion',
  },
];

// ── Discussion Teachers ───────────────────────────────────────

export const mockDiscussionTeachers: DiscussionTeacherItem[] = mockSubjects.map((sub, i) => ({
  teacher: mockTeachers[sub.code],
  thread_uuid: `thread-${sub.uuid}`,
  last_post_at: new Date(Date.now() - i * 2 * 86400_000).toISOString(),
  unread_count: i === 0 ? 1 : i === 1 ? 2 : 0,
  subject: sub,
  latest_message_preview: Object.values(mockSubjectPosts)[i]?.[0]?.content_markdown?.slice(0, 80) ?? '',
}));

// ── Teacher Students ──────────────────────────────────────────

export const mockTeacherStudents: TeacherStudentItem[] = [
  { student: { uuid: 'student-001', display_name: 'Emily Wei',      grade: 'Year 7', class_name: '7A', overall_score: 78 }, overall_score: 78, at_risk: false, unread_messages: 1, subjects: mockSubjects },
  { student: { uuid: 'student-002', display_name: 'James Nguyen',   grade: 'Year 7', class_name: '7A', overall_score: 62 }, overall_score: 62, at_risk: true,  unread_messages: 3, subjects: mockSubjects },
  { student: { uuid: 'student-003', display_name: 'Aisha Patel',    grade: 'Year 7', class_name: '7A', overall_score: 85 }, overall_score: 85, at_risk: false, unread_messages: 0, subjects: mockSubjects },
  { student: { uuid: 'student-004', display_name: 'Luca Romano',    grade: 'Year 7', class_name: '7B', overall_score: 55 }, overall_score: 55, at_risk: true,  unread_messages: 2, subjects: mockSubjects },
  { student: { uuid: 'student-005', display_name: 'Sophie Chen',    grade: 'Year 7', class_name: '7B', overall_score: 91 }, overall_score: 91, at_risk: false, unread_messages: 0, subjects: mockSubjects },
  { student: { uuid: 'student-006', display_name: 'Marcus Johnson', grade: 'Year 7', class_name: '7B', overall_score: 73 }, overall_score: 73, at_risk: false, unread_messages: 1, subjects: mockSubjects },
];

// ── Teacher Classes ───────────────────────────────────────────

export const mockTeacherClasses: TeacherClass[] = [
  { uuid: 'class-7a-math', name: '7A Mathematics',        subject: mockSubjects[0], student_count: 28, avg_score: 74, at_risk_count: 4, scores: [62, 68, 70, 72, 74, 76, 78, 80, 82, 85] },
  { uuid: 'class-7b-math', name: '7B Mathematics',        subject: mockSubjects[0], student_count: 26, avg_score: 71, at_risk_count: 5, scores: [58, 62, 65, 68, 70, 72, 74, 76, 78, 80] },
  { uuid: 'class-7a-sci',  name: '7A Science',            subject: mockSubjects[2], student_count: 28, avg_score: 76, at_risk_count: 2, scores: [68, 70, 72, 74, 76, 78, 80, 82, 85, 88] },
  { uuid: 'class-7b-sci',  name: '7B Science',            subject: mockSubjects[2], student_count: 27, avg_score: 73, at_risk_count: 3, scores: [65, 68, 70, 72, 74, 76, 78, 80, 82, 86] },
  { uuid: 'class-8a-math', name: '8A Mathematics',        subject: mockSubjects[0], student_count: 30, avg_score: 77, at_risk_count: 3, scores: [64, 68, 72, 74, 76, 78, 80, 82, 84, 88] },
  { uuid: 'class-8b-eng',  name: '8B English',            subject: mockSubjects[1], student_count: 29, avg_score: 72, at_risk_count: 4, scores: [60, 64, 68, 70, 72, 74, 76, 78, 80, 84] },
];

export const mockTeacherDashboard: TeacherDashboardResponse = {
  summary_cards: [
    { label: 'Total Students', value: 168, sub: 'across 6 classes', color: 'a1' },
    { label: 'Average Score',  value: '74%', sub: '+2% this term',  color: 'a2' },
    { label: 'At Risk',        value: 21,    sub: 'need attention',  color: 'a3' },
    { label: 'Unread Msgs',    value: 7,     sub: 'from parents',    color: 'a4' },
  ],
  classes: mockTeacherClasses,
};

// ── Teacher Discussion ────────────────────────────────────────

export const mockTeacherThread: ThreadPost[] = [
  {
    uuid: 'tpost-001',
    author: {
      uuid: 'parent-001',
      role: 'parent',
      display_name: 'Li Wei',
      email: 'li.wei@email.com',
    },
    content_markdown: "Hi Ms. Thompson, thank you for the feedback on Emily's creative writing. Could you recommend any specific books that might help with sentence variety?",
    created_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
  },
  {
    uuid: 'tpost-002',
    author: {
      uuid: 'teacher-eng-001',
      role: 'teacher',
      display_name: 'Ms. Thompson',
      email: 'thompson@westside.edu.au',
    },
    content_markdown: "Hi Li Wei! Great question. I'd recommend *The Curious Incident of the Dog in the Night-Time* by Mark Haddon for varied narrative voice, and any Roald Dahl for punchy, varied sentence rhythms. Emily is doing really well overall!",
    created_at: new Date(Date.now() - 1 * 86400_000).toISOString(),
    reply_to_post_uuid: 'tpost-001',
  },
];
