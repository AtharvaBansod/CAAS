# Efficient AI Collaboration Guide

This guide outlines how to effectively collaborate with AI agents (like Antigravity) on the CAAS project without overwhelming them with the entire documentation suite at once.

## 🧠 The Core Principle: "Just-in-Time" Context

AI models work best when focused. Instead of providing the entire documentation for every request, provide **only the context relevant to the specific task at hand**.

Think of the documentation as a library. You don't bring every book to your desk to write a single page; you only grab the reference books you need for that specific chapter.

## 🗺️ How to Use the Documentation

Use the `docs/DOCUMENTATION_INDEX.md` as your "map". It tells you where everything is.

### 1. Identify Your Current Task
Look at `docs/PRIORITY_ROADMAP.md` to see what needs to be built next.
*Example: "Implement MongoDB Multi-Tenancy Strategy (Phase 1.1.2)"*

### 2. Locate Relevant Documents
Using the Index or Roadmap links, find the specific files for this task.
*   **Primary Guide**: `roadmaps/4_mongodbService.md`
*   **Technical Detail**: `rnd/mongodb-multi-tenancy.md`
*   **High Level**: `OVERVIEW.md` (Always good for general alignment)

### 3. Construct Your Prompt
When asking the AI to work, explicitly tell it which files to read.

**Template:**
> "I want to work on [Task Name].
> Please read the following files for context:
> 1. `docs/PRIORITY_ROADMAP.md` (to see the task status)
> 2. [Relevant Roadmap File]
> 3. [Relevant Deep Dive/R&D File]
>
> Then, help me implement [Specific Step]."

---

## ⚡ Workflow Examples

### Example A: Building a Feature
**Task**: Setting up the API Gateway Base.

**Prompt to AI**:
> "We are starting Phase 1.2.1: API Gateway Setup.
> Please review:
> - `docs/PRIORITY_ROADMAP.md` (Section 1.2)
> - `docs/roadmaps/2_publicalllyExposedGateway.md` (for gateway details)
> - `docs/deepDive/publicGateway/security-implementation.md` (for security specs)
>
> Create the initial `gateway` service structure using Node.js and Fastify as specified."

### Example B: Fixing a Bug / Refactoring
**Task**: Optimizing MongoDB connections.

**Prompt to AI**:
> "I need to fix connection pooling in the MongoDB service.
> Please review:
> - `docs/roadmaps/4_mongodbService.md` (Section on Connection Pooling)
> - The current code in `services/mongodb/src/db.ts`
>
> Propose a refactor to match the best practices in the documentation."

### Example C: Writing New Documentation
**Task**: documenting the new Billing Flow.

**Prompt to AI**:
> "We need to create a flow diagram for the Billing process.
> Please review:
> - `docs/roadmaps/10_billingPricing.md`
>
> Create a new mermaid diagram file at `docs/flowdiagram/billing-flow.md` that covers the subscription lifecycle."

---

## 🛠️ Best Practices

1.  **Reference by Path**: Always use the full path (e.g., `docs/roadmaps/...`) so the AI can find the file immediately.
2.  **One Feature at a Time**: Don't ask to "Build the whole app". Ask to "Build the User Schema" then "Build the Auth Service".
3.  **Update the Tracker**: After completing a task, ask the AI to:
    > "Mark item [X] as checked in `docs/PRIORITY_ROADMAP.md`."

## 🚫 What to Avoid

*   ❌ "Read the docs and build the app." (Too vague, too much context)
*   ❌ Copy-pasting the content of 5 different markdown files into the chat. (Let the AI read the files itself using its tools)
