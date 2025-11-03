# Product Requirements Document: AI Math Tutor - Socratic Learning Assistant

## Executive Summary

### Product Overview
An AI-powered mathematics tutor that employs Socratic questioning methodology to guide students through problem-solving without providing direct answers. The system accepts mathematical problems via text input or image upload and facilitates learning through guided dialogue, helping students discover solutions independently.

### Vision
Create an educational tool that mirrors the pedagogical approach demonstrated in the OpenAI x Khan Academy demo, fostering deep mathematical understanding through inquiry-based learning rather than answer provision.

### Success Criteria
- Successfully guides students through 5+ distinct problem types without providing direct answers
- Maintains coherent conversation context across multi-turn dialogues
- Dynamically adapts questioning based on student responses and understanding level
- Provides alternative example solutions when students are genuinely stuck
- Delivers responsive, intuitive user experience with proper mathematical notation rendering

---

## Product Goals

### Primary Objectives
1. **Pedagogical Excellence**: Implement authentic Socratic method that promotes critical thinking
2. **Technical Reliability**: Robust problem parsing from both text and images with high accuracy
3. **User Engagement**: Intuitive interface that encourages exploration and reduces friction
4. **Scalable Architecture**: Cost-efficient design that can serve multiple concurrent users

### Non-Goals (Out of Scope for Initial Release)
- Multi-language support (English only initially)
- Mobile native applications (web-only)
- Integration with existing LMS platforms
- Grading or assessment features
- Teacher/parent dashboards
- Handwritten mathematical notation input (printed text only)

---

## User Personas

### Primary Persona: Middle-High School Student
**Demographics**: Ages 12-18, studying algebra through pre-calculus
**Needs**: 
- Homework help without answer-giving that would prevent learning
- Patient guidance when stuck on problems
- Ability to work through problems at their own pace
**Pain Points**:
- Traditional tutors or AI tools often give direct answers
- Difficulty identifying where reasoning breaks down
- Intimidation asking "basic" questions

### Secondary Persona: Self-Directed Learner
**Demographics**: Adult learners, career changers, test prep students
**Needs**:
- Flexible learning schedule
- Deep understanding rather than memorization
- Practice with immediate feedback
**Pain Points**:
- Limited access to human tutors
- Need for on-demand help
- Desire for mastery-level understanding

---

## User Stories

### Problem Input
- **As a student**, I want to type a math problem directly, so I can quickly get help without switching apps
- **As a student**, I want to upload a photo of a problem from my textbook, so I don't have to manually type complex equations
- **As a student**, I want to see my uploaded image alongside the parsed problem, so I can verify it was interpreted correctly

### Socratic Dialogue
- **As a student**, I want the tutor to ask me guiding questions, so I can develop problem-solving skills rather than just getting answers
- **As a student**, I want encouragement when I'm on the right track, so I stay motivated
- **As a student**, I want hints when I'm stuck, so I can progress without being given the answer
- **As a student**, I want to see a similar worked example if I'm completely blocked, so I can learn the approach and try again

### Conversation Management
- **As a student**, I want to see my conversation history, so I can review past problems and solutions
- **As a student**, I want to resume a previous problem session, so I can continue where I left off
- **As a student**, I want to start a new problem without losing my history, so I can practice multiple problems

### Mathematical Display
- **As a student**, I want equations to display properly formatted, so I can read mathematical notation clearly
- **As a student**, I want to see my work organized step-by-step, so I can follow the logical progression

---

## Functional Requirements

### FR-1: Problem Input System

#### FR-1.1: Text Input
- Accept mathematical problems via text input field
- Support standard mathematical notation (×, ÷, ², √, fractions, etc.)
- Validate input is non-empty before submission
- Character limit: 500 characters per problem input

#### FR-1.2: Image Upload
- Accept image uploads in formats: JPG, PNG, WEBP
- Maximum file size: 5MB per image
- Use OpenAI Vision API for problem extraction
- Display uploaded image alongside parsed text
- Allow user to edit parsed text if extraction is incorrect
- Provide clear error messages for unsupported formats or failed parsing

#### FR-1.3: Problem Parsing
- Extract mathematical expressions, numbers, and operators accurately
- Identify problem type (arithmetic, algebra, geometry, word problem, multi-step)
- Preserve mathematical structure and notation
- Handle common textbook formatting

### FR-2: Socratic Dialogue Engine

#### FR-2.1: Conversation Initialization
- Analyze problem to identify: knowns, unknowns, goal, relevant methods
- Generate opening question that inventories known information
- Avoid any language that implies the answer

#### FR-2.2: Response Processing
- Evaluate student responses for correctness and understanding level
- Identify misconceptions or gaps in reasoning
- Maintain conversation context across turns
- Track student progress toward solution

#### FR-2.3: Question Generation
- Generate guiding questions based on current step in solution process
- Progressively narrow focus as student demonstrates understanding
- Use encouraging, supportive language
- Never provide direct answers or explicit solution steps

