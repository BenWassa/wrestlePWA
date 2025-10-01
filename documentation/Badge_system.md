## The Badge System (Earned, Not Unlocked)

**Concept:** Badges just *appear* when you earn them. No locked icons teasing you, no "2000 practices away" crushing your soul. You don't know they exist until they're yours.

```
┌─────────────────────────────────┐
│ Your Badges                     │
│                                 │
│ 🏅 First Practice               │
│ 🔥 5 Practice Streak            │
│ 💪 First Month (20 practices)   │
│ ⚡ 30 Hours Logged              │
│                                 │
│ (More badges earned as you      │
│  continue your journey)         │
└─────────────────────────────────┘
```

**First timer sees:** Just their 1-2 badges  
**Veteran sees:** A wall of badges (but clean, scrollable, not cluttered)

## The Journey Reference (Separate Section)

**Navigation:** Dashboard → "About the Journey" or "Progression Guide"

This is pure text, no visual hierarchy, no numbers screaming at you:

```
┌─────────────────────────────────┐
│ The Wrestling Journey           │
│                                 │
│ THE CRUCIBLE                    │
│ This is where everyone starts.  │
│ Everything hurts. You don't     │
│ know what you're doing. But     │
│ you're showing up. That's what  │
│ matters. The pain is building   │
│ something.                      │
│                                 │
│ THE GRINDER                     │
│ You're not dying anymore.       │
│ Technique starts to click. You  │
│ have moves that sometimes work. │
│ This is the foundation phase.   │
│                                 │
│ THE TECHNICIAN                  │
│ Now it gets fun. You're         │
│ competitive. Chain wrestling    │
│ flows. You're thinking ahead.   │
│ You're a real wrestler now.     │
│                                 │
│ [Continues with other phases... │
│  just descriptions, no metrics] │
└─────────────────────────────────┘
```

**Key:** It's inspirational text, not a progress bar. Shows the *character* of each phase, not how far away it is.

## Dashboard Focus: Next Chunk Only

```
┌─────────────────────────────────┐
│ Practice #23                    │
│ Phase: The Crucible             │
│                                 │
│ Next Milestone:                 │
│ ████████░░ 23/30                │
│ Six Weeks Strong                │
│ (7 practices to go)             │
│                                 │
│ Recent Badges: 🏅💪             │
│ Tap to see all →                │
└─────────────────────────────────┘
```

**User only sees:**
- Current phase name
- Progress to NEXT milestone (not to end of phase)
- Small, manageable chunk

## Progressive Milestone Chunking

**Early phase: Small, frequent wins**
```
The Crucible Milestones:
Practice 1:  "Day One" 
Practice 3:  "Three Days In"
Practice 5:  "First Week"
Practice 10: "Two Weeks Strong"
Practice 15: "Three Weeks In"
Practice 20: "First Month"
Practice 30: "Six Weeks Strong"
Practice 40: "Two Months Deep"
Practice 50: "Quarter Season"
Practice 75: "Crucible Complete" ← Big celebration
```

**Mid phase: Larger chunks**
```
The Grinder Milestones:
Practice 100: "Century Club"
Practice 150: "Half Year"
Practice 200: "Grinder Complete"
```

**Later phases: Even larger**
```
The Technician Milestones:
Practice 300: "Year and a Half"
Practice 400: "Two Years In"
Practice 500: "Technician Complete"
```

**Psychology:** Early momentum with frequent wins, then as habit solidifies, you can handle longer stretches.

## Badge Categories (Hidden Until Earned)

**Volume Badges:**
- First Practice
- First Week (5 practices)
- First Month (20 practices)
- Century Club (100 practices)
- [etc.]

**Consistency Badges:**
- 3 Practice Streak
- 5 Practice Streak
- 10 Practice Streak
- 2 Weeks Consistent (6+ practices)
- [etc.]

**Phase Completion Badges:**
- Crucible Survivor (75 practices)
- Grinder Complete (200 practices)
- [etc.]

**Hour Milestones:**
- 10 Hours
- 25 Hours
- 50 Hours
- 100 Hours
- [etc.]

**Special Moments (User-Triggered):**
- First Competition
- First Win
- Breakthrough Moment (user can manually award this when they have a major realization)

## UI Layout Hierarchy

**Dashboard (Main Screen):**
- Current practice count
- Current phase name
- Progress to next milestone ONLY
- Last 2-3 badges earned (small icons)

**Badges Screen (Tap to expand):**
- Chronological list of all earned badges
- Clean, scrollable
- Each badge shows: Icon, Name, Date earned, Practice # when earned

**Journey Guide (Info/About section):**
- Text-only descriptions of phases
- No metrics, no progress bars
- Pure inspiration and context

**Stats Screen (For the data nerds):**
- Total practices
- Total hours
- Average intensity
- Longest streak
- Current streak
- Start date
- Calendar heatmap
- But this is OPTIONAL - user can ignore it entirely

## Visual Design: Minimal Badge Display

**On dashboard, recent badges are tiny:**
```
Recent: 🏅 💪 🔥
```

**On badges screen, they're bigger but still clean:**
```
┌─────────────────────────────────┐
│ 🏅 First Practice               │
│ Sep 1, 2025 • Practice #1       │
├─────────────────────────────────┤
│ 🔥 First Week                   │
│ Sep 8, 2025 • Practice #5       │
├─────────────────────────────────┤
│ 💪 First Month                  │
│ Sep 28, 2025 • Practice #20     │
└─────────────────────────────────┘
```

**No overwhelming wall of locked icons. Just a growing collection of achievements.**

## Code Implications

```javascript
// Badges are silent until earned
const badges = [
  { 
    id: 'first_practice',
    name: 'Day One',
    icon: '🏅',
    condition: (stats) => stats.practices >= 1
  },
  { 
    id: 'first_week',
    name: 'First Week',
    icon: '🔥',
    condition: (stats) => stats.practices >= 5
  },
  // ... many more
];

// Check on every practice save
function checkNewBadges(stats, earnedBadgeIds) {
  return badges
    .filter(b => b.condition(stats))
    .filter(b => !earnedBadgeIds.includes(b.id));
}

// Show celebration for new badges
if (newBadges.length > 0) {
  showBadgeCelebration(newBadges);
}
```

## The Experience

**Practice #5:** User saves practice → "🏅 New Badge Earned: First Week!" appears → User taps badges, sees they now have 3 total → Feels good

**Practice #23:** Dashboard shows "7 more to Six Weeks Strong" → Feels achievable

**Curious about the journey:** User taps "About the Journey" → Reads poetic descriptions of phases → Gets inspired, but not crushed by numbers

**Never:** "You need 1,977 more practices to be good"