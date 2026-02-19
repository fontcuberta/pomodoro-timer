export const FUN_FACTS = [
  // Pomodoro technique
  "The Pomodoro Technique was invented by Francesco Cirillo in the late 1980s—he used a tomato-shaped kitchen timer.",
  "The word 'pomodoro' means tomato in Italian. Francesco named it after the tomato timer he used at university.",
  "Studies suggest that taking regular short breaks can actually improve focus and reduce mental fatigue.",
  "The 25-minute work interval wasn't arbitrary—it's long enough for deep focus but short enough to maintain concentration.",
  "Breaking tasks into pomodoros helps you estimate how much time projects actually take vs. what you imagine.",
  "The technique recommends a longer 15–30 minute break after every four pomodoros.",
  "Using a physical timer can make the commitment more tangible than a digital one.",
  "Pomodoro can reduce procrastination by making 'getting started' feel less overwhelming.",
  "The technique is used by developers, writers, students, and professionals worldwide.",
  "Francesco Cirillo wrote a book about the technique in 2006—'The Pomodoro Technique'.",
  // Tech
  "The first computer bug was an actual moth found in a Harvard Mark II computer in 1947.",
  "Ada Lovelace wrote the first algorithm intended for a machine in the 1840s—making her the first programmer.",
  "The first website ever created is still online: info.cern.ch",
  "JavaScript was created in 10 days by Brendan Eich in 1995.",
  "The average developer spends about 2–3 hours per day on actual coding; the rest is meetings, debugging, and context switching.",
  "Vite stands for 'fast' in French—it's a build tool focused on speed.",
  "The QWERTY keyboard layout was designed to prevent typewriter keys from jamming, not for typing speed.",
  "Git was created by Linus Torvalds in 2005 for developing the Linux kernel.",
  "The first computer had a memory of about 17 kilobytes. Today's phones have millions of times more.",
  "Open source software powers most of the internet—from servers to browsers to tools.",
]

export function getRandomFact(excludeIndex = -1) {
  const indices = FUN_FACTS.map((_, i) => i).filter((i) => i !== excludeIndex)
  const index = indices.length > 0
    ? indices[Math.floor(Math.random() * indices.length)]
    : 0
  return { fact: FUN_FACTS[index], index }
}
