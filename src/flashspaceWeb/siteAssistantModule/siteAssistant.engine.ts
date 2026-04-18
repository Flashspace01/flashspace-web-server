/**
 * FlashSpace Universal Site Assistant — Deterministic NLP Engine
 * 
 * Fast, deterministic, production-ready intent detection & entity extraction.
 * Handles English, Hinglish, typos, and synonyms without any external AI API.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type Intent =
  | "search_workspace"
  | "compare_workspaces"
  | "view_pricing"
  | "contact"
  | "homepage"
  | "view_services"
  | "about"
  | "help"
  | "career"
  | "partner"
  | "list_space"
  | "login"
  | "signup"
  | "bookings"
  | "virtual_office_solution"
  | "coworking_solution"
  | "meeting_room"
  | "day_office"
  | "blog"
  | "privacy"
  | "kyc_verification"
  | "client_dashboard"
  | "admin_portal"
  | "partner_portal"
  | "affiliate_portal"
  | "billing_payments"
  | "documents"
  | "mail_records"
  | "visit_records"
  | "raise_ticket"
  | "unknown";

export type WorkspaceType =
  | "virtual_office"
  | "coworking"
  | "private_office"
  | "meeting_room"
  | "on_demand"
  | "event_space"
  | "day_office"
  | null;

export type Budget = "low" | "mid" | "high" | null;

export interface AssistantFilters {
  city: string | null;
  type: WorkspaceType;
  budget: Budget;
  capacity: number | null;
}

export interface AssistantResponse {
  intent: Intent;
  route: string;
  filters: Partial<AssistantFilters>;
  confidence: number;
  message: string;
  suggestions?: string[];
}

// ─── Route Map (STRICT — never hallucinate) ──────────────────────────────────

const ROUTE_MAP: Record<Intent, string> = {
  search_workspace: "/services/coworking-space",
  compare_workspaces: "/services/coworking-space",
  view_pricing: "/services/virtual-office",
  contact: "/start-chatting",
  homepage: "/",
  view_services: "/services",
  about: "/about",
  help: "/help",
  career: "/career",
  partner: "/partner",
  list_space: "/list-your-space",
  login: "/login",
  signup: "/signup",
  bookings: "/dashboard/my-bookings",
  virtual_office_solution: "/solutions/virtual-office",
  coworking_solution: "/solutions/coworking-space",
  meeting_room: "/solutions/meeting-rooms",
  day_office: "/solutions/day-passes",
  blog: "/coming-soon",
  privacy: "/privacy",
  kyc_verification: "/dashboard/profile",
  client_dashboard: "/dashboard",
  admin_portal: "/admin",
  partner_portal: "/spaceportal",
  affiliate_portal: "/affiliate-portal",
  billing_payments: "/dashboard/payments",
  documents: "/dashboard/documents",
  mail_records: "/dashboard/mail-records",
  visit_records: "/dashboard/visit-records",
  raise_ticket: "/dashboard/help?tab=tickets&action=new",
  unknown: "/",
};

// ─── Synonym Dictionaries ────────────────────────────────────────────────────

const CITY_SYNONYMS: Record<string, string> = {
  // Delhi variants
  delhi: "delhi",
  "new delhi": "delhi",
  "nai dilli": "delhi",
  "nayi dilli": "delhi",
  dilli: "delhi",
  ncr: "delhi",
  "delhi ncr": "delhi",
  noida: "noida",
  "greater noida": "noida",

  // Gurgaon variants
  gurgaon: "gurgaon",
  gurugram: "gurgaon",
  ggn: "gurgaon",
  "cyber city": "gurgaon",
  cybercity: "gurgaon",

  // Mumbai variants
  mumbai: "mumbai",
  bombay: "mumbai",

  // Bangalore variants
  bangalore: "bangalore",
  bengaluru: "bangalore",
  blr: "bangalore",

  // Hyderabad variants
  hyderabad: "hyderabad",
  hyd: "hyderabad",

  // Pune variants
  pune: "pune",

  // Chennai variants
  chennai: "chennai",
  madras: "chennai",

  // Kolkata variants
  kolkata: "kolkata",
  calcutta: "kolkata",

  // Jaipur
  jaipur: "jaipur",

  // Lucknow
  lucknow: "lucknow",

  // Chandigarh
  chandigarh: "chandigarh",

  // Ahmedabad
  ahmedabad: "ahmedabad",
  ahemdabad: "ahmedabad",

  // UAE cities
  dubai: "dubai",
  "abu dhabi": "abu dhabi",
  abudhabi: "abu dhabi",
  sharjah: "sharjah",
  ajman: "ajman",
};

const TYPE_SYNONYMS: Record<string, WorkspaceType> = {
  // Virtual office
  "virtual office": "virtual_office",
  "virtual offices": "virtual_office",
  virtual: "virtual_office",
  "registered office": "virtual_office",
  "business address": "virtual_office",
  "gst registration": "virtual_office",

  // Coworking
  coworking: "coworking",
  "coworking space": "coworking",
  "coworking spaces": "coworking",
  "co working": "coworking",
  "co-working": "coworking",
  "shared office": "coworking",
  "shared workspace": "coworking",
  "shared space": "coworking",
  "hot desk": "coworking",
  hotdesk: "coworking",
  "hot desking": "coworking",
  "flexible workspace": "coworking",
  "flex space": "coworking",

  // Private office
  "private office": "private_office",
  "private cabin": "private_office",
  cabin: "private_office",
  "dedicated office": "private_office",
  "dedicated desk": "private_office",

  // Meeting room
  "meeting room": "meeting_room",
  "meeting rooms": "meeting_room",
  "conference room": "meeting_room",
  "conference hall": "meeting_room",
  boardroom: "meeting_room",

  // On demand (hourly)
  "on demand": "on_demand",
  "on-demand": "on_demand",
  hourly: "on_demand",
  "by the hour": "on_demand",

  // Event space
  "event space": "event_space",
  "event spaces": "event_space",
  "event venue": "event_space",
  "event hall": "event_space",
  seminar: "event_space",
  workshop: "event_space",

  // Day office
  "day office": "day_office",
  "day pass": "day_office",
  "day passes": "day_office",
  "daily office": "day_office",
  "day desk": "day_office",

  // General workspace keywords (fallback to coworking)
  office: "coworking",
  workspace: "coworking",
  workspaces: "coworking",
  space: "coworking",
  desk: "coworking",
  seat: "coworking",
  jagah: "coworking",  // Hinglish
};

const BUDGET_SYNONYMS: Record<string, Budget> = {
  cheap: "low",
  affordable: "low",
  budget: "low",
  sasta: "low",
  "low cost": "low",
  "low budget": "low",
  economical: "low",
  inexpensive: "low",

  mid: "mid",
  medium: "mid",
  moderate: "mid",
  "mid range": "mid",
  "mid-range": "mid",
  standard: "mid",
  normal: "mid",

  premium: "high",
  expensive: "high",
  luxury: "high",
  luxurious: "high",
  "high end": "high",
  "high-end": "high",
  mehenga: "high",
  upscale: "high",
  elite: "high",
  exclusive: "high",
};

// ─── Intent Keywords ─────────────────────────────────────────────────────────

interface IntentPattern {
  intent: Intent;
  keywords: string[];
  weight: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // KYC Verification (High priority)
  {
    intent: "kyc_verification",
    keywords: [
      "kyc", "verify", "verification", "identity", "identity proof",
      "pancard", "aadhaar", "id card", "verify me", "validate",
      "kyc status", "documents", "upload document", "proof",
      "pichan", "verify kardo", "kyc karni hai", "identity verification",
      "complete my kyc", "adhaar", "pan"
    ],
    weight: 20,
  },

  // Dashboard / Profile
  {
    intent: "client_dashboard",
    keywords: [
      "dashboard", "my portal", "user portal", "my account",
      "my space", "profile", "mera account", "settings",
      "manage account", "my flashspace", "client portal"
    ],
    weight: 12,
  },

  // Compare (high priority — must come before search)
  {
    intent: "compare_workspaces",
    keywords: [
      "compare", "comparison", "vs", "versus", "difference", "which is better",
      "tulna", "best option", "top options", "best offices", "best spaces",
      "top offices", "top spaces", "which one", "recommend", "suggestion",
    ],
    weight: 10,
  },

  // Search workspace
  {
    intent: "search_workspace",
    keywords: [
      "find", "search", "looking for", "need", "want", "show me",
      "get me", "book", "reserve", "chahiye", "dikhao", "dhundo",
      "milega", "available", "near me", "nearby", "dekhna",
      "workspace", "office", "coworking", "virtual", "meeting room",
      "desk", "seat", "space", "jagah", "dedo",
    ],
    weight: 4, // Lowered from 8 to prevent dominance by generic verbs
  },

  // View pricing
  {
    intent: "view_pricing",
    keywords: [
      "pricing", "price", "cost", "rate", "rates", "kitna", "kharcha",
      "plans", "packages", "subscription", "monthly", "yearly",
      "how much", "fees", "charge", "charges", "payment",
    ],
    weight: 9,
  },

  // Billing & Payments
  {
    intent: "billing_payments",
    keywords: [
      "invoices", "bills", "payments", "ledger", "transactions",
      "bill details", "receipts", "my bills", "payment history",
      "manage subscription", "billing details", "paisa history"
    ],
    weight: 10,
  },

  // Documents
  {
    intent: "documents",
    keywords: [
      "my documents", "agreements", "files", "my files", "papers",
      "lease", "agreement details", "contract", "downloads"
    ],
    weight: 9,
  },

  // Mail Records
  {
    intent: "mail_records",
    keywords: [
      "mail", "mails", "mail records", "postal", "postal mail", "courier",
      "dak", "chitti", "letters", "correspondence", "received mail",
      "postage", "mailbox", "my mail", "letters received"
    ],
    weight: 12,
  },

  // Visit Records
  {
    intent: "visit_records",
    keywords: [
      "visits", "visit records", "visitor", "visitors", "guest", "guests",
      "who came", "visit history", "entry records", "log", "guest list"
    ],
    weight: 11,
  },

  // Portals
  {
    intent: "admin_portal",
    keywords: ["admin", "superadmin", "management portal", "admin area"],
    weight: 13,
  },
  {
    intent: "partner_portal",
    keywords: ["partner portal", "spaceportal", "provider portal", "host portal", "my properties"],
    weight: 11,
  },
  {
    intent: "affiliate_portal",
    keywords: ["affiliate portal", "referral portal", "referrals", "my commission"],
    weight: 11,
  },

  // Contact
  {
    intent: "contact",
    keywords: [
      "contact", "reach", "call", "phone", "email", "message",
      "talk", "speak", "chat", "support", "help me", "inquiry",
      "enquiry", "baat", "connect", "customer care",
    ],
    weight: 7,
  },

  // About
  {
    intent: "about",
    keywords: [
      "about", "who are you", "what is flashspace", "company",
      "about us", "team", "story", "mission",
    ],
    weight: 6,
  },

  // Help & Admin Content (Conceptual matches like "talk to admin")
  {
    intent: "help",
    keywords: [
      "help", "faq", "question", "how to", "guide", "tutorial",
      "issue", "problem", "kaise", "kya karna", "samajh",
      "talk to admin", "chat with admin", "admin se baat", "contact support",
      "customer support", "need help", "not working", "help center",
      "support team", "admin support", "reach out", "ask someone",
      "helpdesk", "service request"
    ],
    weight: 15,
  },

  // Raise Ticket (High Priority specific action)
  {
    intent: "raise_ticket",
    keywords: [
      "ticket", "raise a ticket", "raise ticket", "create ticket", "new ticket",
      "open ticket", "submit ticket", "support ticket", "complaint", "issue",
      "ticketing", "complaint raise", "ticket kaise bhare", "ticket kahan",
      "raise a complaint", "raise issue", "report issue", "report a problem"
    ],
    weight: 25,
  },

  // Career
  {
    intent: "career",
    keywords: [
      "career", "careers", "job", "jobs", "hiring", "work with",
      "join", "vacancy", "opening", "naukri", "position",
    ],
    weight: 7,
  },

  // Partner
  {
    intent: "partner",
    keywords: [
      "partner", "partnership", "collaborate", "affiliate",
      "become partner", "join as partner",
    ],
    weight: 7,
  },

  // List your space
  {
    intent: "list_space",
    keywords: [
      "list your space", "list space", "add space", "rent out",
      "rent my", "list my", "register space", "add my office",
    ],
    weight: 8,
  },

  // Login
  {
    intent: "login",
    keywords: [
      "login", "log in", "sign in", "signin", "merologin", "entry"
    ],
    weight: 15,
  },

  // Signup
  {
    intent: "signup",
    keywords: [
      "signup", "sign up", "register", "create account", "new account",
    ],
    weight: 9,
  },

  // Bookings
  {
    intent: "bookings",
    keywords: [
      "my bookings", "my booking", "booking history", "past bookings",
      "reservation", "reservations", "meri booking",
    ],
    weight: 10,
  },

  // Solutions pages
  {
    intent: "virtual_office_solution",
    keywords: [
      "virtual office solution", "what is virtual office",
      "virtual office details", "about virtual office",
    ],
    weight: 9,
  },
  {
    intent: "coworking_solution",
    keywords: [
      "coworking solution", "what is coworking", "about coworking",
      "coworking details",
    ],
    weight: 9,
  },
  {
    intent: "meeting_room",
    keywords: [
      "meeting room solution", "book meeting room", "conference room",
      "meeting space",
    ],
    weight: 8,
  },
  {
    intent: "day_office",
    keywords: [
      "day office", "day pass", "daily office", "one day",
    ],
    weight: 8,
  },

  // Privacy
  {
    intent: "privacy",
    keywords: [
      "privacy", "privacy policy", "terms", "terms and conditions",
      "tnc", "data policy",
    ],
    weight: 6,
  },

  // Homepage
  {
    intent: "homepage",
    keywords: [
      "home", "homepage", "main page", "go back", "start",
      "beginning", "landing page",
    ],
    weight: 5,
  },

  // Services overview
  {
    intent: "view_services",
    keywords: [
      "services", "all services", "what do you offer",
      "what services", "offerings", "solutions",
    ],
    weight: 6,
  },

  // Blog
  {
    intent: "blog",
    keywords: [
      "blog", "blogs", "articles", "news", "updates", "read",
    ],
    weight: 5,
  },
];

// ─── Hinglish → English normalization ────────────────────────────────────────

const HINGLISH_MAP: Record<string, string> = {
  mujhe: "i need",
  muje: "i need",
  mujko: "i need",
  me: "in",
  mein: "in",
  chahiye: "need",
  chaiye: "need",
  chayiye: "need",
  dikhao: "show me",
  dikha: "show",
  dhundo: "find",
  dhundh: "find",
  karo: "do",
  kardo: "do",
  batao: "tell",
  bata: "tell",
  dedo: "give",
  dena: "give",
  kahan: "where",
  kidhar: "where",
  kitna: "how much",
  kya: "what",
  hai: "is",
  ka: "of",
  ke: "of",
  ki: "of",
  aur: "and",
  ya: "or",
  sasta: "cheap",
  mehenga: "expensive",
  accha: "good",
  badhiya: "good",
  naukri: "job",
  jagah: "place",
  paisa: "money",
  wala: "",
  wali: "",
  vale: "",
  liye: "for",
  se: "from",
  pe: "on",
  par: "on",
  bhi: "also",
  sabse: "most",
  ek: "one",
  do: "two",
  teen: "three",
  char: "four",
  paanch: "five",
  chhe: "six",
  saat: "seven",
  aath: "eight",
  nau: "nine",
  das: "ten",
};

const STOPWORDS = ["flashspace", "ai", "website", "platform", "page", "mujhe", "chahiye"];

// ─── Levenshtein distance for typo tolerance ─────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

function fuzzyMatch(input: string, target: string): boolean {
  if (input === target) return true;
  if (target.length <= 4) return input === target;
  
  const distance = levenshtein(input, target);
  
  // Stricter thresholds based on length
  if (target.length <= 5) return distance <= 1;
  return distance <= 2;
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

function normalizeInput(raw: string): string {
  let text = raw.toLowerCase().trim();

  // Remove extra whitespace
  text = text.replace(/\s+/g, " ");

  // Remove common punctuation
  text = text.replace(/[?!.,;:'"()[\]{}<>]/g, " ").replace(/\s+/g, " ").trim();

  // Hinglish → English
  const words = text.split(" ");
  const translated = words.map((w) => HINGLISH_MAP[w] || w);
  
  // Remove stopwords like "flashspace" to prevent "space" matching
  const filtered = translated.filter(w => !STOPWORDS.includes(w));
  text = filtered.join(" ");

  return text;
}

function extractCity(text: string): string | null {
  const sortedKeys = Object.keys(CITY_SYNONYMS).sort(
    (a, b) => b.length - a.length
  );

  for (const key of sortedKeys) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(text) && key.length > 2) {
      return CITY_SYNONYMS[key];
    }
  }

  const words = text.split(" ");
  for (const word of words) {
    for (const [key, value] of Object.entries(CITY_SYNONYMS)) {
      if (key.split(" ").length === 1 && word.length > 2 && fuzzyMatch(word, key)) {
        return value;
      }
    }
  }

  return null;
}

function extractWorkspaceType(text: string): WorkspaceType {
  const sortedKeys = Object.keys(TYPE_SYNONYMS).sort(
    (a, b) => b.length - a.length
  );

  for (const key of sortedKeys) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(text) && key.length > 2) {
      return TYPE_SYNONYMS[key];
    }
  }

  const words = text.split(" ");
  for (const word of words) {
    for (const [key, value] of Object.entries(TYPE_SYNONYMS)) {
      if (key.split(" ").length === 1 && word.length > 2 && fuzzyMatch(word, key)) {
        return value;
      }
    }
  }
  return null;
}

function extractBudget(text: string): Budget {
  const sortedKeys = Object.keys(BUDGET_SYNONYMS).sort(
    (a, b) => b.length - a.length
  );

  for (const key of sortedKeys) {
    if (text.includes(key)) {
      return BUDGET_SYNONYMS[key];
    }
  }

  return null;
}

function extractCapacity(text: string): number | null {
  // Patterns: "team of 10", "5 people", "for 20", "10 seats", "10 desks"
  const patterns = [
    /(?:team\s+(?:of\s+)?|for\s+|(\d+)\s+(?:people|persons|members|seats|desks|pax))/i,
    /(\d+)\s+(?:people|persons|members|seats|desks|logo|pax)/i,
    /(?:team\s+(?:of\s+)?)(\d+)/i,
    /(?:for\s+)(\d+)/i,
    /(\d+)\s+(?:log(?:on?)?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > 0 && num < 10000) return num;
    }
  }

  return null;
}

function detectIntent(text: string): { intent: Intent; confidence: number } {
  const scores = new Map<Intent, number>();

  for (const pattern of INTENT_PATTERNS) {
    let score = 0;
    for (const keyword of pattern.keywords) {
      if (text.includes(keyword)) {
        score += pattern.weight;

        // Bonus for exact word boundary match
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (regex.test(text)) {
          score += 5; // Heavily weight word boundary matches
        }
      }
    }

    if (score > 0) {
      const existing = scores.get(pattern.intent) || 0;
      scores.set(pattern.intent, existing + score);
    }
  }

  if (scores.size === 0) {
    return { intent: "unknown", confidence: 0 };
  }

  // Find the highest scoring intent
  let bestIntent: Intent = "unknown";
  let bestScore = 0;
  let totalScore = 0;

  for (const [intent, score] of scores) {
    totalScore += score;
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Confidence = best score relative to total
  const confidence = Math.min(
    Math.round((bestScore / Math.max(totalScore, 1)) * 100),
    100
  );

  return { intent: bestIntent, confidence };
}

// Determine route based on extracted workspace type
function getSmartRoute(intent: Intent, type: WorkspaceType): string {
  if (intent === "search_workspace" || intent === "compare_workspaces") {
    switch (type) {
      case "virtual_office":
        return "/services/virtual-office";
      case "coworking":
      case "private_office":
        return "/services/coworking-space";
      case "on_demand":
      case "meeting_room":
        return "/services/on-demand";
      case "event_space":
        return "/services/event-spaces";
      default:
        return "/services/coworking-space";
    }
  }

  if (intent === "view_pricing") {
    switch (type) {
      case "virtual_office":
        return "/services/virtual-office";
      case "coworking":
      case "private_office":
        return "/services/coworking-space";
      default:
        return "/services/virtual-office";
    }
  }

  return ROUTE_MAP[intent] || "/";
}

// ─── Friendly Messages ──────────────────────────────────────────────────────

function buildMessage(intent: Intent, filters: Partial<AssistantFilters>): string {
  const parts: string[] = [];

  switch (intent) {
    case "kyc_verification":
      parts.push("✨ Taking you to complete your KYC Verification and Profile.");
      break;

    case "client_dashboard":
      parts.push("🏠 Opening your Personal Dashboard.");
      break;

    case "billing_payments":
      parts.push("💰 Showing your Billing, Payments and Invoices.");
      break;

    case "documents":
      parts.push("📄 Opening your Documents and Agreements.");
      break;

    case "mail_records":
      parts.push("📬 Opening your Mail and Correspondence records.");
      break;

    case "visit_records":
      parts.push("👣 Showing your Visit and Visitor history.");
      break;

    case "admin_portal":
      parts.push("🔒 Redirecting to the Management Admin Portal.");
      break;

    case "partner_portal":
      parts.push("🏢 Opening the Space Partner Portal.");
      break;

    case "affiliate_portal":
      parts.push("🤝 Opening the Affiliate Referral Portal.");
      break;

    case "search_workspace":
      parts.push("🔍 Searching");
      if (filters.budget) parts.push(`${filters.budget}-budget`);
      if (filters.type) parts.push(filters.type.replace(/_/g, " "));
      else parts.push("workspaces");                                                                                                 
      if (filters.city) parts.push(`in ${filters.city.charAt(0).toUpperCase() + filters.city.slice(1)}`);
      if (filters.capacity) parts.push(`for ${filters.capacity} people`);
      break;

    case "compare_workspaces":
      parts.push("📊 Comparing top workspaces");
      if (filters.city) parts.push(`in ${filters.city.charAt(0).toUpperCase() + filters.city.slice(1)}`);
      break;

    case "view_pricing":
      parts.push("💰 Showing pricing");
      if (filters.type) parts.push(`for ${filters.type.replace(/_/g, " ")}`);
      if (filters.city) parts.push(`in ${filters.city.charAt(0).toUpperCase() + filters.city.slice(1)}`);
      break;

    case "contact":
      parts.push("📞 Connecting you with our team");
      break;

    case "about":
      parts.push("ℹ️ Taking you to learn about FlashSpace");
      break;

    case "raise_ticket":
      parts.push("🎟️ Taking you to raise a Support Ticket in your Dashboard.");
      break;  

    case "help":     
      parts.push("❓ Opening Help and Support Center.");                  
      break;

    case "career":
      parts.push("💼 Showing career opportunities");
      break;

    case "partner":
      parts.push("🤝 Showing partnership opportunities");
      break;

    case "list_space":
      parts.push("🏢 List your space on FlashSpace");
      break;

    case "login":
      parts.push("🔐 Opening login");
      break;

    case "signup":
      parts.push("✨ Opening sign up");
      break;

    case "bookings":
      parts.push("📋 Showing your bookings");
      break;

    case "homepage":
      parts.push("🏠 Taking you home");
      break;

    case "view_services":
      parts.push("📦 Showing all services");
      break;

    default:
      parts.push("🤔 I'll take you to the best matching page");
  }

  return parts.join(" ");
}

function buildSuggestions(intent: Intent): string[] {
  switch (intent) {
    case "kyc_verification":
      return ["Show my bookings", "View my invoices", "Mail records"];
    case "mail_records":
      return ["Visit records", "My documents", "Dashboard"];
    case "visit_records":
      return ["Mail records", "My bookings", "Payments"];
    case "search_workspace":
      return [
        "Compare top offices in Delhi",
        "Show pricing for virtual offices",
        "Find coworking near me",
      ];
    case "client_dashboard":
      return ["Complete KYC", "My reservations", "Settings"];
    case "help":
      return ["Raise a ticket", "Chat with us", "FAQ"];
    case "raise_ticket":
      return ["View my tickets", "Contact support", "Dashboard"];
    case "unknown":
      return [
        "Complete KYC",
        "Find a coworking space in Delhi",
        "Show pricing",
        "Login to my account",
      ];
    default:
      return ["Find an office", "View all services", "Contact support"];
  }
}

// ─── Main Process Function ───────────────────────────────────────────────────

export function processQuery(rawInput: string): AssistantResponse {
  if (!rawInput || rawInput.trim().length === 0) {
    return {
      intent: "unknown",
      route: "/",
      filters: {},
      confidence: 0,
      message: "Please type something so I can help you navigate FlashSpace!",
      suggestions: buildSuggestions("unknown"),
    };
  }

  const text = normalizeInput(rawInput);

  // Extract entities
  const city = extractCity(text);
  const type = extractWorkspaceType(text);
  const budget = extractBudget(text);
  const capacity = extractCapacity(text);

  // Detect intent
  let { intent, confidence } = detectIntent(text);

  // If workspace entities are found but no workspace-related intent, default to search
  if (
    intent === "unknown" &&
    (city || type || budget || capacity)
  ) {
    intent = "search_workspace";
    confidence = 60;
  }

  // Build filters (only include non-null values)
  const filters: Partial<AssistantFilters> = {};
  if (city) filters.city = city;
  if (type) filters.type = type;
  if (budget) filters.budget = budget;
  if (capacity) filters.capacity = capacity;

  // Get smart route
  const route = getSmartRoute(intent, type);

  // Build friendly message
  const message = buildMessage(intent, filters);

  // Build follow-up suggestions
  const suggestions = buildSuggestions(intent);

  return {
    intent,
    route,
    filters,
    confidence,
    message,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

// ─── Multi-Intent Detection ──────────────────────────────────────────────────

export function processMultiQuery(rawInput: string): AssistantResponse[] {
  // Split on "and", "aur", "&", "+"
  const parts = rawInput
    .split(/\s+(?:and|aur|&|\+)\s+/i)
    .filter((p) => p.trim().length > 0);

  if (parts.length <= 1) {
    return [processQuery(rawInput)];
  }

  return parts.map((part) => processQuery(part.trim()));
}
