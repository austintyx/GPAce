# GPAce

GPAce is a full-stack web app for university students to track academic progress, calculate GPA, import transcripts/curriculum PDFs, plan future grades, organise modules by semester, and optimise pass/fail choices through the FGO Planner.

## Features

- Account signup/login and guest mode
- Transcript PDF import with module, credit, grade, and academic year parsing
- Curriculum structure import for planned modules
- GPA dashboard with editable modules, grades, status, credits, and categories
- Double degree support with separate GPA calculations
- Course Planner for arranging modules by semester
- Grade Plan permutations for reaching a target GPA
- FGO Planner to recommend modules to convert to pass/fail under AU limits

## Project Structure

```text
GPAceTest/
  back/   Express + MongoDB backend API
  front/  React frontend
```

## Prerequisites

- Node.js and npm
- MongoDB running locally or a MongoDB Atlas connection string

## Backend Setup

From the project root:

```bash
cd GPAceTest/back
npm install
```

Create a `.env` file in `GPAceTest/back`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/gpace
PORT=4000
```

Start the backend:

```bash
npm run dev
```

The API runs at:

```text
http://localhost:4000
```

## Frontend Setup

Open another terminal from the project root:

```bash
cd GPAceTest/front
npm install
npm start
```

The frontend runs at:

```text
http://localhost:3000
```

The frontend has also been deployed at: `https://ntugpace.vercel.app`

## Typical Development Flow

1. Start MongoDB.
2. Start the backend with `npm run dev` inside `GPAceTest/back`.
3. Start the frontend with `npm start` inside `GPAceTest/front`.
4. Open `http://localhost:3000` in your browser.

## Useful Commands

Backend:

```bash
cd GPAceTest/back
npm run dev
npm start
```

Frontend:

```bash
cd GPAceTest/front
npm start
npm run build
```
