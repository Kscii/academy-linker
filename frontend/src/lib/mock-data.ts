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
    uuid: 's-aiden-01',   // matches backend UUID (preferred name "Aiden", full name "Aiden Wei")
    display_name: 'Aiden Wei',
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
      2, [
        {
          uuid: 'reply-m1-1',
          author: { uuid: 'parent-001', role: 'parent', display_name: 'Li Wei', email: 'li.wei@email.com' },
          content_markdown: "Thank you Mr. Roberts. We've noticed she struggles when the problems have lots of words — is there a specific strategy you use in class?",
          created_at: new Date(Date.now() - 1 * 86400_000 - 6 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-m1',
          replies: [], tags: [],
        },
        {
          uuid: 'reply-m1-2',
          author: { uuid: 'teacher-math-001', role: 'teacher', display_name: 'Mr. Roberts', email: 'roberts@westside.edu.au' },
          content_markdown: "Great question! I teach the RUCSAC method — Read, Underline, Choose, Solve, Answer, Check. I'll send home a reference card. Practicing 3–4 worded problems per night is the most effective thing at this stage.",
          created_at: new Date(Date.now() - 1 * 86400_000 - 2 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-m1',
          replies: [], tags: [],
        },
      ]),
    makePost('post-m2', 'teacher-math-001', 'Mr. Roberts', 'math',
      'Upcoming Assessment Notice',
      "We have a **Chapter 4 Test** scheduled for next Thursday covering quadratic expressions. Emily should review factoring techniques and the quadratic formula. Past papers have been added to the class portal.",
      7, [
        {
          uuid: 'reply-m2-1',
          author: { uuid: 'parent-001', role: 'parent', display_name: 'Li Wei', email: 'li.wei@email.com' },
          content_markdown: "We've seen the notice, thank you! Will there be a revision session before the test?",
          created_at: new Date(Date.now() - 6 * 86400_000).toISOString(),
          reply_to_post_uuid: 'post-m2',
          replies: [], tags: [],
        },
        {
          uuid: 'reply-m2-2',
          author: { uuid: 'teacher-math-001', role: 'teacher', display_name: 'Mr. Roberts', email: 'roberts@westside.edu.au' },
          content_markdown: "Yes! I'm running a voluntary lunchtime session on Wednesday from 1:00–1:40pm. All students are welcome. I'll also post a revision checklist on the portal by Monday.",
          created_at: new Date(Date.now() - 5 * 86400_000 - 18 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-m2',
          replies: [], tags: [],
        },
      ]),
    makePost('post-m3', 'teacher-math-001', 'Mr. Roberts', 'math',
      'Extra Help Available This Term',
      "A reminder that I hold **drop-in help sessions every Monday lunchtime** (Room 14). Any student who wants to go over recent work or get ahead on upcoming content is very welcome. Emily has been making great use of these — keep it up!",
      14),
  ],
  'sub-eng': [
    makePost('post-e1', 'teacher-eng-001', 'Ms. Thompson', 'eng',
      'Creative Writing Assignment Feedback',
      "Emily's short story submission was creative and well-structured. She received **75/100**. The narrative voice was distinctive — her main growth area is varied sentence structure to improve flow. Encourage her to read widely this term.",
      1, [
        {
          uuid: 'reply-e1-1',
          author: { uuid: 'parent-001', role: 'parent', display_name: 'Li Wei', email: 'li.wei@email.com' },
          content_markdown: "Thank you so much, Ms. Thompson! We'll encourage Emily to read more novels this month. Are there any specific genres you'd recommend?",
          created_at: new Date(Date.now() - 20 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-e1',
          replies: [], tags: [],
        },
        {
          uuid: 'reply-e1-2',
          author: { uuid: 'teacher-eng-001', role: 'teacher', display_name: 'Ms. Thompson', email: 'thompson@westside.edu.au' },
          content_markdown: "Fantastic question! For sentence variety I'd suggest anything by Roald Dahl — short, punchy prose. For developing narrative voice, try The Curious Incident of the Dog in the Night-Time. Both are very accessible at Year 7 level.",
          created_at: new Date(Date.now() - 14 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-e1',
          replies: [], tags: [],
        },
      ]),
    makePost('post-e2', 'teacher-eng-001', 'Ms. Thompson', 'eng',
      'Reading Log Reminder',
      "A gentle reminder that **reading logs** are due every Friday. Emily has been consistent — keep it up! The next comprehension task covers persuasive texts, so non-fiction reading at home is especially helpful.",
      5, [
        {
          uuid: 'reply-e2-1',
          author: { uuid: 'parent-001', role: 'parent', display_name: 'Li Wei', email: 'li.wei@email.com' },
          content_markdown: "Noted! We've been reading a newspaper together on weekends — would that count as non-fiction practice?",
          created_at: new Date(Date.now() - 4 * 86400_000).toISOString(),
          reply_to_post_uuid: 'post-e2',
          replies: [], tags: [],
        },
        {
          uuid: 'reply-e2-2',
          author: { uuid: 'teacher-eng-001', role: 'teacher', display_name: 'Ms. Thompson', email: 'thompson@westside.edu.au' },
          content_markdown: "Absolutely! Newspaper articles are excellent for persuasive text comprehension. Keep it up!",
          created_at: new Date(Date.now() - 3 * 86400_000 - 12 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-e2',
          replies: [], tags: [],
        },
      ]),
    makePost('post-e3', 'teacher-eng-001', 'Ms. Thompson', 'eng',
      'Oral Presentation — Week 10',
      "Just a heads-up that **oral presentations** are scheduled for Week 10. Students will present a 3–4 minute persuasive speech on a topic of their choice. Emily has chosen \"Why schools should have longer lunch breaks\" — a great choice with lots of evidence to draw on. Practising at home in front of a mirror (or family!) makes a real difference.",
      10, [
        {
          uuid: 'reply-e3-1',
          author: { uuid: 'parent-001', role: 'parent', display_name: 'Li Wei', email: 'li.wei@email.com' },
          content_markdown: "We'll definitely practise at home! Is there a specific rubric she should be aware of — eye contact, pace, that sort of thing?",
          created_at: new Date(Date.now() - 9 * 86400_000).toISOString(),
          reply_to_post_uuid: 'post-e3',
          replies: [], tags: [],
        },
        {
          uuid: 'reply-e3-2',
          author: { uuid: 'teacher-eng-001', role: 'teacher', display_name: 'Ms. Thompson', email: 'thompson@westside.edu.au' },
          content_markdown: "Yes! The rubric is on the portal under 'Assessments > Term 2'. Key criteria are: clear argument structure (30%), evidence use (25%), delivery (25%), and language features (20%). Eye contact and pace both fall under delivery. I've shared a self-assessment checklist on the portal too.",
          created_at: new Date(Date.now() - 8 * 86400_000 - 10 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-e3',
          replies: [], tags: [],
        },
      ]),
  ],
  'sub-sci': [
    makePost('post-s1', 'teacher-sci-001', 'Dr. Chen', 'sci',
      'Science Fair Project Update',
      "Emily's science fair project on **plant growth under different light spectra** is progressing excellently — currently one of the top 3 in class. Her hypothesis is well-defined and her data collection is rigorous. Final submission is in 3 weeks.",
      3, [
        {
          uuid: 'reply-s1-1',
          author: { uuid: 'parent-001', role: 'parent', display_name: 'Li Wei', email: 'li.wei@email.com' },
          content_markdown: "We're so proud! She's been working on it most evenings. Does she need to bring any materials from home for the final display board?",
          created_at: new Date(Date.now() - 2 * 86400_000 - 8 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-s1',
          replies: [], tags: [],
        },
        {
          uuid: 'reply-s1-2',
          author: { uuid: 'teacher-sci-001', role: 'teacher', display_name: 'Dr. Chen', email: 'chen@westside.edu.au' },
          content_markdown: "The school provides the display boards and printing. Emily just needs to bring her plant specimens and any props she wants to use during the judging Q&A. Very excited to see the final result!",
          created_at: new Date(Date.now() - 2 * 86400_000 - 1 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-s1',
          replies: [], tags: [],
        },
      ]),
    makePost('post-s2', 'teacher-sci-001', 'Dr. Chen', 'sci',
      'Lab Report Feedback — Chemical Reactions',
      "Emily's lab report on the vinegar and baking soda reaction earned **88%**. Her methodology section was excellent and her safety analysis was thorough. To push into the A-range next time, focus on quantitative analysis — include actual measurements and calculations in the results section rather than purely qualitative observations.",
      10),
    makePost('post-s3', 'teacher-sci-001', 'Dr. Chen', 'sci',
      'Upcoming Unit: Earth & Space',
      "We begin our **Earth & Space unit** in Week 9. This is a favourite! Topics include plate tectonics, the rock cycle, and our solar system. A great pre-reading resource is the ABC Science website — particularly the 'Space' section. Emily's strong spatial reasoning should serve her very well in this unit.",
      16),
  ],
  'sub-hass': [
    makePost('post-h1', 'teacher-hass-001', 'Mr. Williams', 'hass',
      'Geography Research Task',
      "Emily submitted a solid research task on climate change impacts in the Asia-Pacific. Score: **70%**. She demonstrated good source selection but needs to improve her analysis depth. I have added detailed comments to her returned work in the portal.",
      4, [
        {
          uuid: 'reply-h1-1',
          author: { uuid: 'parent-001', role: 'parent', display_name: 'Li Wei', email: 'li.wei@email.com' },
          content_markdown: "Thank you for the feedback. When you say 'analysis depth', could you give us an example of what you're looking for? We want to help her improve at home.",
          created_at: new Date(Date.now() - 3 * 86400_000 - 4 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-h1',
          replies: [], tags: [],
        },
        {
          uuid: 'reply-h1-2',
          author: { uuid: 'teacher-hass-001', role: 'teacher', display_name: 'Mr. Williams', email: 'williams@westside.edu.au' },
          content_markdown: "Great question! Analysis means going beyond 'what happened' to explain 'why it matters' and 'who is affected'. For example, instead of 'sea levels are rising', a strong analytical sentence would be 'Rising sea levels disproportionately impact low-income coastal communities in the Pacific who lack the resources to relocate.' I've included examples in the portal feedback. Happy to discuss further at interviews!",
          created_at: new Date(Date.now() - 2 * 86400_000 - 22 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-h1',
          replies: [], tags: [],
        },
      ]),
    makePost('post-h2', 'teacher-hass-001', 'Mr. Williams', 'hass',
      'Civics Assignment — Due Week 9',
      "Our current **Civics & Citizenship unit** concludes with a poster assignment on how Australian democracy works. Emily needs to cover: the three levels of government, the role of the Senate, and one recent policy debate. Due date is Friday of Week 9. Resources have been shared via the portal.",
      9),
  ],
  'sub-pe': [
    makePost('post-p1', 'teacher-pe-001', 'Ms. Davis', 'pe',
      'Athletics Carnival Performance',
      "Emily had a fantastic athletics carnival — she placed **2nd in the 800m** and contributed strongly to the relay team. Her fitness levels have improved significantly this term. Encourage continued aerobic activity outside school.",
      2),
    makePost('post-p2', 'teacher-pe-001', 'Ms. Davis', 'pe',
      'Swimming Program — Week 8–10',
      "We begin the **school swimming program** this week at the Westside Aquatic Centre. Emily will need her swimsuit, towel, goggles, and a labelled swim cap each Monday and Wednesday. Please ensure she has a healthy snack as sessions run straight after Period 3.",
      6, [
        {
          uuid: 'reply-p2-1',
          author: { uuid: 'parent-001', role: 'parent', display_name: 'Li Wei', email: 'li.wei@email.com' },
          content_markdown: "Thanks for the reminder! Is there a permission form we need to sign, or was that done at the start of term?",
          created_at: new Date(Date.now() - 5 * 86400_000 - 14 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-p2',
          replies: [], tags: [],
        },
        {
          uuid: 'reply-p2-2',
          author: { uuid: 'teacher-pe-001', role: 'teacher', display_name: 'Ms. Davis', email: 'davis@westside.edu.au' },
          content_markdown: "The general swimming consent was included in the start-of-year enrolment forms, so you're all set! If Emily has any medical conditions I should know about for water safety, please let me know via the office. Otherwise, she's good to go.",
          created_at: new Date(Date.now() - 5 * 86400_000 - 10 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-p2',
          replies: [], tags: [],
        },
      ]),
    makePost('post-p3', 'teacher-pe-001', 'Ms. Davis', 'pe',
      'Term 2 Fitness Improvement — Well Done!',
      "I wanted to highlight Emily's impressive fitness gains this term. Her **beep test score improved from 8.2 to 10.4** — that's a significant jump and reflects consistent effort. She's also been a positive leader in team sport activities. Keep encouraging physical activity at home!",
      18),
  ],
  'sub-arts': [
    makePost('post-a1', 'teacher-arts-001', 'Ms. Rivera', 'arts',
      'Visual Arts Portfolio Progress',
      "Emily's portfolio is coming along beautifully. Her mixed-media piece on identity has real depth. Score so far: **79/100** for process work. The final piece will be displayed at the school's mid-year exhibition in Week 10.",
      6, [
        {
          uuid: 'reply-a1-1',
          author: { uuid: 'parent-001', role: 'parent', display_name: 'Li Wei', email: 'li.wei@email.com' },
          content_markdown: "We're looking forward to the exhibition! Will parents be able to attend, and if so, what time does it run?",
          created_at: new Date(Date.now() - 5 * 86400_000 - 8 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-a1',
          replies: [], tags: [],
        },
        {
          uuid: 'reply-a1-2',
          author: { uuid: 'teacher-arts-001', role: 'teacher', display_name: 'Ms. Rivera', email: 'rivera@westside.edu.au' },
          content_markdown: "Absolutely! The exhibition is open to families from 5:30–7:30pm on Thursday of Week 10. Light refreshments will be provided. Emily's piece will be prominently displayed — I can't wait for you to see it in person. It really is one of the standout works.",
          created_at: new Date(Date.now() - 4 * 86400_000 - 20 * 3600_000).toISOString(),
          reply_to_post_uuid: 'post-a1',
          replies: [], tags: [],
        },
      ]),
    makePost('post-a2', 'teacher-arts-001', 'Ms. Rivera', 'arts',
      'Colour Theory Assessment Results',
      "The colour theory projects were marked last week. Emily received **81/100** — a strong result. Her understanding of complementary and analogous colour schemes was sophisticated. The main area for development is composition: how she arranges elements on the page to create visual balance.",
      20),
  ],
};

// ── Dashboard ─────────────────────────────────────────────────

export const mockParentDashboard: DashboardResponse = {
  summary_cards: [
    { label: 'overallAverage', value: '78%',  sub: '+3 this term',   trend: 'up',   color: 'a1' },
    { label: 'attendance',     value: '96%',  sub: '2 absences',     trend: 'flat', color: 'a2' },
    { label: 'tasksDue',       value: 4,      sub: 'this week',      trend: 'down', color: 'a3' },
    { label: 'newPosts',       value: 3,      sub: 'from teachers',  trend: 'up',   color: 'a4' },
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

// ── Direct Messages (parent ↔ teacher 1-on-1) ────────────────

export interface DirectMessage {
  uuid: string;
  sender: 'parent' | 'teacher';
  text: string;
  sent_at: string;
}

const dm = (uuid: string, sender: 'parent' | 'teacher', text: string, hoursAgo: number): DirectMessage => ({
  uuid, sender, text, sent_at: new Date(Date.now() - hoursAgo * 3600_000).toISOString(),
});

export const mockDirectMessages: Record<string, DirectMessage[]> = {
  // Real backend thread UUID → same messages as thread-sub-eng (Ms. Thompson English thread)
  'thread-parent01-teacher01-aiden': [
    dm('dm-e1r', 'teacher', "Hello Li Wei! I wanted to follow up on Aiden's persuasive essay — the argument structure was solid but the conclusion needs more punch.", 96),
    dm('dm-e2r', 'parent',  "Thanks Ms. Thompson. Is there a resource you'd recommend for strengthening conclusions?", 94),
    dm('dm-e3r', 'teacher', "The BBC Bitesize writing guides are fantastic for this age group. I'll also run a small workshop next Tuesday.", 93),
    dm('dm-e4r', 'parent',  "That's really helpful, thank you! One more question — how is Aiden doing with class participation? She tends to be quite quiet.", 50),
    dm('dm-e5r', 'teacher', "That's a great observation. She's thoughtful rather than quiet — she tends to give very considered answers when she does contribute. I've been pairing her with students who draw her out. She's definitely growing in confidence.", 47),
    dm('dm-e6r', 'parent',  "That's reassuring to hear. We'll keep encouraging her to speak up at home too.", 46),
    dm('dm-e7r', 'teacher', "Hi Li Wei! I'd recommend The Curious Incident by Mark Haddon for varied narrative voice. Aiden is doing really well overall!", 24),
    dm('dm-e8r', 'parent',  "Wonderful, we'll pick that up this weekend. Thanks so much for all your support this term!", 20),
  ],
  'thread-sub-math': [
    dm('dm-m1', 'teacher', "Hi Li Wei! Just wanted to let you know that Emily did really well on last week's algebra quiz — scored 91%. Keep encouraging that practice at home!", 72),
    dm('dm-m2', 'parent',  "That's great to hear, thank you Mr. Roberts! She's been using Khan Academy in the evenings.", 71),
    dm('dm-m3', 'teacher', "Excellent — that's exactly the kind of supplementary work that makes a difference. The next unit is quadratic expressions, starting Week 9.", 70),
    dm('dm-m4', 'parent',  "Is there anything specific we should focus on to prepare?", 48),
    dm('dm-m5', 'teacher', "Factoring and expanding brackets. I'll send a practice sheet via the school portal this Friday.", 47),
    dm('dm-m6', 'parent',  "Perfect, we'll look out for it. Thanks!", 46),
    dm('dm-m7', 'teacher', "Quick update — I've posted the Chapter 4 revision checklist and two past papers to the portal under 'Resources'. The Wednesday lunchtime session is still on. Emily showed great focus in today's lesson!", 22),
    dm('dm-m8', 'parent',  "She mentioned the lunchtime session — I think she's planning to go. Should she bring anything in particular?", 20),
    dm('dm-m9', 'teacher', "Just her exercise book and a pencil. I'll provide the practice problems. See you at parent-teacher interviews next week!", 18),
  ],
  'thread-sub-eng': [
    dm('dm-e1', 'teacher', "Hello Li Wei! I wanted to follow up on Emily's persuasive essay — the argument structure was solid but the conclusion needs more punch.", 96),
    dm('dm-e2', 'parent',  "Thanks Ms. Thompson. Is there a resource you'd recommend for strengthening conclusions?", 94),
    dm('dm-e3', 'teacher', "The BBC Bitesize writing guides are fantastic for this age group. I'll also run a small workshop next Tuesday if Emily would like to join.", 93),
    dm('dm-e4', 'parent',  "She'd love that! I'll let her know. Also — her reading log is due Friday. Is the format flexible or does it need to match the template?", 72),
    dm('dm-e5', 'teacher', "The template is preferred as it prompts them to reflect beyond plot summary — but the most important thing is that she's reading. The newspaper habit you mentioned is fantastic!", 70),
    dm('dm-e6', 'parent',  "Good to know. Hi Ms. Thompson, thank you for the feedback on Emily's creative writing. Could you recommend any specific books that might help with sentence variety?", 48),
    dm('dm-e7', 'teacher', "Hi Li Wei! Great question. I'd recommend The Curious Incident of the Dog in the Night-Time by Mark Haddon for varied narrative voice, and any Roald Dahl for punchy, varied sentence rhythms. Emily is doing really well overall!", 24),
    dm('dm-e8', 'parent',  "We'll grab both from the library this weekend! One last thing — Emily is a bit nervous about the oral presentation. Any tips for managing nerves?", 10),
    dm('dm-e9', 'teacher', "Totally normal! The best advice: practise out loud at least 5 times, not just in your head. Record yourself once to catch filler words. And remember — the audience wants you to succeed. She's going to do great.", 8),
  ],
  'thread-sub-sci': [
    dm('dm-s1', 'teacher', "Emily's science fair project proposal has been approved! She chose plant growth under different light spectra — a really rigorous topic for Year 7.", 120),
    dm('dm-s2', 'parent',  "She's very excited about it! What materials will she need for the experiments?", 118),
    dm('dm-s3', 'teacher', "Mostly things you may have at home: small plant pots, potting mix, seedlings (bean or cress work well), coloured cellophane, and a ruler. I've sent a full list to the school email.", 117),
    dm('dm-s4', 'parent',  "Got it, thank you! How long will the experiment run for?", 100),
    dm('dm-s5', 'teacher', "Three weeks of data collection, then one week to write up. She should be taking measurements and photos every two days if possible — consistency is key for the results section.", 99),
    dm('dm-s6', 'parent',  "We've set up a little spot by the window for her plants — she's been measuring every morning before school!", 72),
    dm('dm-s7', 'teacher', "That's wonderful dedication — that kind of commitment will really show in her data. I'll check in with her progress on Friday.", 70),
    dm('dm-s8', 'parent',  "Quick question — her plants in the red light condition seem to be growing much faster. Is that expected?", 30),
    dm('dm-s9', 'teacher', "Yes! Red wavelengths (around 660nm) are most efficiently absorbed by chlorophyll for photosynthesis. That's a great finding — make sure she records it carefully as it will be a highlight of her discussion section.", 27),
  ],
  'thread-sub-hass': [
    dm('dm-h1', 'teacher', "Hi Li Wei, just wanted to reach out regarding Emily's HASS geography task. She scored 70% — a solid result but I've added feedback on how to deepen her analytical writing.", 80),
    dm('dm-h2', 'parent',  "Thank you Mr. Williams. We reviewed the feedback together last night. We're working on helping her move from description to analysis. Is this a skill she'll use across other subjects too?", 76),
    dm('dm-h3', 'teacher', "Absolutely — analytical writing is the backbone of senior school across English, Science, HASS, and beyond. The TEEL paragraph structure (Topic, Evidence, Explain, Link) is what I teach — very transferable. I'll send a reference sheet home.", 74),
    dm('dm-h4', 'parent',  "That would be really helpful, thank you! Will you be at parent-teacher interviews next week?", 48),
    dm('dm-h5', 'teacher', "Yes, I have slots available on Monday afternoon and Tuesday morning. You can book through the school portal. Looking forward to discussing Emily's progress in person!", 45),
  ],
  'thread-sub-pe': [
    dm('dm-p1', 'teacher', "Hi Li Wei! Wanted to share that Emily placed 2nd in the 800m at the athletics carnival today. She ran a personal best time. You should be very proud!", 50),
    dm('dm-p2', 'parent',  "Oh that's wonderful news, thank you for letting us know! She didn't even mention it when she came home — typical!", 48),
    dm('dm-p3', 'teacher', "Ha! Very modest. She's also been a great sport and team leader in relay. The swimming program starts next week — I've sent details via post.", 47),
    dm('dm-p4', 'parent',  "We got the letter. One question — Emily has mild asthma. Is there anything special we should let you know about for swimming?", 24),
    dm('dm-p5', 'teacher', "Thank you for telling me! Please make sure she has her inhaler with her on swimming days and let the front office know it's in her bag. I'll also note it on our register. She should be completely fine for swimming — we always have a lifeguard present.", 21),
    dm('dm-p6', 'parent',  "Will do, thank you for being so understanding. She loves swimming so we definitely don't want her to miss out.", 20),
  ],
  'thread-sub-arts': [
    dm('dm-a1', 'teacher', "Hi Li Wei! Quick message to say Emily's mixed-media portfolio piece is genuinely one of the most thoughtful in the class this year. The theme of identity really resonates.", 90),
    dm('dm-a2', 'parent',  "That's so lovely to hear, thank you Ms. Rivera! She's spent a lot of time on it. We sometimes worry she's neglecting other subjects for art!", 88),
    dm('dm-a3', 'teacher', "I completely understand! Balance is important. That said, creative skills support learning across all areas — spatial reasoning, sustained focus, expressing complex ideas. It's never wasted time. The exhibition is Thursday Week 10, 5:30–7:30pm — I hope you can make it!", 86),
    dm('dm-a4', 'parent',  "We've already put it in the calendar! Will there be a catalogue or artist statement for each piece?", 60),
    dm('dm-a5', 'teacher', "Yes! Students write a short 80-word artist statement. Emily's draft is excellent — she articulates her creative choices beautifully. I'll have printed copies available at the exhibition.", 58),
    dm('dm-a6', 'parent',  "Perfect. We're really looking forward to it. Is there anything she should be working on at home to finalise the piece?", 24),
    dm('dm-a7', 'teacher', "She's nearly done — just the finishing layer of the mixed media collage and the mounting. If she has any metallic or textured paper at home that could add to the final layer, that might be a nice touch. But honestly, it's already beautiful as is.", 22),
  ],
};

// Maps teacher-side studentUuid → threadUuid (for Ms. Thompson's parent conversations)
export const mockTeacherStudentThreads: Record<string, string> = {
  'student-001':  'thread-sub-eng',                      // offline mock fallback
  's-aiden-01':   'thread-parent01-teacher01-aiden',     // real backend thread UUID
};

// ── Discussion Teachers ───────────────────────────────────────

export const mockDiscussionTeachers: DiscussionTeacherItem[] = mockSubjects.map((sub, i) => {
  const threadUuid = `thread-${sub.uuid}`;
  const dms = mockDirectMessages[threadUuid] ?? [];
  const lastMsg = dms[dms.length - 1];
  return {
    teacher: mockTeachers[sub.code],
    thread_uuid: threadUuid,
    last_post_at: lastMsg?.sent_at ?? new Date(Date.now() - i * 2 * 86400_000).toISOString(),
    unread_count: i === 0 ? 1 : i === 1 ? 2 : 0,
    subject: sub,
    latest_message_preview: lastMsg?.text ?? '',
  };
});

// ── Teacher Students ──────────────────────────────────────────

export const mockTeacherStudents: TeacherStudentItem[] = [
  { student: { uuid: 's-aiden-01', display_name: 'Aiden Wei',       grade: 'Year 7', class_name: '7A', overall_score: 78 }, overall_score: 78, at_risk: false, unread_messages: 1, subjects: mockSubjects },
  { student: { uuid: 's-priya-01', display_name: 'Priya Sharma',    grade: 'Year 7', class_name: '7A', overall_score: 90 }, overall_score: 90, at_risk: false, unread_messages: 0, subjects: mockSubjects },
  { student: { uuid: 's-james-01', display_name: "James O'Brien",   grade: 'Year 7', class_name: '7A', overall_score: 66 }, overall_score: 66, at_risk: false, unread_messages: 0, subjects: mockSubjects },
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
    { label: 'totalStudents', value: 168, sub: 'across 6 classes', color: 'a1' },
    { label: 'averageScore',  value: '74%', sub: '+2% this term',  color: 'a2' },
    { label: 'atRisk',        value: 21,    sub: 'need attention',  color: 'a3' },
    { label: 'unreadMsgs',    value: 7,     sub: 'from parents',    color: 'a4' },
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
