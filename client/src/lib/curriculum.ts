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
  { grade: "JSS1", term: "First term", subject: "maths", weeks: ["Whole numbers and place value", "Factors, multiples, primes, HCF and LCM", "Fractions, decimals and percentages", "Directed numbers", "Basic algebraic expressions", "Simple equations", "Angles and plane shapes", "Data collection and pictograms"] },
  { grade: "JSS1", term: "Second term", subject: "maths", weeks: ["Approximation and estimation", "Ratio, rate and proportion", "Number bases", "Algebraic substitution", "Linear graphs", "Perimeter and area", "Solid shapes and nets", "Statistics and probability language"] },
  { grade: "JSS1", term: "Third term", subject: "maths", weeks: ["Revision of number and algebra", "Construction with ruler and compass", "Symmetry and transformations", "Measurement and scale drawing", "Revision and examination"] },
  { grade: "JSS2", term: "First term", subject: "maths", weeks: ["Standard form and decimal operations", "Prime factors and applications", "Fractions, ratios and percentages", "Directed numbers", "Algebraic expressions and simple equations", "Angles and polygons", "Area, volume and capacity", "Data presentation"] },
  { grade: "JSS2", term: "Second term", subject: "maths", weeks: ["Review of first-term algebra", "Inequalities", "Simultaneous ideas and graphs", "Pythagoras introduction", "Bearings and scale drawing", "Statistics: mean, median and mode", "Probability experiments", "Quantitative reasoning"] },
  { grade: "JSS2", term: "Third term", subject: "maths", weeks: ["Number bases and operations", "Variation", "Factorisation", "Simple equations involving fractions", "Change of subject of formulae", "Revision and examination"] },
  { grade: "JSS3", term: "First term", subject: "maths", weeks: ["Simultaneous linear equations", "Similarity and scale factor", "Areas of plane figures", "Trigonometry of right-angled triangles", "Angles of elevation and depression", "Construction and loci", "Measures of central tendency", "Data presentation with pie charts"] },
  { grade: "SS1", term: "First term", subject: "maths", weeks: ["Number bases and modular arithmetic", "Surds and logarithms", "Sets and Venn diagrams", "Quadratic equations", "Sequences and series", "Coordinate geometry", "Trigonometric ratios", "Statistics and probability"] },
  { grade: "SS2", term: "First term", subject: "maths", weeks: ["Functions and graphs", "Permutation and combination", "Binomial expansion", "Differentiation ideas", "Integration ideas", "Vectors", "Correlation and regression", "Financial mathematics"] },
  { grade: "SS3", term: "First term", subject: "maths", weeks: ["Revision of algebra and functions", "Geometry and mensuration", "Trigonometry and identities", "Statistics and probability", "Calculus applications", "Quantitative reasoning and examination preparation"] },
  { grade: "JSS1", term: "First term", subject: "english", weeks: ["Vowel sounds and consonant sounds", "Parts of speech and sentence structure", "SQ3R reading strategy", "Vocabulary in context", "Paragraph and informal letter writing", "Folktales and recommended prose", "Revision and examination"] },
  { grade: "JSS1", term: "Second term", subject: "english", weeks: ["Vowel sounds and word stress", "Tenses and adverbials", "Reading for conclusions and opinions", "Formal letter writing", "Folktales and introduction to poetry", "Figures of speech: simile, metaphor and irony", "Revision and examination"] },
  { grade: "JSS2", term: "First term", subject: "english", weeks: ["Listening and speaking", "Revision of parts of speech", "Reading and comprehension strategies", "Outline and narrative composition", "Prose and drama features", "Vocabulary and spelling drills", "Revision and examination"] },
  { grade: "JSS2", term: "Second term", subject: "english", weeks: ["Diphthongs and consonant sounds", "Active and passive voice", "Keywords and spatial description", "Expository and argumentative essays", "Myths, legends and poetry", "Figures of speech and dramatization", "Revision and examination"] },
  { grade: "JSS3", term: "First term", subject: "english", weeks: ["Pronunciation and syllables", "Clauses, phrases and sentence types", "Reading for evaluation", "Formal and informal composition", "Drama, prose and poetry appreciation", "Vocabulary development", "Revision and examination"] },
  { grade: "SS1", term: "First term", subject: "english", weeks: ["Speech sounds and stress", "Grammar: clauses and sentence patterns", "Reading comprehension and summary", "Narrative, descriptive and expository writing", "Vocabulary development", "Literature: prose, drama and poetry", "Revision and examination"] },
  { grade: "SS2", term: "First term", subject: "english", weeks: ["Spoken English and intonation", "Grammar: concord, tenses and modifiers", "Reading for inference and evaluation", "Argumentative and analytical essays", "Lexis and structure", "Literature and recommended texts", "Revision and examination"] },
  { grade: "SS3", term: "First term", subject: "english", weeks: ["Falling and rising tones", "Grammar revision for external examinations", "Comprehension, summary and vocabulary", "Formal, argumentative and expository writing", "Poetry, prose and drama appreciation", "Common errors and examination practice", "Revision and examination"] },
];

export const curriculumSource = "English&MathsCurriculumNERDC.pdf";
export const curriculumSourceNote = "NERDC scheme of work supplied by the BrimLearn team; 47-page reference covering JSS1–JSS3 and SS1–SS3 English and Mathematics.";

export function unitsFor(subject: string, grade: string, term: string) {
  return nerdcUnits.find((unit) => unit.subject === subject && unit.grade === grade && unit.term === term);
}