#### FR-2.4: Hint System
- Provide hints after 2+ consecutive stuck turns
- Hints should suggest approach without solving
- Escalate hint specificity if student remains stuck
- Track hint usage per problem

#### FR-2.5: Example Solution Fallback
- After 5+ stuck turns, offer to show a similar example problem
- Example must be structurally similar but with different numbers/variables
- Walk through example solution step-by-step with explanations
- Encourage student to apply learned approach to original problem
- Do not solve original problem directly

#### FR-2.6: Conversation Flow
Standard progression:
1. Parse and validate problem
2. "What are we trying to find?" (identify goal)
3. "What information do we have?" (inventory knowns)
4. "What method or formula might help?" (guide approach selection)
5. "What should we do first?" (step-by-step execution)
6. Validate intermediate steps
7. "How can we check if this answer makes sense?" (verification)

### FR-3: Mathematical Rendering

#### FR-3.1: Display Requirements
- Render LaTeX/mathematical notation using KaTeX library
- Support inline and display-mode equations
- Properly format fractions, exponents, radicals, symbols
- Ensure readability on various screen sizes
- Maintain formatting in conversation history

#### FR-3.2: Input Conversion
- Convert plain text mathematical notation to LaTeX when needed
- Handle common notations: x^2 → x², sqrt(x) → √x, etc.
- Preserve user's original notation when possible

### FR-4: Conversation History & Persistence

#### FR-4.1: Session Management
- Store each problem session with unique identifier
- Associate sessions with user (anonymous or authenticated)
- Persist conversation turns with timestamps
- Store problem metadata (type, difficulty, completion status)

#### FR-4.2: History Display
- Show list of past problem sessions with preview
- Display: problem text, start time, status (in-progress/completed)
- Allow user to click and view full conversation
- Support search/filter by date or problem type

#### FR-4.3: Session Resumption
- Enable users to continue incomplete problem sessions
- Load full conversation context
- Maintain Socratic dialogue continuity
- Prevent resuming completed sessions (treat as read-only)

#### FR-4.4: Data Persistence (Firebase Firestore)
Schema:
```
users/{userId}/
  sessions/{sessionId}/
    - problemText: string
    - problemType: string
    - imageUrl: string (optional)
    - status: "in-progress" | "completed" | "abandoned"
    - createdAt: timestamp
    - updatedAt: timestamp
    - turnCount: number
    - hintCount: number
    
    turns/{turnId}/
      - speaker: "student" | "tutor"
      - message: string
      - timestamp: timestamp
      - metadata: object (hints used, validation results, etc.)
```

### FR-5: User Interface

#### FR-5.1: Chat Interface
- Clean, focused chat layout using shadcn/ui components
- Use shadcn's `ScrollArea` component for chat container
- Message bubbles built with shadcn `Card` or custom components
- Clear visual distinction between student and tutor messages
- Auto-scroll to latest message
- Loading indicators using shadcn `Skeleton` during API calls

#### FR-5.2: Problem Input Area
- Tabbed interface using shadcn `Tabs` component: "Type Problem" and "Upload Image"
- Text input with shadcn `Textarea` and character counter
- Image upload with drag-and-drop using shadcn `Input` type="file"
- Preview area for uploaded images
- "Start Problem" button using shadcn `Button` (disabled state until valid input)

#### FR-5.3: History Sidebar
- Collapsible sidebar using shadcn `Sheet` component (drawer pattern)
- "New Problem" button using shadcn `Button` variant="default"
- Session cards using shadcn `Card` component with preview information
- Visual indicator badges using shadcn `Badge` for in-progress vs completed sessions
- Responsive design (mobile drawer using `Sheet`)

#### FR-5.4: Mathematical Input Helpers
- Symbol picker using shadcn `Popover` with grid of buttons
- Common symbols (√, ², π, ±, etc.) as shadcn `Button` variant="ghost"
- Examples shown in shadcn `Tooltip` components
- Tooltips for complex notation entry using shadcn `Tooltip`

#### FR-5.5: Additional UI Components
- Error messages using shadcn `Alert` component with variant="destructive"
- Success feedback using shadcn `Toast` notifications
- Loading states using shadcn `Spinner` or `Skeleton` components
- Confirmation dialogs using shadcn `AlertDialog`
- Settings/preferences using shadcn `Dialog` component

---

## Non-Functional Requirements

### NFR-1: Performance
- Chat response latency: <3 seconds for 90th percentile
- Image processing: <5 seconds for OCR extraction
- Page load time: <2 seconds
- Support 10+ concurrent users without degradation

### NFR-2: Reliability
- 99% uptime for core chat functionality
- Graceful error handling for API failures
- Retry logic for transient failures
- User-friendly error messages

### NFR-3: Security
- Firebase Authentication for user sessions
- Secure storage of conversation data
- Input sanitization to prevent injection attacks
- Rate limiting to prevent abuse

