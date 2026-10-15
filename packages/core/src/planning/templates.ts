import type { Energy, MissionCategory } from "../domain/types";
import type { Archetype, Clarification } from "./types";

export interface TemplateSprint {
  t: string;
  m: number;
  e: Energy;
  /** Essential sprints survive compression for tight deadlines. */
  core?: boolean;
  d?: string;
}

export interface TemplateMilestone {
  title: string;
  sprints: TemplateSprint[];
}

export interface Template {
  archetype: Archetype;
  category: MissionCategory;
  title: (objective: string) => string;
  milestones: TemplateMilestone[];
  clarification?: Clarification;
}

const s = (t: string, m: number, e: Energy, core = false, d?: string): TemplateSprint => ({ t, m, e, core, d });

function titleCase(text: string): string {
  return text
    .split(" ")
    .map((w) => (w.length > 2 || w === w.toUpperCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function shortTitle(objective: string, max = 36): string {
  let t = objective.replace(/^(prepare for my|finish my|get my|get|start|do|make|build|launch|write|learn|organise|organize)\s+/i, (m) => m).trim();
  if (t.length > max) {
    const cut = t.slice(0, max);
    t = cut.slice(0, cut.lastIndexOf(" ") > 12 ? cut.lastIndexOf(" ") : max).trim();
  }
  return titleCase(t);
}

const website: Template = {
  archetype: "website",
  category: "work",
  title: () => "Launch My Website",
  milestones: [
    {
      title: "Foundation",
      sprints: [
        s("Define the purpose of the site", 15, "focused", true, "One sentence: who it's for, what it does, why it matters."),
        s("Describe who it's for", 15, "focused", true),
        s("List the pages you actually need", 10, "light", true),
        s("Write the one-line promise", 15, "focused"),
      ],
    },
    {
      title: "Design",
      sprints: [s("Sketch the homepage layout", 25, "focused", true, "Paper is fine. Boxes, not pixels."), s("Collect five sites you love", 15, "light"), s("Choose fonts and colours", 20, "light")],
    },
    {
      title: "Build",
      sprints: [
        s("Set up the site and domain", 25, "focused", true),
        s("Write the hero headline and copy", 20, "focused", true),
        s("Build the homepage", 45, "deep", true),
        s("Build the remaining pages", 45, "deep"),
        s("Add contact or sign-up", 25, "focused"),
      ],
    },
    {
      title: "Testing",
      sprints: [s("Test everything on your phone", 15, "light", true), s("Fix the three worst issues", 25, "focused"), s("Ask one person for feedback", 10, "light")],
    },
    {
      title: "Launch",
      sprints: [s("Check every link", 10, "light", true), s("Publish", 10, "light", true), s("Tell five people", 15, "light")],
    },
  ],
};

const app: Template = {
  archetype: "app",
  category: "work",
  title: (o) => shortTitle(o),
  milestones: [
    {
      title: "Define",
      sprints: [
        s("Write the one problem it solves", 15, "focused", true),
        s("Describe the first user", 15, "focused", true),
        s("List the three must-have features", 15, "focused", true),
        s("Cut everything else", 10, "light"),
      ],
    },
    {
      title: "Design",
      sprints: [s("Sketch the main screen", 25, "focused", true), s("Sketch the flow between screens", 25, "focused"), s("Decide the stack", 20, "focused", true)],
    },
    {
      title: "Build",
      sprints: [
        s("Set up the project", 25, "focused", true),
        s("Build the main screen", 45, "deep", true),
        s("Build the core feature", 45, "deep", true),
        s("Build the second feature", 45, "deep"),
        s("Connect the pieces", 45, "deep"),
        s("Add the third feature", 45, "deep"),
      ],
    },
    {
      title: "Test",
      sprints: [s("Use it like a stranger would", 25, "focused", true), s("Fix the worst three bugs", 45, "focused"), s("Get one person to try it", 15, "light")],
    },
    {
      title: "Ship",
      sprints: [s("Prepare the release", 25, "focused", true), s("Ship it", 15, "light", true)],
    },
  ],
};

const book: Template = {
  archetype: "book",
  category: "creative",
  title: () => "Write My Book",
  milestones: [
    {
      title: "Concept",
      sprints: [
        s("Describe the book in one sentence", 15, "focused", true),
        s("Write who it's for and why they'll care", 15, "focused", true),
        s("Choose the shape: chapters, parts, or sections", 20, "focused"),
      ],
    },
    {
      title: "Outline",
      sprints: [s("Brainstorm ten chapter ideas", 25, "focused", true), s("Put the chapters in order", 15, "light"), s("Write a paragraph for each chapter", 45, "deep", true)],
    },
    {
      title: "Draft",
      sprints: [
        s("Write the opening page", 25, "focused", true, "Rough is the point. Keep the pen moving."),
        s("Draft chapter 1, first half", 45, "deep", true),
        s("Draft chapter 1, second half", 45, "deep"),
        s("Draft chapter 2", 45, "deep"),
        s("Draft chapter 3", 45, "deep"),
        s("Draft the next chapter", 45, "deep"),
        s("Draft the next chapter", 45, "deep"),
        s("Draft the next chapter", 45, "deep"),
      ],
    },
    {
      title: "Revise",
      sprints: [s("Read everything so far", 25, "light"), s("Rewrite the weakest chapter", 45, "deep"), s("Write the ending", 45, "deep", true)],
    },
    {
      title: "Share",
      sprints: [s("Send it to one trusted reader", 10, "light", true)],
    },
  ],
};

const writing: Template = {
  archetype: "writing",
  category: "creative",
  title: (o) => shortTitle(o),
  milestones: [
    {
      title: "Clarify",
      sprints: [s("Write the main point in one sentence", 10, "focused", true), s("List three supporting points", 15, "focused", true)],
    },
    {
      title: "Draft",
      sprints: [s("Write a rough first draft", 45, "deep", true, "Don't edit. Just get it down."), s("Rewrite the opening", 20, "focused")],
    },
    {
      title: "Polish",
      sprints: [s("Edit for clarity", 25, "focused", true), s("Read it aloud and fix the stumbles", 15, "light")],
    },
    {
      title: "Publish",
      sprints: [s("Send or publish it", 10, "light", true)],
    },
  ],
};

const dissertation: Template = {
  archetype: "dissertation",
  category: "learning",
  title: () => "Finish My Dissertation",
  milestones: [
    {
      title: "Clarify",
      sprints: [s("Write the research question in one sentence", 15, "focused", true), s("List each chapter and its current state", 20, "focused", true)],
    },
    {
      title: "Research",
      sprints: [s("Gather the key sources", 45, "focused", true), s("Take notes on the five strongest sources", 45, "deep")],
    },
    {
      title: "Draft",
      sprints: [
        s("Write the introduction", 45, "deep", true),
        s("Literature review, part one", 45, "deep"),
        s("Literature review, part two", 45, "deep"),
        s("Methodology", 45, "deep", true),
        s("Results", 45, "deep", true),
        s("Discussion", 45, "deep", true),
        s("Conclusion", 45, "deep", true),
      ],
    },
    {
      title: "Finish",
      sprints: [
        s("Edit the first half", 45, "focused"),
        s("Edit the second half", 45, "focused"),
        s("Format references", 25, "light", true),
        s("Final proofread", 45, "focused", true),
        s("Submit", 10, "light", true),
      ],
    },
  ],
};

const exam: Template = {
  archetype: "exam",
  category: "learning",
  title: () => "Pass My Exam",
  milestones: [
    {
      title: "Map",
      sprints: [s("List every topic on the syllabus", 20, "focused", true), s("Mark each topic strong, okay, or weak", 10, "light", true), s("Order the weak topics first", 10, "light")],
    },
    {
      title: "Learn",
      sprints: [
        s("Work through weak topic one", 45, "deep", true),
        s("Work through weak topic two", 45, "deep", true),
        s("Work through weak topic three", 45, "deep"),
        s("Review the okay topics", 45, "focused"),
      ],
    },
    {
      title: "Practise",
      sprints: [
        s("Past paper under timed conditions", 60, "deep", true),
        s("Review every mistake", 25, "focused", true),
        s("Second past paper", 60, "deep"),
        s("Review mistakes again", 25, "focused"),
      ],
    },
    {
      title: "Ready",
      sprints: [s("Write a one-page summary of key facts", 25, "focused", true), s("Light review of strong topics", 20, "light"), s("Plan exam day and pack", 10, "light", true)],
    },
  ],
};

const running: Template = {
  archetype: "running",
  category: "health",
  title: (o) => {
    const m = o.match(/(5k|10k|half marathon|marathon|park ?run)/i);
    if (m) return `Run a ${m[1]?.replace(/k$/i, "K").replace(/^(\w)/, (c) => c.toUpperCase())}`;
    return "Get Running";
  },
  milestones: [
    {
      title: "Start",
      sprints: [
        s("Choose a target date or race", 10, "light", true),
        s("Check shoes and pick a route", 10, "light"),
        s("Easy run-walk", 25, "focused", true, "Conversational pace. Walk whenever you need."),
      ],
    },
    {
      title: "Build",
      sprints: [
        s("Easy run", 25, "focused", true),
        s("Easy run", 25, "focused"),
        s("Easy run", 25, "focused"),
        s("Longer run", 45, "focused", true),
        s("Easy run", 25, "focused"),
        s("Longer run", 60, "deep"),
      ],
    },
    {
      title: "Sharpen",
      sprints: [s("Intervals: fast, then easy, repeat", 25, "deep"), s("Easy run", 25, "focused"), s("Long run", 60, "deep", true)],
    },
    {
      title: "Race",
      sprints: [s("Rest day: plan the route and kit", 10, "light", true), s("Race or target run", 60, "deep", true)],
    },
  ],
};

const strength: Template = {
  archetype: "strength",
  category: "health",
  title: () => "Get Stronger",
  milestones: [
    {
      title: "Set up",
      sprints: [s("Pick a simple three-day programme", 15, "focused", true), s("First session", 45, "focused", true)],
    },
    {
      title: "Build",
      sprints: [
        s("Session: push", 45, "focused", true),
        s("Session: pull", 45, "focused", true),
        s("Session: legs", 45, "focused", true),
        s("Session: push", 45, "focused"),
        s("Session: pull", 45, "focused"),
        s("Session: legs", 45, "focused"),
      ],
    },
    {
      title: "Review",
      sprints: [s("Record your lifts and adjust", 15, "light", true)],
    },
  ],
};

const fitness: Template = {
  archetype: "fitness",
  category: "health",
  title: () => "Get Fit",
  clarification: {
    question: "What does fit mean for you right now?",
    options: [
      { label: "Running", value: "running" },
      { label: "Strength", value: "strength" },
      { label: "General fitness", value: "fitness" },
    ],
  },
  milestones: [
    {
      title: "Start",
      sprints: [s("Decide what fit means for you", 10, "focused", true), s("Choose three weekly slots", 10, "light", true), s("First workout", 25, "focused", true)],
    },
    {
      title: "Habit",
      sprints: [s("Workout", 25, "focused", true), s("Brisk walk", 25, "light"), s("Workout", 25, "focused"), s("Workout", 25, "focused"), s("Workout", 25, "focused")],
    },
    {
      title: "Progress",
      sprints: [s("Slightly harder workout", 30, "focused", true), s("Slightly harder workout", 30, "focused"), s("Slightly harder workout", 30, "focused")],
    },
    {
      title: "Review",
      sprints: [s("Notice what changed", 10, "light", true), s("Plan next month", 15, "focused")],
    },
  ],
};

const language: Template = {
  archetype: "language",
  category: "learning",
  title: (o) => {
    const m = o.match(/(spanish|french|german|italian|japanese|chinese|mandarin|portuguese|korean|arabic|russian|dutch|hindi|greek|english)/i);
    const lang = m?.[1] ? m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase() : "a Language";
    return `Learn ${lang}`;
  },
  milestones: [
    {
      title: "Basics",
      sprints: [s("Learn twenty everyday words", 15, "focused", true), s("Greetings and introducing yourself", 15, "focused", true), s("Numbers, days, and time", 15, "focused")],
    },
    {
      title: "Practice",
      sprints: [
        s("Listen to a short dialogue", 15, "light", true),
        s("Speak the phrases out loud", 15, "focused", true),
        s("Learn twenty more words", 15, "focused"),
        s("Write five sentences", 20, "focused"),
        s("Short practice conversation", 25, "focused"),
      ],
    },
    {
      title: "Immerse",
      sprints: [s("Watch twenty minutes with subtitles", 25, "light"), s("Read a short text", 20, "focused"), s("Talk with a real person", 25, "deep", true)],
    },
    {
      title: "Review",
      sprints: [s("Review everything you've learned", 25, "focused", true)],
    },
  ],
};

const skill: Template = {
  archetype: "skill",
  category: "learning",
  title: (o) => shortTitle(o),
  milestones: [
    {
      title: "Foundation",
      sprints: [s("Decide what you want to be able to do", 10, "focused", true), s("Find one good resource and stick to it", 15, "light", true), s("First lesson", 25, "focused", true)],
    },
    {
      title: "Practice",
      sprints: [
        s("Practice session", 25, "focused", true),
        s("Practice session", 25, "focused"),
        s("Practice session", 25, "focused"),
        s("Practice session", 25, "focused"),
        s("Build a small thing", 45, "deep"),
      ],
    },
    {
      title: "Apply",
      sprints: [s("Make something real with it", 45, "deep", true), s("Show it to someone", 10, "light")],
    },
  ],
};

const home: Template = {
  archetype: "home",
  category: "home",
  title: () => "Organise My Home",
  milestones: [
    {
      title: "Plan",
      sprints: [s("Walk through and list the problem areas", 15, "light", true), s("Pick the order: easiest first", 10, "light", true)],
    },
    {
      title: "Clear",
      sprints: [
        s("Clear one surface completely", 15, "light", true),
        s("Empty and sort one drawer", 15, "light"),
        s("Sort one cupboard", 25, "focused", true),
        s("Take the donate and bin piles out", 25, "light"),
        s("Clear the next area", 25, "focused"),
      ],
    },
    {
      title: "Systems",
      sprints: [s("Give everything a home", 25, "focused", true), s("Set up a ten-minute weekly reset", 10, "light")],
    },
    {
      title: "Finish",
      sprints: [s("Final pass through every room", 25, "light", true)],
    },
  ],
};

const business: Template = {
  archetype: "business",
  category: "work",
  title: () => "Launch My Business",
  milestones: [
    {
      title: "Clarity",
      sprints: [s("Write what you sell in one sentence", 15, "focused", true), s("Describe your first customer", 15, "focused", true), s("Decide your first offer and price", 25, "focused", true)],
    },
    {
      title: "Foundation",
      sprints: [s("Choose the name", 20, "focused"), s("Set up the basics: registration, bank, email", 25, "focused", true), s("Set up a simple way to get paid", 25, "focused")],
    },
    {
      title: "Reach",
      sprints: [
        s("Write your pitch", 20, "focused", true),
        s("Make a simple page", 45, "deep"),
        s("List twenty potential customers", 25, "focused", true),
        s("Reach out to five people", 25, "focused", true),
        s("Reach out to five more", 25, "focused"),
      ],
    },
    {
      title: "First Sale",
      sprints: [s("Deliver for your first customer", 45, "deep", true), s("Ask for honest feedback", 10, "light")],
    },
  ],
};

const presentation: Template = {
  archetype: "presentation",
  category: "work",
  title: () => "Prepare My Presentation",
  milestones: [
    {
      title: "Shape",
      sprints: [s("Write the one thing they should remember", 10, "focused", true), s("Outline five key points", 20, "focused", true)],
    },
    {
      title: "Build",
      sprints: [s("Draft the slides", 45, "deep", true), s("Write the opening", 20, "focused", true), s("Write the close", 15, "focused")],
    },
    {
      title: "Rehearse",
      sprints: [s("Run through it aloud", 25, "focused", true), s("Cut what isn't needed", 20, "focused"), s("Final rehearsal", 25, "focused", true)],
    },
    {
      title: "Ready",
      sprints: [s("Check the tech and a backup", 10, "light", true)],
    },
  ],
};

const finance: Template = {
  archetype: "finance",
  category: "finance",
  title: () => "Sort My Finances",
  milestones: [
    {
      title: "See",
      sprints: [s("List every account and balance", 20, "focused", true), s("List monthly bills", 20, "focused", true), s("Compare income with spending", 25, "focused", true)],
    },
    {
      title: "Decide",
      sprints: [s("Set a simple monthly budget", 25, "focused", true), s("Cancel what you don't use", 20, "light")],
    },
    {
      title: "Act",
      sprints: [s("Set up automatic savings", 15, "focused", true), s("Make a debt plan", 25, "focused")],
    },
    {
      title: "Keep",
      sprints: [s("Fifteen-minute monthly check-in", 15, "light")],
    },
  ],
};

const job: Template = {
  archetype: "job",
  category: "work",
  title: () => "Land My Next Job",
  milestones: [
    {
      title: "Aim",
      sprints: [s("Define the role you want", 15, "focused", true), s("List ten target companies", 20, "focused", true)],
    },
    {
      title: "Materials",
      sprints: [s("Update your CV", 45, "deep", true), s("Write a base cover letter", 25, "focused"), s("Refresh your profile", 25, "focused")],
    },
    {
      title: "Apply",
      sprints: [s("Apply to three roles", 45, "focused", true), s("Message two people you know", 20, "light"), s("Apply to three more", 45, "focused")],
    },
    {
      title: "Interview",
      sprints: [s("Prepare five stories", 25, "focused", true), s("Mock interview", 25, "focused")],
    },
  ],
};

const event: Template = {
  archetype: "event",
  category: "personal",
  title: (o) => shortTitle(o),
  milestones: [
    {
      title: "Decide",
      sprints: [s("Date, place, and who", 15, "focused", true), s("Set the budget", 15, "focused", true)],
    },
    {
      title: "Arrange",
      sprints: [s("Book the main thing", 25, "focused", true), s("Send invitations", 25, "light"), s("Sort food and drink", 25, "focused")],
    },
    {
      title: "Prepare",
      sprints: [s("Write a checklist for the day", 15, "light", true), s("Final confirmations", 20, "light")],
    },
  ],
};

const generic: Template = {
  archetype: "generic",
  category: "personal",
  title: (o) => shortTitle(o),
  milestones: [
    {
      title: "Clarify",
      sprints: [s("Write what done looks like", 10, "focused", true, "One sentence. Be specific."), s("Break it into pieces", 15, "focused", true)],
    },
    {
      title: "Prepare",
      sprints: [s("Gather what you need", 20, "light", true), s("Remove the biggest blocker", 25, "focused")],
    },
    {
      title: "Do",
      sprints: [s("Take the first real step", 25, "focused", true), s("Take the second step", 25, "focused", true), s("Keep going", 25, "focused"), s("Keep going", 25, "focused")],
    },
    {
      title: "Finish",
      sprints: [s("Review where you are", 15, "light"), s("Final touches", 20, "focused", true), s("Wrap it up", 10, "light", true)],
    },
  ],
};

export const TEMPLATES: Record<Archetype, Template> = {
  website,
  app,
  book,
  writing,
  dissertation,
  exam,
  running,
  strength,
  fitness,
  language,
  skill,
  home,
  business,
  presentation,
  finance,
  job,
  event,
  generic,
};

/** Suggested goals shown on the first screen. */
export const SUGGESTED_GOALS: Array<{ text: string; category: MissionCategory }> = [
  { text: "Launch my website", category: "work" },
  { text: "Write my book", category: "creative" },
  { text: "Run a 10K", category: "health" },
  { text: "Learn Spanish", category: "learning" },
  { text: "Organise my house", category: "home" },
  { text: "Build my business", category: "work" },
  { text: "Finish my dissertation", category: "learning" },
  { text: "Get my finances organised", category: "finance" },
];
