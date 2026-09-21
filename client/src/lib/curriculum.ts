export type CurriculumSubject = {
  id: string;
  name: string;
  short: string;
  status: "live" | "upcoming";
  accent: string;
  description: string;
};

export type CurriculumUnit = {
  grade: string;
  term: string;
  subject: string;
  weeks: string[];
};

export const curriculumSubjects: CurriculumSubject[] = [
  { id: "maths", name: "Mathematics", short: "MAT", status: "live", accent: "#4e91c6", description: "Number, algebra, geometry, statistics, and quantitative reasoning." },
  { id: "english", name: "English Studies", short: "ENG", status: "live", accent: "#9a6dc1", description: "Speech work, grammar, reading, composition, and literature." },
  { id: "physics", name: "Physics", short: "PHY", status: "upcoming", accent: "#c58e3d", description: "Mechanics, energy, waves, electricity, and practical investigation." },
  { id: "chemistry", name: "Chemistry", short: "CHE", status: "upcoming", accent: "#d45a4a", description: "Matter, reactions, periodicity, quantitative chemistry, and laboratory work." },
  { id: "biology", name: "Biology", short: "BIO", status: "upcoming", accent: "#3b926f", description: "Living systems, ecology, genetics, health, and practical biology." },
  { id: "history", name: "History", short: "HIS", status: "upcoming", accent: "#8053a9", description: "People, places, events, evidence, identity, and civic understanding." },
];