### NFR-4: Usability
- Intuitive interface requiring no tutorial
- Responsive design for desktop, tablet, mobile web
- Accessible keyboard navigation (leveraging shadcn's Radix UI primitives)
- Screen reader compatible (WCAG 2.1 AA compliance via shadcn's built-in accessibility)
- Focus management and ARIA attributes properly implemented
- Consistent design system via shadcn/ui tokens

### NFR-5: Maintainability
- Modular code structure with clear separation of concerns
- Comprehensive inline documentation
- Type safety with TypeScript
- Unit test coverage for critical paths

---

## Technical Architecture

### Technology Stack

#### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Styling**: Tailwind CSS + shadcn/ui
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Math Rendering**: KaTeX
- **State Management**: React Context API + hooks
- **Type Safety**: TypeScript

#### Backend
- **Runtime**: Node.js (via Next.js API routes)
- **AI Integration**: Vercel AI SDK
- **LLM**: OpenAI GPT-4 (via Vercel AI SDK)
- **Vision API**: OpenAI Vision API (GPT-4 Vision)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **File Storage**: Firebase Storage (for uploaded images)

#### Deployment
- **Platform**: Vercel
- **Environment**: Production, Preview (staging)

### System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Client (Browser)                   │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Chat UI   │  │ History View │  │ Image Upload│ │
│  │ (shadcn)   │  │  (shadcn)    │  │  (shadcn)   │ │
│  └────────────┘  └──────────────┘  └─────────────┘ │
└────────────────────────┬────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────┐
│         Next.js 16 Application (Vercel)              │
│  ┌─────────────────────────────────────────────────┐│
│  │           API Routes (Backend)                   ││
│  │  ┌───────────┐  ┌──────────┐  ┌──────────────┐ ││
│  │  │ Chat API  │  │Image API │  │ History API  │ ││
│  │  └───────────┘  └──────────┘  └──────────────┘ ││
│  └─────────────────────────────────────────────────┘│
└───────┬──────────────────┬──────────────────┬───────┘
        │                  │                  │
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Vercel AI  │  │   OpenAI     │  │   Firebase   │
│     SDK      │  │  Vision API  │  │  Firestore   │
│              │  │              │  │              │
│  (GPT-4)     │  │ (OCR/Parse)  │  │ (Database)   │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Component Architecture (shadcn/ui)

**Core UI Components Used**:
- `Button` - Primary actions, symbol picker buttons, navigation
- `Card` - Message bubbles, session cards, problem containers
- `Input` / `Textarea` - Problem text input, search fields
- `ScrollArea` - Chat message container with auto-scroll
- `Sheet` - Mobile-responsive sidebar/drawer for history
- `Tabs` - Problem input mode switching (text vs image)
- `Alert` - Error messages, warnings, informational notices
- `Toast` - Success notifications, background operation feedback
- `Skeleton` - Loading states for messages and sessions
- `Popover` - Symbol picker dropdown, tooltips
- `Tooltip` - Inline help, notation hints
- `Badge` - Session status indicators (in-progress, completed)
- `Dialog` / `AlertDialog` - Confirmation modals, settings
- `Separator` - Visual hierarchy in lists

**Custom Components Built on shadcn Primitives**:
- `MessageBubble` - Extends `Card` with tutor/student styling
- `MathDisplay` - Wraps KaTeX renderer in shadcn container
- `SessionCard` - Extends `Card` with problem preview and metadata
- `SymbolPicker` - `Popover` with grid of math symbol `Button`s
- `ProblemInput` - Composite component using `Tabs`, `Textarea`, file upload

**Design System**:
- Use shadcn's default theme configuration
- Extend Tailwind config for math-specific styling
- Maintain consistent spacing using shadcn's spacing scale
- Typography: Use shadcn's text utilities and font configuration
- Colors: Leverage shadcn's semantic color tokens (primary, destructive, muted, etc.)

### Data Flow

#### Problem Submission Flow
1. User inputs problem (text or image)
2. If image: Upload to Firebase Storage → Call OpenAI Vision API → Parse problem text
3. Create new session document in Firestore
4. Initialize Socratic dialogue with problem context
5. Display tutor's opening question

#### Conversation Turn Flow
1. User submits response
2. Store turn in Firestore (`sessions/{sessionId}/turns`)
3. Build conversation context from history
4. Call LLM via Vercel AI SDK with Socratic system prompt
5. Process response (validate, generate next question)
6. Store tutor turn in Firestore
7. Display response to user
8. Update session metadata (turnCount, etc.)

#### History Retrieval Flow
1. Query Firestore for user's sessions
2. Sort by updatedAt descending
3. Display session list with metadata
4. On session click: Load all turns, render conversation

---

## API Specifications

### API Route: `/api/chat`
**Method**: POST

**Request Body**:
```json
{
  "sessionId": "string",
  "message": "string",
  "isNewProblem": "boolean",
  "problemText": "string (if isNewProblem)",
  "problemType": "string (if isNewProblem)",
  "imageUrl": "string (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "response": "string (tutor message)",
    "metadata": {
      "hintUsed": "boolean",
      "turnCount": "number",
      "suggestExample": "boolean"
    }
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "string (error message)"
}
```

### API Route: `/api/parse-image`
**Method**: POST

**Request**: Multipart form-data with image file

**Response**:
```json
{
  "success": true,
  "data": {
    "problemText": "string",
    "imageUrl": "string (Firebase Storage URL)",
    "confidence": "number (0-1)"
  }
}
```

### API Route: `/api/sessions`
**Method**: GET

**Query Parameters**:
- `userId`: string
- `limit`: number (default: 20)
- `status`: "all" | "in-progress" | "completed"

**Response**:
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "string",
        "problemText": "string",
        "problemType": "string",
        "status": "string",
        "createdAt": "timestamp",
        "updatedAt": "timestamp",
        "turnCount": "number",
        "preview": "string (first tutor message)"
      }
    ]
  }
}
```

### API Route: `/api/sessions/[sessionId]`
**Method**: GET

**Response**:
```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "string",
      "problemText": "string",
      "problemType": "string",
      "status": "string",
      "imageUrl": "string (optional)",
      "createdAt": "timestamp",
      "turns": [
        {
          "turnId": "string",
          "speaker": "student | tutor",
          "message": "string",
          "timestamp": "timestamp",
          "metadata": "object"
        }
      ]
    }
  }
}
```

---

## Budget Constraints & Cost Optimization

### API Usage Limits

#### Per Session
- **Maximum turns**: 50 per problem session
- **Maximum hints**: 8 per session
- **Image uploads**: 1 per session
- **Prompt size**: 4,000 tokens max (including conversation history)

#### Per User
- **Daily session limit**: 20 new problems per day
- **Concurrent sessions**: 1 active session at a time
- **Storage**: 100 problem sessions max per user (auto-archive oldest)

### Cost Optimization Strategies

#### Conversation Context Management
- Keep last 10 turns in context window (summarize older context if needed)
- Compress conversation history by removing redundant exchanges
- Token budget per API call: 4,000 tokens max

#### Image Processing
- Resize large images before uploading (max 2048x2048 pixels)
- Use medium detail mode for Vision API (balance cost/accuracy)
- Cache parsed results to prevent re-processing

#### Database Operations
- Implement pagination for history retrieval (20 items per page)
- Use indexes on frequently queried fields (userId, status, createdAt)
- Compress stored conversations after session completion

#### Rate Limiting
- 30 API requests per minute per user
- Implement exponential backoff for retries
- Queue requests during high load

### Estimated Costs (Monthly for 100 Active Users)

**OpenAI API**:
- GPT-4 Chat: ~$150 (assuming 20 problems × 15 turns × $0.03/1K tokens)
- Vision API: ~$30 (assuming 15 images × $0.002/image)

**Firebase**:
- Firestore: ~$15 (read/write operations + storage)
- Storage: ~$5 (image hosting)
- Authentication: Free tier

**Vercel**:
- Hosting: Free tier (or ~$20 for Pro if needed)

**Total Estimated**: ~$200-225/month for 100 active users

### Monitoring & Alerts
- Set budget alerts at $150, $200, $250 monthly thresholds
- Track average cost per session
- Monitor API failure rates
- Alert on unusually high token usage

---

## Socratic Methodology Implementation

### Core System Prompt

```
You are a patient, encouraging mathematics tutor who uses the Socratic method. 
Your goal is to help students discover solutions through guided questions, 
NEVER by providing direct answers.

