# Wrestling Journey PWA - Truth Document v1.0

## Project Purpose
A personal wrestling training journal PWA that:
1. Logs practice sessions with notes
2. Generates AI-ready prompts for motivational story generation
3. Tracks progress through meaningful milestones
4. Keeps beginners motivated without lying about the reality of wrestling development

## Core Constraints (THE IMMOVABLE OBJECTS)

### Technical Constraints
- **Platform:** Pixel 8 (Android)
- **Hosting:** GitHub Pages (static only)
- **Stack:** Pure HTML/CSS/JavaScript (no Node.js, no build tools, no npm)
- **Storage:** LocalStorage + IndexedDB (client-side only)
- **AI:** NO API integration - manual copy/paste workflow
- **Cost:** $0.00 forever

### Design Constraints
- **Dark mode only** (forced, not optional)
- **Single user** (no accounts, no multi-user)
- **Mobile-first** (desktop is bonus, not priority)
- **Offline-capable** (PWA with service worker)

### Reality Constraints
- **No automated skill tracking** (we can't measure takedown success rates, etc.)
- **Time-based levels are BS** (real-time weeks don't equal progress)
- **Wrestling takes YEARS** (be honest but don't crush motivation)

## MVP Feature Set (ONLY THESE)

### 1. Practice Logging
**What:**
- Duration (presets: 1hr, 1.5hr, 2hr, custom)
- Intensity (1-10 slider)
- Type (Mixed, Technique Focus, Live Wrestling, Conditioning, Competition, Open Mat)
- Physical Feel (1-10 slider)
- Mental Feel (1-10 slider)
- Notes (free text - voice input via Google Keyboard)

**What NOT:**
- ❌ Start/stop timer
- ❌ Technique tracking (specific moves with counts)
- ❌ Opponent tracking
- ❌ Weight/body metrics
- ❌ Injury tracking
- ❌ Pre-practice logging

### 2. AI Prompt Generation
**What:**
- Button to generate prompt from saved practice
- Prompt includes: user stats, current phase, practice details, notes
- Copyable to clipboard
- User pastes into Claude/ChatGPT/whatever
- User copies AI response back

**What NOT:**
- ❌ API calls to AI services
- ❌ Automated story generation
- ❌ In-app AI chat
- ❌ Prompt history/versioning

### 3. Story Storage
**What:**
- Paste AI-generated story into practice entry
- View practice with or without story
- Edit story after saving
- Delete story

**What NOT:**
- ❌ Story templates
- ❌ Story formatting tools (bold/italic/etc)
- ❌ Story sharing (social media integration)
- ❌ Story analytics

### 4. Progress Tracking
**What:**
- Total practices count
- Total hours count
- Current phase name
- Progress to NEXT milestone only
- Current streak (consecutive practices within reasonable timeframe)
- Longest streak

**What NOT:**
- ❌ Skill level ratings
- ❌ Performance analytics
- ❌ Technique success rates
- ❌ Competition record
- ❌ Weight class progression
- ❌ Comparison to other users
- ❌ Goal setting features

### 5. Badge System
**What:**
- Badges appear when earned (volume, consistency, phase completion)
- Chronological list of earned badges
- Badge earned date + practice number
- Simple celebration when new badge earned

**What NOT:**
- ❌ Locked/preview badges
- ❌ Badge progress bars
- ❌ Badge sharing
- ❌ Custom badges
- ❌ Badge categories/filtering

### 6. Phase/Journey Information
**What:**
- Separate text-only screen describing phases
- No metrics, just narrative descriptions
- Inspirational, not prescriptive

**What NOT:**
- ❌ Phase comparison tools
- ❌ "Time to next phase" estimates
- ❌ Phase skill requirements
- ❌ Phase advice/tips database

### 7. Data Management
**What:**
- Export all data to JSON
- Import JSON backup
- Clear all data (with confirmation)
- Automatic local folder backups (without AI story text, unlimited daily snapshots)

**What NOT:**
- ❌ Cloud sync
- ❌ Multi-device support
- ❌ Cloud-based backups
- ❌ CSV export
- ❌ PDF reports

## Data Model (LOCKED)

### User Profile
```javascript
{
  startDate: "2025-09-28",        // ISO date string
  totalPractices: 23,              // integer
  totalHours: 32.5,                // float
  currentStreak: 4,                // integer
  longestStreak: 6,                // integer
  lastPracticeDate: "2025-09-28"  // ISO date string
}
```

### Practice Entry
```javascript
{
  id: 1727481600000,              // timestamp
  date: "2025-09-28",             // ISO date string
  duration: 90,                   // minutes (integer)
  intensity: 8,                   // 1-10 (integer)
  type: "mixed",                  // string enum
  physicalFeel: 3,                // 1-10 (integer)
  mentalFeel: 7,                  // 1-10 (integer)
  notes: "Cardio brutal...",      // string
  aiStory: "Practice #23...",     // string or null
  practiceNumber: 23,             // integer
  phase: "crucible"               // string (calculated, not stored)
}
```

### Badge Entry
```javascript
{
  id: "first_practice",           // string
  name: "Day One",                // string
  icon: "🏅",                     // emoji string
  earnedDate: "2025-09-28",       // ISO date string
  earnedAtPractice: 1             // integer
}
```

## Phase System (LOCKED)

### The 6 Phases
1. **The Crucible** (1-75 practices): Survival mode
2. **The Grinder** (76-200 practices): Foundation building
3. **The Technician** (201-500 practices): Flow development
4. **The Competitor** (501-1000 practices): Advanced level
5. **The Advanced** (1001-2000 practices): Elite territory
6. **The Veteran** (2000+ practices): Mastery

### Milestone Chunking Strategy
- **Crucible:** Every 3-10 practices (frequent early wins)
- **Grinder:** Every 25-50 practices
- **Technician:** Every 50-100 practices
- **Later phases:** Every 100-250 practices

## UI Screens (LOCKED)

### 1. Dashboard (Home)
- Current practice count
- Current phase name
- Progress bar to next milestone
- Recent badges (2-3 icons)
- [Log Practice] button

### 2. Log Practice
- Form with all fields
- [Save Practice] button
- After save: [Generate AI Prompt] button

### 3. Practice History
- Chronological list of practices
- Each shows: date, duration, type, has-story indicator
- Tap to view details
- Can add/edit story from detail view

### 4. Badges
- Chronological list of earned badges
- Clean, scrollable

### 5. Journey Guide
- Text-only phase descriptions
- Static content

### 6. Stats (Optional)
- Total practices, hours, streaks
- Calendar heatmap (maybe Phase 2)
- Basic charts (maybe Phase 2)

### 7. Settings
- Export data
- Import data
- Clear all data
- About/version info

## What We're NOT Building (SCOPE CREEP GRAVEYARD)

❌ Social features (sharing, friends, leaderboards)  
❌ Coach/team features  
❌ Video integration  
❌ Technique library  
❌ Nutrition tracking  
❌ Weight tracking  
❌ Injury logging  
❌ Competition bracket tracking  
❌ Goal setting system  
❌ Reminders/notifications (maybe Phase 2)  
❌ Multi-language support  
❌ Themes/customization  
❌ In-app tutorials  
❌ User accounts/authentication  
❌ Payment/subscription features  
❌ Analytics/telemetry  
❌ Integration with other apps  
❌ Wearable device sync  
❌ Photo/video uploads  
❌ Custom badge creation  
❌ Achievement sharing  
❌ Practice templates  
❌ Workout plans  
❌ AI chat interface  

## Success Criteria

**MVP is successful if:**
1. ✅ User can log practice in <60 seconds
2. ✅ User can generate and copy AI prompt
3. ✅ User can save AI story back to practice
4. ✅ User can view practice history with stories
5. ✅ User earns badges and feels motivated
6. ✅ User sees progress to next milestone
7. ✅ App works offline after first load
8. ✅ Data persists between sessions
9. ✅ User can export/backup data
10. ✅ All of this costs $0

**MVP is NOT measured by:**
- Number of users
- App store ratings
- Feature completeness vs other apps
- AI story quality (that's on the LLM)
- Visual polish (functional > pretty for MVP)

## Build Order (LOCKED)

1. **HTML structure + CSS (dark mode)**
2. **IndexedDB storage wrapper**
3. **Practice logging form**
4. **Save practice to IndexedDB**
5. **Display practice history**
6. **Stats calculation**
7. **Phase system logic**
8. **Prompt generator**
9. **Add story to practice**
10. **Badge system**
11. **Badge checking on practice save**
12. **Journey guide (static text)**
13. **Export/import data**
14. **PWA manifest + service worker**
15. **Polish + testing**

## Version Control Strategy

- **v0.1**: Core logging + storage
- **v0.2**: Prompt generation
- **v0.3**: Progress tracking + phases
- **v0.4**: Badge system
- **v0.5**: PWA + offline
- **v1.0**: MVP complete

## Future Phases (Post-MVP - NOT NOW)

**Phase 2 (Maybe):**
- Calendar heatmap visualization
- Push notifications for streak maintenance
- Practice notes search
- More sophisticated streak logic

**Phase 3 (Probably Not):**
- Coach view/sharing
- Competition tracking
- Technique tag analysis

## Questions to Ask Before Adding Features

1. Does this help log practices faster?
2. Does this help generate better AI prompts?
3. Does this help track progress meaningfully?
4. Does this keep beginners motivated?
5. Can this work client-side only?
6. Is this free forever?

**If any answer is "no" → DON'T BUILD IT**

---

## Sign-Off

This document is the truth. Any feature not explicitly listed here is OUT OF SCOPE for MVP.

**Approved by:** Benjamin P. Haddon
**Date:** 2025-09-28  
**Version:** 1.0