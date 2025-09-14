# MediFlow

## What it does

MediFlow orchestrates multiple AI agents to analyze and route lab results intelligently. It acts as the central nervous system connecting laboratories, physicians, and patients.

**Core Workflow**
1. Labs upload results to MediFlow via web interface or API
2. Agent system analyzes results, with access to a suite of tools to help them perform analysis
3. Agent informs patients of their results, and whether any follow-ups are required via WhatsApp
4. In the case any follow-ups are necessary, the MediFlow interface is also updated 

**Example Use Case**
A patient gets routine blood work on Monday. By Tuesday, they receive a WhatsApp message explaining their results are normal, saving both patient anxiety and physician review time. The physician only sees the cases requiring medical judgment.

## How we built it

This system utilizes **Gemini** as our core LLM. **LangGraph** was used to create agent behavior, while **LangSmith** was used to ensure transparency and observability of the AI agent. The agent was packaged into an API via **FastAPI** and deployed on **Render**. Texting functionality was implemented using the Twilio API. Our databases were all hosted using **Supabase**. Our front-end web interface was built using Lovable. Our project was entirely coded in **Python**, with edge functions in Supabase written in **Typescript**.

We first deployed a simple agent using LangGraph on Render, and continuously added features to it until we had the full fledged agent with ability to call more LLMs ("experts"), access patient medical history, etc.

## Challenges we ran into

Our first major problem was deploying an agent. We built a functioning local agent but was having trouble deploying it onto an online service, and we weren't able to tell what was wrong due to the sheer size of it. We decided to rebuild the agent by deploying a simple, working agent first, and continually adding to it while deployed. A lot of time was also spent on the design of our system, ensuring information flow between the lab web interface, the AI agent, our users.

## Accomplishments that we're proud of

We were able to build a functional prototype that sends real WhatsApp notifications! We were also able to create an agent that can make realistic, complex decision workflows. During our tests, an agent received a report with an elevated reading, decided to order more tests before realizing that the initial report might have had an anomaly before finding that the patient did not have any issues. We were really proud of Gemini after it came to that conclusion. We were also able to build the agents, and refactor it three times over the course of the the hackathon.

## What we learned

AI agents are powerful, integration is hard, and we should plan well before starting working on code.

## What's next for MediFlow

Our immediate priorities would be to implement full encryption and security measures for health information compliant to HIPAA. Once that is done, we can move on to supporting  more result types and pilot testing with clinics.

Our future includes EMR integration (direct connection with electronic medical record systems), multi-language support (accessible to diverse populations), and maybe even open sourcing, though we're unsure how that would work in healthcare.

The goal is to reduce physician administrative burden while improving patient communication and catching critical results that might otherwise be missed. We believe MediFlow can save healthcare systems millions while improving patient outcomes.