STRICT RULES:
1. NEVER solve the problem or give the final answer
2. NEVER provide explicit step-by-step solutions
3. NEVER write out complete solution steps
4. Instead: Ask guiding questions that help students think through the process

APPROACH:
- Start by helping the student identify what they're trying to find
- Ask what information they already have
- Guide them to recognize relevant methods or formulas
- When they're stuck, ask questions that prompt thinking: "What happens if...?" 
  "What do we know about...?" "What strategy have you seen before that's similar?"
- Validate their reasoning enthusiastically when correct
- If they make an error, ask questions that reveal why it doesn't work

HINTS (use sparingly, only after 2+ stuck turns):
- First hint: Point to relevant concept without solving
- Second hint: Suggest a specific approach or formula to consider
- Third hint: Give a more concrete direction, but still no direct steps

STUCK PROTOCOL (after 5+ stuck turns):
- Offer to show a SIMILAR example problem with different numbers
- Solve the example step-by-step with full explanations
- Encourage them to apply the same approach to their original problem
- DO NOT solve their original problem

TONE:
- Encouraging and patient
- Celebrate progress and correct reasoning
- Normalize struggle: "Great question! Many students wonder about this..."
- Use accessible language appropriate for middle/high school students
```

### Problem Type Templates

#### Algebra Problem Flow
1. "What variable are we solving for?"
2. "What operations are being done to that variable?"
3. "To isolate the variable, we need to undo those operations. Which order should we undo them?"
4. "What's the inverse operation of [X]?"

#### Geometry Problem Flow
1. "What shape(s) are we working with?"
2. "What measurements do we know? What are we trying to find?"
3. "What formulas or properties of [shape] might help?"
4. "How can we use [known measurement] to find [unknown]?"

#### Word Problem Flow
1. "Let's start by identifying what the problem is asking for. What's the question?"
2. "What information are we given? Let's list the important numbers and what they represent."
3. "Can we translate this into a mathematical expression or equation?"
4. "What operation or formula connects these quantities?"

### Validation Responses

**Correct Response**:
- "Exactly! That's the right approach."
- "Yes! You're on the right track."
- "Perfect reasoning. What's next?"

**Partially Correct**:
- "You're on the right path, but let's think about [aspect] a bit more..."
- "Good start! However, consider what happens when..."

**Incorrect Response**:
- "Let's think about that. What would happen if we..."
- "Interesting idea. But remember that [relevant principle]..."
- "Not quite. Let's go back to [earlier step]. What did we establish there?"

**Stuck/No Response**:
- "That's a tricky part. Let's think about [related concept]. What do you know about that?"
- "Would it help to consider a simpler version of this problem?"

### Example Solution Format (Fallback)

When student is genuinely stuck after 5+ turns:

```
I can see this is challenging! Let me show you a similar example, 
then you can apply the same approach to your problem.

