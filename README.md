# DFA Minimizer & Visualizer

> A modern interactive web tool to **minimize Deterministic Finite Automata (DFA)** with step-by-step visualization, simulation, and 3D rendering.

---

# 🌐 Live project URL

[https://dfa-minimizer-nitinkumar-2024ucs1534.netlify.app/](https://dfa-minimizer-nitinkumar-2024ucs1534.netlify.app/)

---

#  Features

- Table Filling Algorithm (Myhill–Nerode)
-  Partition Refinement Algorithm (Hopcroft)
-  Step-by-step DFA minimization
- Interactive 2D DFA visualization
-  3D DFA visualization
-  String pattern simulator (accept/reject)
-  Original vs Minimized DFA comparison
-  Export DFA as PNG & JSON

---

## 📁 Project Structure

```bash
DFA-Minimizer-Visualizer/
│
├── index.html        # Main UI structure
├── style.css         # Styling (UI design)
├── script.js         # Core logic (DFA + Algorithms + Visualization)
│
└── README.md         # Documentation

```

##  How to Run the Project

Follow these steps to run the project on your system 👇

### 1️⃣ Download / Clone Project

```bash
git clone https://github.com/nitinkumar292006/dfa-minimisation-visualizer.git
```

### 2 Open index.html in your browser

---

# ⚙️ How to Use the WebApp (Step-by-Step)

##  Example Walkthrough

###  Input DFA

- **States:** A, B, C, D  
- **Alphabet:** 0, 1  
- **Start State:** A  
- **Final States:** C, D  

---

##  Transition Table

| State | 0 | 1 |
|------|---|---|
| A    | B | C |
| B    | A | D |
| C    | D | C |
| D    | C | D |

---

# Input Modes (Dual Input System)

This project provides **two flexible ways** to create a DFA:

---

##  1. Transition Table Mode

 Users can manually define DFA using a structured table.

### Steps:
- Enter states, alphabet, start state, and final states  
- Click **"Build Transition Table"**  
- Fill transition values for each state  

 Best for:
- Theory-based problems  
- Exam practice  
- Precise DFA definition  

<img src="https://github.com/user-attachments/assets/885b524b-0625-47c9-b04a-ec971301743c"/>

---

##  2. Canvas Draw Mode (Interactive)

 Users can visually create DFA by drawing directly on canvas.

### Features:
-  Add states  
-  Mark final states  
-  Draw transitions between states  
-  Delete elements  
-  Clear canvas  

 How it works:
1. Click **"+ State"** to add nodes  
2. Click **"+ Final State"** to mark accepting states  
3. Use **"→ Transition"** to connect states  
4. Click **"Apply"** to convert drawing into DFA  

<img width="2841" height="547" alt="Screenshot 2026-04-11 101105" src="https://github.com/user-attachments/assets/2352512d-ccba-4d8b-9494-5f822e4a8a98" />


---


# ▶️ Steps to Use Website
We Use First input method Transition table

## Step 1️⃣ Enter DFA Details

- Fill **States**
- Fill **Alphabet**
- Enter **Start State**
- Enter **Final States**

<img src="https://github.com/user-attachments/assets/885b524b-0625-47c9-b04a-ec971301743c"/>

---

## Step 2️⃣ Build Transition Table

- Click **"Build Transition Table"**
- Fill all transitions correctly

<img src="https://github.com/user-attachments/assets/0560a158-e2fd-460a-956d-6eb328d29c98"/>

---

## Step 3️⃣ Select Algorithm

Choose one:

-  Table Filling  
-  Partition Refinement

<img src="https://github.com/user-attachments/assets/10abfb06-aac9-4784-b667-47a2b377f313"/>

** Algorithms Explained**

##  Table Filling Algorithm

- Create a matrix of state pairs  
- Mark pairs where one is final and other is not  
- Propagate markings using transitions  
- Unmarked pairs are equivalent  

##  Partition Refinement Algorithm (Hopcroft)

- Start with two groups:
  - Final states
  - Non-final states  
- Split groups based on transitions  
- Repeat until no further splitting possible  

---

## Step 4️⃣ Minimize DFA

Click **"Minimize DFA"**

<img src="https://github.com/user-attachments/assets/302a6db3-7617-4010-be2e-77c2f416dfbd"/>

 System will:
- Show step-by-step process  
- Highlight comparisons  
- Build equivalence classes  

---

## Step 5️⃣ View Result

You will see:

- Original DFA  
- Algorithm Visualization  
- Minimized DFA  

<img src="https://github.com/user-attachments/assets/6c404ba4-6f5a-4632-a584-da3b530686e5"/>

---

## Step6️⃣ Step-by-Step Controls

- ▶ Next Step  
- ◀ Previous Step  
- ⏯ Auto Play  

<img src="https://github.com/user-attachments/assets/53227da7-d3a4-42d5-99d5-43785cdf7a58"/>

---

## Step 7️⃣ 3D Visualization

Click **"3D View"** to explore minimized DFA in 3D

<img src="https://github.com/user-attachments/assets/459c5d49-ad1d-4fe3-83e9-7cf54c91545a"/>

---

## Step 8️⃣ String Simulator (Pattern Check)

Test strings to verify DFA:

### Example 1:
Input: `001` → ✅ ACCEPT  

<img src="https://github.com/user-attachments/assets/0127568c-08a0-4178-bfae-5459b042bf7e"/>

### Example 2:
Input: `00` → ❌ REJECT  

<img src="https://github.com/user-attachments/assets/4977eddd-e088-4260-a3a2-7932da29bc4e"/>

---

## ✅ Here you can Saved Minimized DFA in form of Given features:
<img width="837" height="86" alt="image" src="https://github.com/user-attachments/assets/0fb1ce6d-fe47-4283-9bd4-761951633670" />









