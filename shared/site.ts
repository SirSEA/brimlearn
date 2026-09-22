// Public marketing-page content, editable by admins from the "Website" tab.
// Pure module (no node deps) so the client and server can both import it.

export type SiteSection = {
  heading: string;
  body: string;
  imageUrl?: string | null;
};

export type SiteCourse = {
  id: string;
  title: string;
  description: string;
  category: string;
  /** Platform label, e.g. "YouTube", "Khan Academy", "Edpuzzle". */
  platform: string;
  /** External course/lesson link (website, YouTube, or another platform). */
  url: string;
  imageUrl?: string | null;
};

export type LandingContent = {
  brand: {
    name: string;
    tagline: string;
  };
  hero: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    imageUrl?: string | null;
    primaryCtaLabel: string;
    primaryCtaHref: string;
    secondaryCtaLabel: string;
    secondaryCtaHref: string;
  };
  about: SiteSection;
  features: SiteSection[];
  courses: SiteCourse[];
  cta: {
    heading: string;
    body: string;
    buttonLabel: string;
    buttonHref: string;
  };
  footer: {
    tagline: string;
    contactEmail?: string | null;
  };
};

export type SiteContentStatus = "draft" | "published";

/** JSON-safe site-content document. `previous` backs the admin revert action. */
export type SiteContentDoc = {
  id: string;
  status: SiteContentStatus;
  content: LandingContent;
  previous: LandingContent | null;
  version: number;
  updatedAt: string;
  publishedAt: string | null;
  updatedByName: string | null;
};

export const SITE_CONTENT_DOC_ID = "landing";

export function defaultLandingContent(): LandingContent {
  return {
    brand: {
      name: "BrimLearn",
      tagline: "Short, steady practice. Real growth for everyone.",
    },
    hero: {
      eyebrow: "An online school aligned with BECE | WAEC | NECO | JAMB",
      headline: "Short, steady practice for real, lasting growth.",
      subheadline:
        "BrimLearn turns the national curriculum into daily 10-minute lessons, live classrooms, and instant feedback — for learners, parents, and tutors from JSS1 to SS3.",
      primaryCtaLabel: "Start learning free",
      primaryCtaHref: "/signup",
      secondaryCtaLabel: "Sign in",
      secondaryCtaHref: "/login",
    },
    about: {
      heading: "Built for the Nigerian classroom.",
      body: "Every lesson maps to the BECE, WAEC, NECO, and JAMB curriculum. Learners practise in short, steady sessions; parents see the next best step; tutors publish resources, hold live classes, and respond to gaps before they grow.",
      imageUrl: null,
    },
    features: [
      {
        heading: "10-minute daily practice",
        body: "Small, consistent sessions that build confidence and stick — no marathon study sessions.",
      },
      {
        heading: "Live classrooms",
        body: "Tutors run embedded video rooms and share calendars so the whole class joins on time.",
      },
      {
        heading: "AI-built quizzes & assessments",
        body: "Teachers pick topics, subtopics, and objectives and get ready-to-issue questions with teaching suggestions.",
      },
      {
        heading: "Resources that travel",
        body: "Videos and worksheets you can open anywhere — shared once, used by every learner.",
      },
    ],
    courses: [
      {
        id: "kh-maths",
        title: "Khan Academy Mathematics",
        description: "Free world-class lessons and exercises covering algebra, geometry, and more.",
        category: "Mathematics",
        platform: "Khan Academy",
        url: "https://www.khanacademy.org/math",
        imageUrl: null,
      },
      {
        id: "bbc-bitesize",
        title: "BBC Bitesize",
        description: "Curriculum-mapped revision notes and quizzes across every subject.",
        category: "General",
        platform: "BBC Bitesize",
        url: "https://www.bbc.co.uk/bitesize",
        imageUrl: null,
      },
      {
        id: "yt-equations",
        title: "Intro to Linear Equations (YouTube)",
        description: "A short animated video breaking down one-step and two-step equations.",
        category: "Mathematics",
        platform: "YouTube",
        url: "https://www.youtube.com/results?search_query=linear+equations+for+beginners",
        imageUrl: null,
      },
      {
        id: "yt-science",
        title: "Science Experiments Explained",
        description: "Watch safe classroom experiments and the chemistry behind each result.",
        category: "Basic Science",
        platform: "YouTube",
        url: "https://www.youtube.com/results?search_query=basic+science+experiments",
        imageUrl: null,
      },
    ],
    cta: {
      heading: "Ready to make practice a habit?",
      body: "Join BrimLearn today — one account for learners, parents, and tutors.",
      buttonLabel: "Create a free account",
      buttonHref: "/signup",
    },
    footer: {
      tagline: "BrimLearn · Aligned with BECE | WAEC | NECO | JAMB · JSS1 – SS3",
      contactEmail: null,
    },
  };
}