Example Problem: [Similar problem with different numbers]

Step 1: [Action taken + reasoning]
Step 2: [Action taken + reasoning]
Step 3: [Action taken + reasoning]
Final Answer: [Answer + verification]

Now, can you try using this same approach on your original problem: [original problem]?
What would be your first step?
```

---

## Testing Strategy

### Test Problem Sets

**Simple Arithmetic** (Grade 3-5):
- 15 + 27 = ?
- 144 ÷ 12 = ?
- 5 × 8 = ?

**Algebra** (Grade 6-10):
- 2x + 5 = 13
- 3(x - 4) = 15
- x² - 5x + 6 = 0

**Geometry** (Grade 6-10):
- Area of triangle with base 10, height 6
- Circumference of circle with radius 7
- Pythagorean theorem: find hypotenuse with legs 3 and 4

**Word Problems** (Grade 5-9):
- "Sarah has $45 and spends $8 per day. How many days until she has $13?"
- "A rectangle's length is 3 more than twice its width. Perimeter is 30. Find dimensions."

**Multi-Step Problems** (Grade 8-12):
- System of equations
- Combined rate problems
- Quadratic word problems

### Functional Testing

#### Problem Input Testing
- [ ] Text input accepts various mathematical notations
- [ ] Image upload handles JPG, PNG, WEBP formats
- [ ] Vision API correctly parses printed math problems
- [ ] Error handling for oversized images (>5MB)
- [ ] Error handling for unsupported file types

#### Socratic Dialogue Testing
- [ ] Tutor never provides direct answers across 20+ test problems
- [ ] Hint system activates after 2 stuck turns
- [ ] Example solution offered after 5 stuck turns
- [ ] Conversation maintains context across 10+ turn sessions
- [ ] Responses adapt based on student's understanding level

#### Math Rendering Testing
- [ ] LaTeX renders correctly for fractions, exponents, radicals
- [ ] Inline and display math both render properly
- [ ] Special symbols (π, √, ∑, etc.) display correctly
- [ ] Rendering works across different browsers

#### Persistence Testing
- [ ] Conversations save correctly to Firestore
- [ ] History displays all past sessions
- [ ] Session resumption loads full context
- [ ] Completed sessions marked as read-only

#### Budget Constraint Testing
- [ ] Sessions terminate after 50 turns
- [ ] Daily limit of 20 problems enforced
- [ ] Prompt size stays under 4,000 tokens
- [ ] Rate limiting prevents abuse

### User Acceptance Testing

**Scenario 1: New Student with Simple Problem**
- Student uploads "5x = 20"
- Tutor should guide through: identify goal → inverse operation → solve → verify
- Success: Student solves without being given answer

**Scenario 2: Stuck Student Needs Hints**
- Student submits complex problem, responds incorrectly 3 times
- System should provide graduated hints
- Success: Student makes progress with hints, doesn't receive direct answer

**Scenario 3: Completely Blocked Student**
- Student unable to proceed after 5 turns
- System offers similar example problem
- Success: Student applies learned approach to original problem

**Scenario 4: Returning User**
- User returns, views history, resumes incomplete problem
- System loads conversation context
- Success: Conversation continues seamlessly from previous state

### Performance Testing
- Load test with 10 concurrent users
- Measure response times under load
- Test with slow network conditions
- Verify image upload/processing times

---

## Success Metrics

### Primary Metrics (Launch)

**Pedagogical Effectiveness**:
- **Socratic Adherence Rate**: 100% of tutor responses use questions/guidance (no direct answers)
- **Problem Completion Rate**: >60% of started problems reach valid solution
- **Hint Efficiency**: Average <3 hints per problem session
- **Student Engagement**: Average 8-15 turns per problem (indicates productive dialogue)

**Technical Performance**:
- **Parsing Accuracy**: >90% of image-based problems parsed correctly
- **Response Latency**: <3 seconds for 90th percentile
- **Error Rate**: <5% of API calls fail
- **Uptime**: >99% availability

**User Experience**:
- **Session Resume Rate**: >30% of incomplete sessions resumed
- **Return User Rate**: >40% of users start 2+ problems
- **Average Session Duration**: 10-20 minutes (indicates engagement without frustration)

### Secondary Metrics

**Cost Efficiency**:
- Average cost per session <$0.50
- Token usage per turn <300 tokens
- Total monthly costs within budget projections

**User Satisfaction** (if feedback implemented):
- >4.0/5.0 average rating
- >60% would recommend to others

---

## Implementation Phases

### Phase 1: Core Foundation (MVP)
**Deliverables**:
- Basic Next.js 16 app with chat UI
- shadcn/ui setup and component configuration
- Text-based problem input
- LLM integration with Socratic system prompt
- Firebase Firestore connection for persistence
- Single conversation flow (no history yet)

**Technical Setup**:
- Initialize Next.js 16 with App Router
- Configure Tailwind CSS
- Install and configure shadcn/ui (via CLI)
- Set up core shadcn components: Button, Card, Input, Textarea, ScrollArea
- Configure TypeScript with React 19 types

**Validation Criteria**:
- Can input simple algebra problem
- Receives Socratic guidance (no direct answers)
- Conversation maintains context over 5+ turns
- Messages persist to database
- UI uses shadcn components consistently

### Phase 2: Image Input & Parsing
**Deliverables**:
- Image upload component
- Firebase Storage integration
- OpenAI Vision API integration
- Problem text extraction and validation
- Image preview and edit functionality

**Validation Criteria**:
- Can upload image of printed problem
- Extracts problem text with >85% accuracy
- User can correct misinterpretations
- Image URL persists with session

### Phase 3: Math Rendering & UI Polish
**Deliverables**:
- KaTeX integration for equation rendering
- Improved chat UI with shadcn components
- Mathematical symbol picker (shadcn Popover + Button grid)
- Responsive design for mobile web
- Loading states (shadcn Skeleton components)
- Error handling (shadcn Alert and Toast components)
- Theme configuration (light/dark mode support via shadcn)

**shadcn Components to Implement**:
- `ScrollArea` for chat messages
- `Skeleton` for loading states
- `Alert` for error messages
- `Toast` for notifications
- `Popover` for symbol picker
- `Tooltip` for inline help

**Validation Criteria**:
- Equations render correctly in chat
- UI is intuitive without tutorial
- Works on mobile browsers
- Graceful error messages with proper alerts
- All interactions use shadcn components
- Consistent theming throughout

### Phase 4: Conversation History
**Deliverables**:
- History sidebar using shadcn `Sheet` component
- Session list with shadcn `Card` components
- Session detail view
- Resume incomplete sessions
- Search/filter functionality with shadcn `Input`
- "New Problem" workflow with shadcn `Button`

**shadcn Components to Add**:
- `Sheet` for collapsible sidebar/drawer
- `Card` for session list items
- `Badge` for status indicators
- `Separator` for visual hierarchy
- `Command` (optional) for search functionality

**Validation Criteria**:
- Can view list of past problems
- Can click and view full conversation
- Can resume in-progress problem
- New problem creates separate session
- Sidebar works on mobile (as drawer)
- Smooth animations for Sheet open/close

### Phase 5: Advanced Socratic Logic
**Deliverables**:
- Hint system (graduated hints after stuck turns)
- Example solution fallback (after 5+ stuck turns)
- Problem type detection and tailored questioning
- Response validation and adaptive follow-ups
- Stuck detection algorithm

**Validation Criteria**:
- System provides hints appropriately
- Example solutions are structurally similar but different
- Never gives direct answer to original problem
- Adapts questions based on student responses

### Phase 6: Optimization & Launch Prep
**Deliverables**:
- Budget constraint implementation (turn limits, rate limiting)
- Performance optimization (caching, context compression)
- Comprehensive testing across problem types
- Documentation (README, setup guide, example walkthroughs)
- Deployment to Vercel production

**Validation Criteria**:
- All budget constraints enforced
- Response times meet SLA
- Passes all test scenarios
- Documentation complete
- Successfully deployed and accessible

---

## Stretch Features (Post-Launch)

### High-Value Additions

#### Interactive Whiteboard
**Description**: Shared canvas where tutor can draw diagrams and student can sketch work

**Implementation**:
- Fabric.js or Excalidraw for canvas
- Real-time sync via Firebase Realtime Database
- Export diagrams as images to conversation history

**Value**: Visual learners benefit significantly; especially valuable for geometry

#### Step Visualization
**Description**: Animated breakdown showing solution steps after problem completion

**Implementation**:
- Parse final solution into discrete steps
- Animate step-by-step reveal with explanations
- Show visual representation of transformations

**Value**: Reinforces learning; helps students verify their reasoning

#### Voice Interface
**Description**: Text-to-speech for tutor responses, speech-to-text for student input

**Implementation**:
- Web Speech API for browser-based TTS/STT
- Or integrate ElevenLabs/Google Cloud TTS for higher quality
- Toggle voice mode on/off

**Value**: Accessibility; more natural interaction for some learners

### Polish Features

#### Animated Avatar
**Description**: 2D or 3D tutor character with expressions that react to conversation

**Implementation**:
- Ready Player Me for 3D avatar
- Or Lottie animations for 2D character
- Expressions change based on sentiment (encouraging, thoughtful, etc.)

**Value**: Increases engagement; makes experience more personable

#### Difficulty Modes
**Description**: Adjust scaffolding level by grade/skill level

**Implementation**:
- User selects difficulty on problem start
- Adjust prompt: more/less detailed questions, faster/slower hints
- Store preference per user

**Value**: Personalization; serves broader range of students

#### Problem Generation
**Description**: System generates similar practice problems for repetition

**Implementation**:
- After solving problem, offer "Try another like this"
- Use LLM to generate structurally similar problem with different numbers
- Track problem templates and variations

**Value**: Practice reinforcement; builds confidence

---

## Documentation Requirements

### README.md
**Contents**:
- Project overview and goals
- Technology stack (Next.js 16, React 19, shadcn/ui)
- Setup instructions (local development)
- Environment variables needed
- Deployment instructions
- Testing procedures
- License and contact information

### SETUP_GUIDE.md
**Contents**:
- Prerequisites (Node.js 20+, Firebase account, OpenAI API key)
- Step-by-step installation
- Next.js 16 setup
- shadcn/ui installation and configuration
- Firebase configuration
- Environment variable setup
- Running locally
- Troubleshooting common issues

### COMPONENT_GUIDE.md (shadcn/ui specific)
**Contents**:
- List of shadcn components used in project
- Custom component patterns built on shadcn primitives
- Theming configuration
- Styling conventions
- Accessibility considerations with shadcn components

### EXAMPLE_WALKTHROUGHS.md
**Contents**:
- 5+ complete example conversations demonstrating:
  1. Simple algebra problem (text input)
  2. Geometry problem (image upload)
  3. Word problem requiring translation to equation
  4. Multi-step problem with hints needed
  5. Student stuck scenario with example solution fallback
- Annotations explaining Socratic approach in each example

### PROMPT_ENGINEERING.md
**Contents**:
- System prompt breakdown and rationale
- Problem type templates
- Hint graduation strategy
- Example solution format
- Iteration notes (what worked, what didn't)
- Tips for tuning prompts

### API_DOCUMENTATION.md
**Contents**:
- All API endpoints with examples
- Request/response schemas
- Error codes and handling
- Rate limiting details
- Authentication requirements

---

## Evaluation Rubric

### Pedagogical Quality (35%)
**Criteria**:
- [ ] Authentic Socratic method maintained (never gives direct answers): **15%**
- [ ] Questions guide reasoning effectively: **10%**
- [ ] Adaptive responses based on student understanding: **5%**
- [ ] Encouraging tone and appropriate language: **5%**

**Scoring**:
- **Excellent (31-35%)**: Perfect adherence to Socratic method, highly effective guidance, seamless adaptation
- **Good (24-30%)**: Consistent Socratic approach, effective guidance with minor lapses, good adaptation
- **Acceptable (18-23%)**: Mostly Socratic with occasional direct hints, decent guidance, basic adaptation
- **Poor (<18%)**: Frequently provides direct answers, ineffective guidance, rigid responses

### Technical Implementation (30%)
**Criteria**:
- [ ] Problem parsing works reliably (text and image): **8%**
- [ ] Conversation context maintained properly: **8%**
- [ ] Math rendering displays correctly: **5%**
- [ ] Data persistence and session management: **5%**
- [ ] Error handling and edge cases: **4%**

**Scoring**:
- **Excellent (27-30%)**: All features work flawlessly, robust error handling, clean code
- **Good (21-26%)**: Core features work well, minor bugs, adequate error handling
- **Acceptable (15-20%)**: Basic functionality present, some bugs, basic error handling
- **Poor (<15%)**: Significant technical issues, frequent failures, poor code quality

### User Experience (20%)
**Criteria**:
- [ ] Intuitive interface requiring no tutorial: **8%**
- [ ] Responsive and performant: **5%**
- [ ] Proper feedback and loading states: **4%**
- [ ] Accessibility considerations: **3%**

**Scoring**:
- **Excellent (18-20%)**: Delightful UX, highly polished, accessible, very responsive
- **Good (14-17%)**: Good UX, well-designed, mostly accessible, responsive
- **Acceptable (10-13%)**: Functional UX, basic design, some accessibility, adequate performance
- **Poor (<10%)**: Confusing UX, poor design, not accessible, slow

### Innovation & Stretch Features (15%)
**Criteria**:
- [ ] Creative problem-solving approaches: **5%**
- [ ] Implementation of stretch features: **8%**
- [ ] Polish and attention to detail: **2%**

**Scoring**:
- **Excellent (13-15%)**: Multiple stretch features implemented, highly creative, exceptional polish
- **Good (10-12%)**: At least one stretch feature, creative solutions, good polish
- **Acceptable (6-9%)**: Basic innovation, attempted stretch feature, adequate polish
- **Poor (<6%)**: No innovation, no stretch features, minimal effort

### Total: 100%

**Grade Bands**:
- **A (90-100%)**: Exceptional product demonstrating mastery across all dimensions
- **B (80-89%)**: Strong product with solid execution and few weaknesses
- **C (70-79%)**: Acceptable product meeting core requirements with notable gaps
- **D/F (<70%)**: Incomplete or fundamentally flawed product

---

## Risk Management

### Technical Risks

**Risk**: OpenAI API rate limits or costs exceed budget
- **Mitigation**: Implement aggressive rate limiting, caching, context compression
- **Contingency**: Switch to cheaper model (GPT-3.5) for some operations

**Risk**: Vision API misinterprets complex mathematical notation
- **Mitigation**: Start with printed text only; add edit functionality
- **Contingency**: Allow manual text entry fallback

**Risk**: Firebase costs scale unexpectedly
- **Mitigation**: Implement data retention policies, pagination, compression
- **Contingency**: Migrate to cheaper storage solution

**Risk**: Conversation context exceeds token limits
- **Mitigation**: Summarize old turns, keep only recent 10 turns in full
- **Contingency**: Prompt user to start new problem session

### Product Risks

**Risk**: Socratic method too frustrating for users (want direct answers)
- **Mitigation**: Clear onboarding explaining approach; example solution fallback
- **Contingency**: A/B test with more direct guidance option

**Risk**: Problem type detection fails, leading to inappropriate questions
- **Mitigation**: Manual problem type selection option
- **Contingency**: Generic questioning that works across types

**Risk**: Low user engagement/retention
- **Mitigation**: Gamification elements (progress tracking, achievements)
- **Contingency**: Add more direct feedback/validation features

### Operational Risks

**Risk**: Solo developer timeline optimism
- **Mitigation**: Phased implementation with MVP-first approach
- **Contingency**: Cut stretch features, focus on core functionality

**Risk**: Scope creep from stretch features
- **Mitigation**: Strict prioritization, only add stretch features after core complete
- **Contingency**: Time-box stretch feature development

---

## Open Questions & Decisions Needed

1. **Authentication**: Anonymous users or require login? (Impacts data persistence strategy)
2. **Problem Type Taxonomy**: Fixed set of types or LLM-inferred?
3. **Hint Tuning**: How aggressive should hint escalation be? (Balance help vs. giving answer)
4. **Example Solution Similarity**: How different should example numbers be? (Too similar = gives away answer)
5. **Multi-language Support**: Priority for future? (Affects architecture decisions)
6. **Mobile App**: Is native mobile a future consideration? (Affects tech choices)
7. **Analytics**: What user behavior should be tracked? (Privacy implications)
8. **Monetization**: Free tier limits vs. paid plans? (Long-term sustainability)

---

## Appendix

### Glossary
- **Socratic Method**: Teaching approach using questions to guide discovery rather than direct instruction
- **Turn**: One exchange in conversation (student message + tutor response)
- **Hint**: Graduated guidance provided when student is stuck
- **Example Solution**: Worked problem similar to but different from student's problem
- **Session**: Complete problem-solving conversation from start to solution/abandonment

### References
- OpenAI x Khan Academy Demo: https://www.youtube.com/watch?v=IvXZCocyU_M
- Next.js 16 Documentation: https://nextjs.org/docs
- React 19 Documentation: https://react.dev
- shadcn/ui Documentation: https://ui.shadcn.com
- Radix UI Primitives: https://www.radix-ui.com
- Tailwind CSS Documentation: https://tailwindcss.com/docs
- Vercel AI SDK Documentation: https://sdk.vercel.ai/docs
- Firebase Firestore Documentation: https://firebase.google.com/docs/firestore
- KaTeX Documentation: https://katex.org/docs/api.html
- Socratic Questioning in Education: https://www.criticalthinking.org/pages/socratic-teaching/606


**Document Version**: 1.0  
**Last Updated**: November 3, 2025  
**Status**: Ready for Development
