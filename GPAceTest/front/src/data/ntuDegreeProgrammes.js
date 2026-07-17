// Curated from https://www.ntu.edu.sg/education/degree-programmes
// (single-degree programmes) and .../degree-programmes#Content_C007_Col00
// (Double Major / Double Degree Programmes sections).
// NTU does not expose a public API for this catalog, so this list is
// maintained manually — refresh it from those pages if it goes stale.
export const NTU_DEGREE_PROGRAMMES = [
  // Nanyang Business School
  { name: 'Accountancy', college: 'Nanyang Business School', category: 'single' },
  { name: 'Accountancy (Sustainability Management and Analytics)', college: 'Nanyang Business School', category: 'single' },
  { name: 'Business', college: 'Nanyang Business School', category: 'single' },

  // College of Computing and Data Science
  { name: 'Artificial Intelligence and Society', college: 'College of Computing and Data Science', category: 'single' },
  { name: 'Applied Computing in Finance', college: 'College of Computing and Data Science', category: 'single' },
  { name: 'Computer Science', college: 'College of Computing and Data Science', category: 'single' },
  { name: 'Data Science and Artificial Intelligence', college: 'College of Computing and Data Science', category: 'single' },
  { name: 'Computing (Bachelor of Technology, Work-Study)', college: 'College of Computing and Data Science', category: 'single' },

  // College of Engineering
  { name: 'Bioengineering', college: 'College of Engineering', category: 'single' },
  { name: 'Chemical and Biomolecular Engineering', college: 'College of Engineering', category: 'single' },
  { name: 'Civil Engineering', college: 'College of Engineering', category: 'single' },
  { name: 'Environmental Engineering', college: 'College of Engineering', category: 'single' },
  { name: 'Electrical and Electronic Engineering', college: 'College of Engineering', category: 'single' },
  { name: 'Aerospace Engineering', college: 'College of Engineering', category: 'single' },
  { name: 'Mechanical Engineering', college: 'College of Engineering', category: 'single' },
  { name: 'Robotics', college: 'College of Engineering', category: 'single' },
  { name: 'Materials Engineering', college: 'College of Engineering', category: 'single' },

  // College of Humanities, Arts and Social Sciences
  { name: 'Art, Design and Media', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'Chinese', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'Chinese Creative Writing', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'English', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'History', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'Linguistics and Multilingual Studies', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'Philosophy', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'Economics', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'Philosophy, Politics, and Economics', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'Psychology', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'Public Policy and Global Affairs', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'Sociology', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },
  { name: 'Communication Studies', college: 'College of Humanities, Arts and Social Sciences', category: 'single' },

  // Lee Kong Chian School of Medicine
  { name: 'Medicine', college: 'Lee Kong Chian School of Medicine', category: 'single' },

  // College of Science
  { name: 'Chemistry and Biological Chemistry', college: 'College of Science', category: 'single' },
  { name: 'Biological Sciences', college: 'College of Science', category: 'single' },
  { name: 'Mathematical Sciences', college: 'College of Science', category: 'single' },
  { name: 'Physics and Applied Physics', college: 'College of Science', category: 'single' },
  { name: 'Environmental Earth Systems Science', college: 'College of Science', category: 'single' },
  { name: 'Maritime Studies', college: 'College of Science', category: 'single' },

  // National Institute of Education
  { name: 'Art and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Biology and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Chemistry and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Chinese Studies and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Chinese Medicine', college: 'National Institute of Education', category: 'single' },
  { name: 'Drama and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'English Language & Linguistics and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'English Literature and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Food & Consumer Sciences and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Geography and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'History and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Malay Studies and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Mathematics & Computational Thinking and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Music and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Physics & Energy Studies and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Sport Science and Management', college: 'National Institute of Education', category: 'single' },
  { name: 'Sport Science and Education', college: 'National Institute of Education', category: 'single' },
  { name: 'Tamil Studies and Education', college: 'National Institute of Education', category: 'single' },

  // Double Major Programmes — one degree, one GPA, compound major name
  { name: 'Biological Sciences and Psychology', category: 'doubleMajor' },
  { name: 'Biomedical Sciences and BioBusiness', category: 'doubleMajor' },
  { name: 'Chinese and English', category: 'doubleMajor' },
  { name: 'Chinese and Linguistics and Multilingual Studies', category: 'doubleMajor' },
  { name: 'Economics and Media Analytics', category: 'doubleMajor' },
  { name: 'Economics and Psychology', category: 'doubleMajor' },
  { name: 'Economics and Public Policy and Global Affairs', category: 'doubleMajor' },
  { name: 'English and History', category: 'doubleMajor' },
  { name: 'English and Philosophy', category: 'doubleMajor' },
  { name: 'English Literature and Art History', category: 'doubleMajor' },
  { name: 'Environmental Earth Systems Science and Public Policy and Global Affairs', category: 'doubleMajor' },
  { name: 'History and Chinese', category: 'doubleMajor' },
  { name: 'History and Linguistics and Multilingual Studies', category: 'doubleMajor' },
  { name: 'Linguistics and Multilingual Studies and English', category: 'doubleMajor' },
  { name: 'Linguistics and Multilingual Studies and Philosophy', category: 'doubleMajor' },
  { name: 'Mathematical and Computer Sciences', category: 'doubleMajor' },
  { name: 'Mathematical Sciences and Economics', category: 'doubleMajor' },
  { name: 'Philosophy and Chinese', category: 'doubleMajor' },
  { name: 'Philosophy and History', category: 'doubleMajor' },
  { name: 'Physics and Mathematical Sciences', category: 'doubleMajor' },
  { name: 'Process Engineering and Synthetic Chemistry', category: 'doubleMajor' },
  { name: 'Psychology and Media Analytics', category: 'doubleMajor' },
  { name: 'Psychology and Linguistics and Multilingual Studies', category: 'doubleMajor' },

  // Double Degree Programmes (Full Time) — two separate degrees, tracked as two GPAs
  { name: 'Accountancy and Business', category: 'doubleDegree', primary: 'Accountancy', secondary: 'Business' },
  { name: 'Accountancy and Data Science and Artificial Intelligence', category: 'doubleDegree', primary: 'Accountancy', secondary: 'Data Science and Artificial Intelligence' },
  { name: 'Business and Computing', category: 'doubleDegree', primary: 'Business', secondary: 'Computing' },
  { name: 'Business and Computer Engineering', category: 'doubleDegree', primary: 'Business', secondary: 'Computer Engineering' },
  { name: 'Computer Science and Economics', category: 'doubleDegree', primary: 'Computer Science', secondary: 'Economics' },
  { name: 'Engineering+ and Economics', category: 'doubleDegree', primary: 'Engineering+', secondary: 'Economics' }
];