export const nerdcUnits: CurriculumUnit[] = [
  { grade: "JSS1", term: "First term", subject: "maths", weeks: ["Whole numbers and place value", "Factors, multiples, primes, HCF and LCM", "Fractions, decimals and percentages", "Directed numbers", "Mid-term examination", "Basic algebraic expressions", "Mid-term break", "Simple equations", "Angles and plane shapes", "Data collection and pictograms", "Revision", "Revision and examination", "Closing"] },
  { grade: "JSS1", term: "Second term", subject: "maths", weeks: ["Approximation and estimation", "Ratio, rate and proportion", "Number bases", "Algebraic substitution", "Mid-term examination", "Linear graphs", "Mid-term break", "Perimeter and area", "Solid shapes and nets", "Statistics and probability language", "Revision", "Revision and examination", "Closing"] },
  { grade: "JSS1", term: "Third term", subject: "maths", weeks: ["Simple equations", "Plane shapes", "Three-dimensional figures", "Constructions", "Mid-term examination", "Angles and angle sum properties", "Mid-term break", "Everyday statistics I", "Everyday statistics II", "Everyday statistics III", "Revision", "Revision and examination", "Closing"] },
  { grade: "JSS2", term: "First term", subject: "maths", weeks: ["Standard form and decimal operations", "Prime factors and applications", "Fractions, ratios and percentages", "Directed numbers", "Mid-term examination", "Algebraic expressions and simple equations", "Mid-term break", "Angles and polygons", "Area, volume and capacity", "Data presentation", "Revision", "Revision and examination", "Closing"] },
  { grade: "JSS2", term: "Second term", subject: "maths", weeks: ["Review of first-term algebra", "Inequalities", "Simultaneous ideas and graphs", "Pythagoras introduction", "Mid-term examination", "Bearings and scale drawing", "Mid-term break", "Statistics: mean, median and mode", "Probability experiments", "Quantitative reasoning", "Revision", "Revision and examination", "Closing"] },
  { grade: "JSS2", term: "Third term", subject: "maths", weeks: ["Revision of second term's examination", "Angles and polygons", "Angles of elevation and depression", "Bearings and distances", "Mid-term examination", "Bearings and distances II", "Mid-term break", "Statistics: data presentation", "Statistics: graphical representation", "Probability", "Revision", "Examination", "Closing"] },
  { grade: "JSS3", term: "First term", subject: "maths", weeks: ["Simultaneous linear equations", "Similarity and scale factor", "Areas of plane figures", "Trigonometry of right-angled triangles", "Mid-term examination", "Angles of elevation and depression", "Mid-term break", "Construction and loci", "Measures of central tendency", "Data presentation with pie charts", "Revision", "Revision and examination", "Closing"] },
  { grade: "SS1", term: "First term", subject: "maths", weeks: ["Number bases and modular arithmetic", "Surds and logarithms", "Sets and Venn diagrams", "Quadratic equations", "Mid-term examination", "Sequences and series", "Mid-term break", "Coordinate geometry", "Trigonometric ratios", "Statistics and probability", "Revision", "Revision and examination", "Closing"] },
  { grade: "SS2", term: "First term", subject: "maths", weeks: ["Functions and graphs", "Permutation and combination", "Binomial expansion", "Differentiation ideas", "Mid-term examination", "Integration ideas", "Mid-term break", "Vectors", "Correlation and regression", "Financial mathematics", "Revision", "Revision and examination", "Closing"] },
  { grade: "SS3", term: "First term", subject: "maths", weeks: ["Revision of algebra and functions", "Geometry and mensuration", "Trigonometry and identities", "Statistics and probability", "Mid-term examination", "Calculus applications", "Mid-term break", "Quantitative reasoning and examination preparation", "Revision and practice", "Revision and practice", "Revision", "Revision and examination", "Closing"] },
  { grade: "JSS1", term: "First term", subject: "english", weeks: ["Vowel sounds and consonant sounds", "Parts of speech and sentence structure", "SQ3R reading strategy", "Vocabulary in context", "Mid-term examination", "Paragraph and informal letter writing", "Mid-term break", "Folktales and recommended prose", "Revision and practice", "Revision and practice", "Revision", "Revision and examination", "Closing"] },
  { grade: "JSS1", term: "Second term", subject: "english", weeks: ["Vowel sounds and word stress", "Tenses and adverbials", "Reading for conclusions and opinions", "Formal letter writing", "Mid-term examination", "Folktales and introduction to poetry", "Mid-term break", "Figures of speech: simile, metaphor and irony", "Revision and practice", "Revision and practice", "Revision", "Revision and examination", "Closing"] },
  { grade: "JSS2", term: "First term", subject: "english", weeks: ["Listening and speaking", "Revision of parts of speech", "Reading and comprehension strategies", "Outline and narrative composition", "Mid-term examination", "Prose and drama features", "Mid-term break", "Vocabulary and spelling drills", "Revision and practice", "Revision and practice", "Revision", "Revision and examination", "Closing"] },
  { grade: "JSS2", term: "Second term", subject: "english", weeks: ["Diphthongs and consonant sounds", "Active and passive voice", "Keywords and spatial description", "Expository and argumentative essays", "Mid-term examination", "Myths, legends and poetry", "Mid-term break", "Figures of speech and dramatization", "Revision and practice", "Revision and practice", "Revision", "Revision and examination", "Closing"] },
  { grade: "JSS3", term: "First term", subject: "english", weeks: ["Pronunciation and syllables", "Clauses, phrases and sentence types", "Reading for evaluation", "Formal and informal composition", "Mid-term examination", "Drama, prose and poetry appreciation", "Mid-term break", "Vocabulary development", "Revision and practice", "Revision and practice", "Revision", "Revision and examination", "Closing"] },
  { grade: "SS1", term: "First term", subject: "english", weeks: ["Speech sounds and stress", "Grammar: clauses and sentence patterns", "Reading comprehension and summary", "Narrative, descriptive and expository writing", "Mid-term examination", "Vocabulary development", "Mid-term break", "Literature: prose, drama and poetry", "Revision and practice", "Revision and practice", "Revision", "Revision and examination", "Closing"] },
  { grade: "SS2", term: "First term", subject: "english", weeks: ["Spoken English and intonation", "Grammar: concord, tenses and modifiers", "Reading for inference and evaluation", "Argumentative and analytical essays", "Mid-term examination", "Lexis and structure", "Mid-term break", "Literature and recommended texts", "Revision and practice", "Revision and practice", "Revision", "Revision and examination", "Closing"] },
  { grade: "SS3", term: "First term", subject: "english", weeks: ["Falling and rising tones", "Grammar revision for external examinations", "Comprehension, summary and vocabulary", "Formal, argumentative and expository writing", "Mid-term examination", "Poetry, prose and drama appreciation", "Mid-term break", "Common errors and examination practice", "Revision and practice", "Revision and practice", "Revision", "Revision and examination", "Closing"] },
];

export const curriculumSource = "English&MathsCurriculumNERDC.pdf";
export const curriculumSourceNote = "NERDC scheme of work supplied by the BrimLearn team; 47-page reference covering JSS1–JSS3 and SS1–SS3 English and Mathematics. Each term follows the NERDC rhythm: week 5 mid-term examination, week 7 mid-term break, week 12 revision and examination, week 13 closing.";

export function unitsFor(subject: string, grade: string, term: string) {
  return nerdcUnits.find((unit) => unit.subject === subject && unit.grade === grade && unit.term === term);
}
