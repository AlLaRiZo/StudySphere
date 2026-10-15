
// ============================================
// STUDYSPHERE - COMPLETE JAVASCRIPT
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  // ---------- HELPER FUNCTIONS ----------

  function getElement(id) {
    return document.getElementById(id);
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined) {
      element.textContent = text;
    }

    return element;
  }

  function loadData(key) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  }

  function saveData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn("Unable to save data in this browser.");
    }
  }

  function makeId() {
    return Date.now().toString(36) +
      Math.random().toString(36).slice(2);
  }

  function showMessage(element, message) {
    if (element) {
      element.textContent = message;
    }
  }

  // ---------- SAVED DATA ----------

  let tasks = loadData("studysphere_tasks");
  let schedules = loadData("studysphere_schedules");
  let flashcards = loadData("studysphere_flashcards");

  if (!Array.isArray(tasks)) tasks = [];
  if (!Array.isArray(schedules)) schedules = [];
  if (!Array.isArray(flashcards)) flashcards = [];

  // ---------- PAGE NAVIGATION ----------
  
  // ---------- STUDY GOALS ----------
  const studyLogKey = "studysphere_study_log";
  const dailyGoalKey = "studysphere_daily_goal";

  let dailyStudyGoal = Number(
    localStorage.getItem(dailyGoalKey)
  ) || 60;

  function getTodayKey(date = new Date()) {
    return (
      date.getFullYear() + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0")
    );
  }

  function getStudyLog() {
    const log = loadData(studyLogKey);
    return log && typeof log === "object" && !Array.isArray(log)
      ? log
      : {};
  }

  function getStudyStreak(log, goal) {
    let streak = 0;
    const date = new Date();

    // If today's goal isn't complete yet, start checking from yesterday.
    if ((log[getTodayKey(date)]?.minutes || 0) < goal) {
      date.setDate(date.getDate() - 1);
    }

    while ((log[getTodayKey(date)]?.minutes || 0) >= goal) {
      streak++;
      date.setDate(date.getDate() - 1);
    }

    return streak;
  }

  function updateStudyGoals() {
    const log = getStudyLog();
    const today = getTodayKey();
    const todayMinutes = log[today]?.minutes || 0;
    const streak = getStudyStreak(log, dailyStudyGoal);
    const percent = Math.min(
      100,
      Math.round((todayMinutes / dailyStudyGoal) * 100)
    );

    const goalInput = document.getElementById("dailyGoalInput");
    const todayText = document.getElementById("studyGoalToday");
    const progressBar = document.getElementById("studyGoalProgressBar");
    const message = document.getElementById("studyGoalMessage");
    const streakText = document.getElementById("studyGoalStreak");
    const weeklySummary = document.getElementById("studyWeeklySummary");

    if (goalInput) goalInput.value = dailyStudyGoal;

    if (todayText) {
      todayText.textContent =
        todayMinutes + " of " + dailyStudyGoal + " minutes studied";
    }

    if (progressBar) progressBar.style.width = percent + "%";

    if (message) {
      message.textContent = todayMinutes >= dailyStudyGoal
        ? "Daily goal completed! Great work!"
        : percent + "% complete. Keep going!";
    }

    if (streakText) {
      streakText.textContent = streak + (streak === 1 ? " day" : " days");
    }

    if (weeklySummary) {
      let summary = "";

      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const key = getTodayKey(date);
        const minutes = log[key]?.minutes || 0;
        const dayName = date.toLocaleDateString("en-US", {
          weekday: "short"
        });
        const status = minutes >= dailyStudyGoal ? "Goal reached" : "In progress";

        summary += "<p><strong>" + dayName + ":</strong> " +
          minutes + " min — " + status + "</p>";
      }

      weeklySummary.innerHTML = summary;
    }

    const dashboardMinutes = document.getElementById("dashboardStudyMinutes");
    const dashboardGoal = document.getElementById("dashboardStudyGoal");
    const dashboardStreak = document.getElementById("dashboardStudyStreak");

    if (dashboardMinutes) dashboardMinutes.textContent = todayMinutes + " min";
    if (dashboardGoal) dashboardGoal.textContent = dailyStudyGoal + " min";
    if (dashboardStreak) {
      dashboardStreak.textContent =
        streak + (streak === 1 ? " day" : " days");
    }
  }

  const studyGoalForm = document.getElementById("studyGoalForm");

  if (studyGoalForm) {
    studyGoalForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const input = document.getElementById("dailyGoalInput");
      const newGoal = Number(input.value);

      if (!Number.isFinite(newGoal) || newGoal < 1 || newGoal > 1440) {
        alert("Please enter a goal between 1 and 1440 minutes.");
        return;
      }

      dailyStudyGoal = newGoal;
      localStorage.setItem(dailyGoalKey, String(dailyStudyGoal));
      updateStudyGoals();
    });
  }

  updateStudyGoals();



  const navigationButtons = document.querySelectorAll(".nav-btn");
  const pages = document.querySelectorAll(".page");

  navigationButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      const targetPage = button.dataset.page;

      navigationButtons.forEach(function (navButton) {
        navButton.classList.toggle(
          "active",
          navButton === button
        );
      });

      pages.forEach(function (page) {
        page.classList.toggle(
          "active-page",
          page.id === targetPage
        );
      });
    });
  });

  // ---------- SMART DEADLINE REMINDER ----------

  function renderDeadlineReminders() {
    const reminderList = getElement("deadlineReminderList");
    const overdueCount = getElement("overdueCount");
    const todayCount = getElement("todayCount");
    const upcomingCount = getElement("upcomingCount");

    if (
      !reminderList ||
      !overdueCount ||
      !todayCount ||
      !upcomingCount
    ) {
      return;
    }

    reminderList.replaceChildren();

    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    let overdue = 0;
    let dueToday = 0;
    let upcoming = 0;

    const datedTasks = tasks
      .filter(function (task) {
        return task.deadline && !task.completed;
      })
      .slice()
      .sort(function (a, b) {
        return a.deadline.localeCompare(b.deadline);
      });

    datedTasks.forEach(function (task) {
      const parts = task.deadline.split("-").map(Number);
      const deadlineDate = new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
      );

      if (deadlineDate < today) {
        overdue++;
      } else if (deadlineDate.getTime() === today.getTime()) {
        dueToday++;
      } else {
        upcoming++;
      }
    });

    overdueCount.textContent = overdue;
    todayCount.textContent = dueToday;
    upcomingCount.textContent = upcoming;

    if (datedTasks.length === 0) {
      reminderList.appendChild(
        createElement(
          "p",
          "empty-deadlines",
          "No pending assignments with deadlines. You're all caught up!"
        )
      );
      return;
    }

    datedTasks.forEach(function (task) {
      const parts = task.deadline.split("-").map(Number);
      const deadlineDate = new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
      );

      let status = "Upcoming";
      let statusClass = "deadline-soon";

      if (deadlineDate < today) {
        status = "Overdue";
        statusClass = "deadline-overdue";
      } else if (deadlineDate.getTime() === today.getTime()) {
        status = "Due Today";
        statusClass = "deadline-today";
      } else {
        const daysAway = Math.round(
          (deadlineDate - today) / 86400000
        );

        if (daysAway <= 3) {
          status = "Due in " + daysAway + " day(s)";
          statusClass = "deadline-soon";
        }
      }

      const item = createElement(
        "div",
        "deadline-item " + statusClass
      );

      const details = createElement("div", "");
      const name = createElement(
        "p",
        "deadline-task-name",
        task.name
      );
      const date = createElement(
        "p",
        "deadline-task-date",
        (task.subject || "General") +
          " • Deadline: " + task.deadline
      );

      const badge = createElement(
        "span",
        "deadline-badge",
        status
      );

      details.appendChild(name);
      details.appendChild(date);
      item.appendChild(details);
      item.appendChild(badge);
      reminderList.appendChild(item);
    });
  }

  // ---------- ASSIGNMENTS ----------

  const taskForm = getElement("taskForm");
  const taskList = getElement("taskList");

  function renderTasks() {
    if (!taskList) return;

    taskList.replaceChildren();

    if (tasks.length === 0) {
      taskList.appendChild(
        createElement(
          "p",
          "empty-message",
          "No assignments yet. Add your first task!"
        )
      );
    }

    tasks.forEach(function (task) {
      const item = createElement("div", "task-item");

      if (task.completed) {
        item.classList.add("completed");
      }

      const details = createElement("div", "task-details");

      details.appendChild(
        createElement("strong", "", task.name)
      );

      const subjectText = task.subject || "General";

      const deadlineText = task.deadline
        ? " • Due: " + task.deadline
        : "";

      details.appendChild(
        createElement(
          "p",
          "",
          subjectText + deadlineText
        )
      );

      const actions = createElement("div", "task-actions");

      const completeButton = createElement(
        "button",
        "complete-btn",
        task.completed ? "Completed ✓" : "Mark Done"
      );

      completeButton.type = "button";

      completeButton.addEventListener("click", function () {
        task.completed = !task.completed;

        saveData("studysphere_tasks", tasks);
        renderAll();
      });

      const deleteButton = createElement(
        "button",
        "delete-btn",
        "Delete"
      );

      deleteButton.type = "button";

      deleteButton.addEventListener("click", function () {
        tasks = tasks.filter(function (item) {
          return item.id !== task.id;
        });

        saveData("studysphere_tasks", tasks);
        renderAll();
      });

      actions.appendChild(completeButton);
      actions.appendChild(deleteButton);

      item.appendChild(details);
      item.appendChild(actions);

      taskList.appendChild(item);
    });
  }

  if (taskForm) {
    taskForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const nameInput = getElement("taskName");
      const subjectInput = getElement("taskSubject");
      const deadlineInput = getElement("taskDeadline");

      if (!nameInput || !nameInput.value.trim()) {
        alert("Please enter an assignment name.");
        return;
      }

      tasks.push({
        id: makeId(),
        name: nameInput.value.trim(),
        subject: subjectInput
          ? subjectInput.value.trim()
          : "",
        deadline: deadlineInput
          ? deadlineInput.value
          : "",
        completed: false
      });

      saveData("studysphere_tasks", tasks);

      taskForm.reset();
      renderAll();
    });
  }

  // ---------- STUDY PLANNER ----------

  const plannerForm = getElement("plannerForm");
  const scheduleList = getElement("scheduleList");

  function renderSchedules() {
    if (!scheduleList) return;

    scheduleList.replaceChildren();

    if (schedules.length === 0) {
      scheduleList.appendChild(
        createElement(
          "p",
          "empty-message",
          "No study sessions planned yet."
        )
      );
    }

    const sortedSchedules = schedules.slice().sort(
      function (a, b) {
        return (a.date + a.time).localeCompare(
          b.date + b.time
        );
      }
    );

    sortedSchedules.forEach(function (session) {
      const item = createElement("div", "schedule-item");

      const details = createElement(
        "div",
        "schedule-details"
      );

      details.appendChild(
        createElement("strong", "", session.subject)
      );

      details.appendChild(
        createElement(
          "p",
          "",
          session.date + " at " + session.time +
          " • " + session.duration + " minutes"
        )
      );

      const deleteButton = createElement(
        "button",
        "delete-btn",
        "Delete"
      );

      deleteButton.type = "button";

      deleteButton.addEventListener("click", function () {
        schedules = schedules.filter(function (entry) {
          return entry.id !== session.id;
        });

        saveData("studysphere_schedules", schedules);
        renderSchedules();
      });

      item.appendChild(details);
      item.appendChild(deleteButton);

      scheduleList.appendChild(item);
    });
  }

  if (plannerForm) {
    plannerForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const subject = getElement("plannerSubject");
      const date = getElement("plannerDate");
      const time = getElement("plannerTime");
      const duration = getElement("plannerDuration");

      if (
        !subject || !subject.value.trim() ||
        !date || !date.value ||
        !time || !time.value ||
        !duration || Number(duration.value) <= 0
      ) {
        alert("Please complete all study session fields.");
        return;
      }

      schedules.push({
        id: makeId(),
        subject: subject.value.trim(),
        date: date.value,
        time: time.value,
        duration: Number(duration.value)
      });

      saveData("studysphere_schedules", schedules);

      plannerForm.reset();
      renderSchedules();
    });
  }

  // ---------- FLASHCARDS ----------

  const flashcardForm = getElement("flashcardForm");
  const flashcardList = getElement("flashcardList");

  function renderFlashcards() {
    if (!flashcardList) return;

    flashcardList.replaceChildren();

    if (flashcards.length === 0) {
      flashcardList.appendChild(
        createElement(
          "p",
          "empty-message",
          "Create flashcards to review your lessons."
        )
      );
    }

    flashcards.forEach(function (card) {
      const item = createElement("div", "flashcard");

      const question = createElement(
        "strong",
        "",
        card.question
      );

      const answer = createElement(
        "p",
        "flashcard-answer",
        "Click to reveal the answer"
      );

      let answerVisible = false;

      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute(
        "aria-label",
        "Reveal flashcard answer"
      );

      function flipCard() {
        answerVisible = !answerVisible;

        answer.textContent = answerVisible
          ? card.answer
          : "Click to reveal the answer";
      }

      item.addEventListener("click", flipCard);

      item.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          flipCard();
        }
      });

      const deleteButton = createElement(
        "button",
        "delete-btn",
        "Delete"
      );

      deleteButton.type = "button";

      deleteButton.addEventListener("click", function (event) {
        event.stopPropagation();

        flashcards = flashcards.filter(function (entry) {
          return entry.id !== card.id;
        });

        saveData("studysphere_flashcards", flashcards);
        renderFlashcards();
      });

      item.appendChild(question);
      item.appendChild(answer);
      item.appendChild(deleteButton);

      flashcardList.appendChild(item);
    });
  }

  if (flashcardForm) {
    flashcardForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const question = getElement("flashQuestion");
      const answer = getElement("flashAnswer");

      if (
        !question || !question.value.trim() ||
        !answer || !answer.value.trim()
      ) {
        alert("Please enter both a question and an answer.");
        return;
      }

      flashcards.push({
        id: makeId(),
        question: question.value.trim(),
        answer: answer.value.trim()
      });

      saveData("studysphere_flashcards", flashcards);

      flashcardForm.reset();
      renderFlashcards();
    });
  }

// ---------- QUICK QUIZ ----------

const quizContent = getElement("quizContent");
const startQuizButton = getElement("startQuizBtn");
const quizCategory = getElement("quizCategory");

const quizQuestionBank = {
  science: [
   {
    question: "What is the basic unit of life?",
    options: ["Tissue", "Cell", "Organ", "Atom"],
    answer: 1,
    explanation: "The cell is the basic structural and functional unit of life."
},
{
    question: "Which organelle produces most of the energy in a cell?",
    options: ["Nucleus", "Ribosome", "Mitochondrion", "Golgi apparatus"],
    answer: 2,
    explanation: "Mitochondria produce most of the cell's ATP through cellular respiration."
},
{
    question: "Which organelle contains most of a cell's genetic material?",
    options: ["Nucleus", "Lysosome", "Vacuole", "Cell membrane"],
    answer: 0,
    explanation: "The nucleus contains most of the DNA in eukaryotic cells."
},
{
    question: "What is the process by which plants make their own food?",
    options: ["Respiration", "Fermentation", "Photosynthesis", "Digestion"],
    answer: 2,
    explanation: "Photosynthesis uses light energy to produce sugars from carbon dioxide and water."
},
{
    question: "Which gas do plants absorb during photosynthesis?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    answer: 1,
    explanation: "Plants use carbon dioxide as a raw material for photosynthesis."
},
{
    question: "Which pigment absorbs light for photosynthesis?",
    options: ["Hemoglobin", "Melanin", "Chlorophyll", "Keratin"],
    answer: 2,
    explanation: "Chlorophyll absorbs light energy used in photosynthesis."
},
{
    question: "What is the largest organ of the human body?",
    options: ["Liver", "Brain", "Skin", "Lungs"],
    answer: 2,
    explanation: "The skin is the largest organ of the human body."
},
{
    question: "Which organ pumps blood throughout the human body?",
    options: ["Lungs", "Heart", "Kidneys", "Stomach"],
    answer: 1,
    explanation: "The heart pumps blood through the circulatory system."
},
{
    question: "Which blood cells help defend the body against infection?",
    options: ["Red blood cells", "Platelets", "White blood cells", "Plasma cells only"],
    answer: 2,
    explanation: "White blood cells are important components of the immune system."
},
{
    question: "Which blood component helps with clotting?",
    options: ["Platelets", "Red blood cells", "Plasma water", "Hemoglobin"],
    answer: 0,
    explanation: "Platelets help form clots that reduce bleeding."
},
{
    question: "Which organs filter wastes from the blood to produce urine?",
    options: ["Lungs", "Kidneys", "Intestines", "Pancreas"],
    answer: 1,
    explanation: "The kidneys filter blood and produce urine."
},
{
    question: "Where does most nutrient absorption occur in the digestive system?",
    options: ["Stomach", "Esophagus", "Small intestine", "Large intestine"],
    answer: 2,
    explanation: "Most nutrient absorption occurs in the small intestine."
},
{
    question: "Which organ produces bile?",
    options: ["Pancreas", "Liver", "Stomach", "Kidney"],
    answer: 1,
    explanation: "The liver produces bile, which helps the body digest fats."
},
{
    question: "What is the main function of red blood cells?",
    options: ["Fight infections", "Carry oxygen", "Digest food", "Produce hormones"],
    answer: 1,
    explanation: "Hemoglobin in red blood cells carries oxygen."
},
{
    question: "Which part of the nervous system includes the brain and spinal cord?",
    options: ["Peripheral nervous system", "Central nervous system", "Digestive system", "Endocrine system"],
    answer: 1,
    explanation: "The central nervous system consists of the brain and spinal cord."
},
{
    question: "What is the basic unit of heredity?",
    options: ["Gene", "Tissue", "Organ", "Protein"],
    answer: 0,
    explanation: "A gene is a segment of DNA that contributes to a heritable characteristic."
},
{
    question: "What does DNA stand for?",
    options: ["Dynamic Nuclear Acid", "Deoxyribonucleic Acid", "Double Nitrogen Atom", "Deoxygenated Nucleic Acid"],
    answer: 1,
    explanation: "DNA stands for deoxyribonucleic acid."
},
{
    question: "Which molecule carries genetic instructions in most living organisms?",
    options: ["DNA", "Glucose", "Water", "ATP only"],
    answer: 0,
    explanation: "DNA stores the genetic instructions used by living organisms."
},
{
    question: "What is the process by which a cell divides into two genetically similar daughter cells?",
    options: ["Meiosis", "Mitosis", "Fertilization", "Pollination"],
    answer: 1,
    explanation: "Mitosis generally produces two genetically similar daughter cells."
},
{
    question: "Which type of cell division produces gametes?",
    options: ["Mitosis", "Meiosis", "Binary fission only", "Budding"],
    answer: 1,
    explanation: "Meiosis reduces the chromosome number to produce haploid cells."
},
{
    question: "Which kingdom includes mushrooms?",
    options: ["Animalia", "Plantae", "Fungi", "Protista"],
    answer: 2,
    explanation: "Mushrooms belong to the kingdom Fungi."
},
{
    question: "Which organisms are responsible for converting atmospheric nitrogen into usable compounds in some ecosystems?",
    options: ["Certain bacteria", "All mammals", "Viruses only", "Most insects"],
    answer: 0,
    explanation: "Certain bacteria perform nitrogen fixation."
},
{
    question: "What is an organism that makes its own food called?",
    options: ["Consumer", "Decomposer", "Autotroph", "Parasite"],
    answer: 2,
    explanation: "Autotrophs produce organic food from inorganic substances using light or chemical energy."
},
{
    question: "What role do decomposers play in an ecosystem?",
    options: ["Create sunlight", "Break down dead matter", "Stop all nutrient cycling", "Produce rocks"],
    answer: 1,
    explanation: "Decomposers break down organic matter and return nutrients to the environment."
},
{
    question: "What is the original source of energy for most ecosystems?",
    options: ["The Moon", "The Sun", "Earth's core", "Ocean tides only"],
    answer: 1,
    explanation: "Sunlight powers photosynthesis, supporting most food webs."
},
{
    question: "What do arrows in a food chain usually represent?",
    options: ["The direction of energy transfer", "The size of organisms", "The age of organisms", "The direction of animal movement"],
    answer: 0,
    explanation: "Arrows show the direction in which energy moves between organisms."
},
{
    question: "Which term describes all the populations living and interacting in an area?",
    options: ["Community", "Individual", "Biome only", "Species"],
    answer: 0,
    explanation: "A community consists of interacting populations of different species."
},
{
    question: "What is biodiversity?",
    options: ["The variety of life", "The amount of rainfall only", "The number of rocks", "The temperature of an area"],
    answer: 0,
    explanation: "Biodiversity refers to the variety of living organisms."
},
{
    question: "Which process describes the gradual change in a biological community over time?",
    options: ["Erosion", "Ecological succession", "Condensation", "Combustion"],
    answer: 1,
    explanation: "Ecological succession describes changes in community composition over time."
},
{
    question: "Which gas is most abundant in Earth's atmosphere?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Argon"],
    answer: 2,
    explanation: "Nitrogen makes up about 78% of Earth's atmosphere."
},
{
    question: "What is the chemical formula for water?",
    options: ["CO2", "H2O", "O2", "NaCl"],
    answer: 1,
    explanation: "A water molecule contains two hydrogen atoms and one oxygen atom."
},
{
    question: "What is the chemical symbol for oxygen?",
    options: ["Ox", "O", "Og", "Oy"],
    answer: 1,
    explanation: "O is the chemical symbol for oxygen."
},
{
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    answer: 2,
    explanation: "Gold's symbol is Au, derived from the Latin word aurum."
},
{
    question: "What is the atomic number of carbon?",
    options: ["4", "6", "8", "12"],
    answer: 1,
    explanation: "Carbon has six protons, so its atomic number is 6."
},
{
    question: "Which subatomic particle has a negative electric charge?",
    options: ["Proton", "Neutron", "Electron", "Nucleus"],
    answer: 2,
    explanation: "Electrons carry a negative electric charge."
},
{
    question: "Which subatomic particle has a positive electric charge?",
    options: ["Electron", "Proton", "Neutron", "Photon"],
    answer: 1,
    explanation: "Protons carry a positive electric charge."
},
{
    question: "Which subatomic particle has no electric charge?",
    options: ["Proton", "Electron", "Neutron", "Ion"],
    answer: 2,
    explanation: "Neutrons are electrically neutral."
},
{
    question: "What is the pH of a neutral solution at about 25°C?",
    options: ["0", "3", "7", "14"],
    answer: 2,
    explanation: "At about 25°C, a neutral aqueous solution has a pH of 7."
},
{
    question: "A substance with a pH below 7 is generally considered what?",
    options: ["Acidic", "Basic", "Always neutral", "Metallic"],
    answer: 0,
    explanation: "At about 25°C, acidic aqueous solutions have pH values below 7."
},
{
    question: "What is the chemical formula for table salt?",
    options: ["HCl", "NaCl", "KClO3", "CaCO3"],
    answer: 1,
    explanation: "Table salt is primarily sodium chloride, NaCl."
},
{
    question: "What is the smallest unit of an element that retains its chemical identity?",
    options: ["Atom", "Tissue", "Cell", "Mixture"],
    answer: 0,
    explanation: "An atom is the smallest unit of an element that retains its chemical identity."
},
{
    question: "What is a substance made of two or more elements chemically combined called?",
    options: ["Mixture", "Compound", "Solution only", "Suspension"],
    answer: 1,
    explanation: "A compound contains elements chemically bonded in fixed proportions."
},
{
    question: "Which state of matter has a definite volume but takes the shape of its container?",
    options: ["Solid", "Liquid", "Gas", "Plasma only"],
    answer: 1,
    explanation: "Liquids have a definite volume but take the shape of their container."
},
{
    question: "Which state of matter has neither a definite shape nor a definite volume?",
    options: ["Solid", "Liquid", "Gas", "Crystal"],
    answer: 2,
    explanation: "A gas expands to fill its container."
},
{
    question: "What is the change from liquid to gas called?",
    options: ["Freezing", "Condensation", "Vaporization", "Deposition"],
    answer: 2,
    explanation: "Vaporization includes evaporation and boiling."
},
{
    question: "What is the change from gas to liquid called?",
    options: ["Melting", "Condensation", "Sublimation", "Freezing"],
    answer: 1,
    explanation: "Condensation occurs when a gas changes into a liquid."
},
{
    question: "Which law states that matter is conserved during an ordinary chemical reaction?",
    options: ["Law of Conservation of Mass", "Newton's First Law", "Ohm's Law", "Boyle's Law"],
    answer: 0,
    explanation: "The law of conservation of mass states that total mass remains constant in a closed system during a chemical reaction."
},
{
    question: "What is a chemical reaction?",
    options: ["A change that forms new substances", "A change in location only", "A change in size only", "A process that always freezes matter"],
    answer: 0,
    explanation: "Chemical reactions rearrange atoms to form new substances."
},
{
    question: "Which gas is commonly produced when an acid reacts with many metals?",
    options: ["Hydrogen", "Helium", "Neon", "Argon"],
    answer: 0,
    explanation: "Many acids react with reactive metals to release hydrogen gas."
},
{
    question: "What is the SI unit of force?",
    options: ["Joule", "Watt", "Newton", "Pascal"],
    answer: 2,
    explanation: "Force is measured in newtons."
},
{
    question: "What is the SI unit of energy?",
    options: ["Joule", "Newton", "Ampere", "Meter"],
    answer: 0,
    explanation: "Energy is measured in joules."
},
{
    question: "What is the SI unit of power?",
    options: ["Volt", "Watt", "Ohm", "Kilogram"],
    answer: 1,
    explanation: "Power is measured in watts."
},
{
    question: "Which law describes the relationship between force, mass, and acceleration?",
    options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Kepler's First Law"],
    answer: 1,
    explanation: "Newton's Second Law is commonly expressed as F = ma."
},
{
    question: "What is the approximate acceleration due to gravity near Earth's surface?",
    options: ["1.6 m/s²", "5.0 m/s²", "9.8 m/s²", "20 m/s²"],
    answer: 2,
    explanation: "The standard approximate value near Earth's surface is 9.8 m/s²."
},
{
    question: "What is the tendency of an object to resist changes in its motion called?",
    options: ["Inertia", "Density", "Pressure", "Buoyancy"],
    answer: 0,
    explanation: "Inertia is an object's resistance to changes in its state of motion."
},
{
    question: "What is the SI unit of electric current?",
    options: ["Volt", "Ampere", "Ohm", "Watt"],
    answer: 1,
    explanation: "Electric current is measured in amperes."
},
{
    question: "What is the SI unit of electrical resistance?",
    options: ["Ampere", "Coulomb", "Ohm", "Tesla"],
    answer: 2,
    explanation: "Electrical resistance is measured in ohms."
},
{
    question: "Which instrument measures electric current?",
    options: ["Voltmeter", "Ammeter", "Thermometer", "Barometer"],
    answer: 1,
    explanation: "An ammeter measures electric current."
},
{
    question: "Which instrument measures voltage?",
    options: ["Ammeter", "Voltmeter", "Hygrometer", "Anemometer"],
    answer: 1,
    explanation: "A voltmeter measures potential difference, or voltage."
},
{
    question: "What type of energy is stored in a stretched spring?",
    options: ["Chemical energy", "Elastic potential energy", "Sound energy", "Nuclear energy"],
    answer: 1,
    explanation: "A stretched or compressed spring stores elastic potential energy."
},
{
    question: "Which type of wave requires a medium to travel?",
    options: ["Radio wave", "Light wave", "Sound wave", "X-ray"],
    answer: 2,
    explanation: "Sound is a mechanical wave and requires a medium."
},
{
    question: "Can sound travel through a vacuum?",
    options: ["Yes, at any speed", "No", "Only if it is loud", "Only during daytime"],
    answer: 1,
    explanation: "Sound requires particles to transmit vibrations, and a vacuum lacks them."
},
{
    question: "Which electromagnetic wave has the longest wavelength among these options?",
    options: ["Gamma rays", "X-rays", "Visible light", "Radio waves"],
    answer: 3,
    explanation: "Radio waves have longer wavelengths than visible light, X-rays, and gamma rays."
},
{
    question: "What causes the seasons on Earth?",
    options: ["Earth's changing distance from the Sun alone", "Earth's axial tilt as it orbits the Sun", "The Moon blocking sunlight", "Changes in Earth's rotation speed each month"],
    answer: 1,
    explanation: "Earth's axial tilt changes the angle and duration of sunlight during its orbit."
},
{
    question: "What causes day and night?",
    options: ["Earth's rotation", "Earth's revolution around the Sun", "The Moon's revolution", "Ocean tides"],
    answer: 0,
    explanation: "Earth's rotation causes different regions to face toward or away from the Sun."
},
{
    question: "What is Earth's natural satellite?",
    options: ["Mars", "The Moon", "Venus", "The Sun"],
    answer: 1,
    explanation: "The Moon is Earth's natural satellite."
},
{
    question: "Which planet is closest to the Sun?",
    options: ["Venus", "Earth", "Mercury", "Mars"],
    answer: 2,
    explanation: "Mercury is the closest planet to the Sun."
},
{
    question: "Which planet is known for its prominent ring system?",
    options: ["Mercury", "Saturn", "Mars", "Venus"],
    answer: 1,
    explanation: "Saturn is especially known for its extensive and bright ring system."
},
{
    question: "What is the name of the galaxy that contains our Solar System?",
    options: ["Andromeda", "Milky Way", "Whirlpool", "Sombrero"],
    answer: 1,
    explanation: "Our Solar System is located in the Milky Way galaxy."
},
{
    question: "What is a star primarily made of?",
    options: ["Hot gas and plasma", "Solid rock", "Liquid water", "Frozen nitrogen"],
    answer: 0,
    explanation: "Stars consist mainly of hot plasma, primarily hydrogen and helium."
},
{
    question: "What process releases energy in the core of the Sun?",
    options: ["Chemical combustion", "Nuclear fusion", "Nuclear fission only", "Evaporation"],
    answer: 1,
    explanation: "The Sun releases energy through nuclear fusion, mainly combining hydrogen into helium."
},
{
    question: "What is the layer of gases surrounding Earth called?",
    options: ["Lithosphere", "Atmosphere", "Hydrosphere", "Mantle"],
    answer: 1,
    explanation: "The atmosphere is the layer of gases surrounding Earth."
},
{
    question: "Which atmospheric layer contains most weather events?",
    options: ["Troposphere", "Mesosphere", "Thermosphere", "Exosphere"],
    answer: 0,
    explanation: "Most weather occurs in the troposphere."
},
{
    question: "What is the continuous movement of water between Earth's surface and atmosphere called?",
    options: ["Rock cycle", "Water cycle", "Carbon dating", "Plate cycle"],
    answer: 1,
    explanation: "The water cycle includes evaporation, condensation, precipitation, and other processes."
},
{
    question: "What is water falling from clouds as rain, snow, or hail called?",
    options: ["Evaporation", "Precipitation", "Transpiration", "Infiltration"],
    answer: 1,
    explanation: "Rain, snow, sleet, and hail are forms of precipitation."
},
{
    question: "What is the breaking down of rocks at Earth's surface called?",
    options: ["Weathering", "Condensation", "Photosynthesis", "Radiation"],
    answer: 0,
    explanation: "Weathering breaks rocks down physically or chemically."
},
{
    question: "What is the movement of weathered material from one place to another called?",
    options: ["Erosion", "Freezing", "Crystallization", "Fusion"],
    answer: 0,
    explanation: "Erosion transports rock and soil by water, wind, ice, or gravity."
},
{
    question: "Which layer of Earth is the outermost solid layer?",
    options: ["Inner core", "Outer core", "Mantle", "Crust"],
    answer: 3,
    explanation: "The crust is Earth's outermost solid layer."
},
{
    question: "What causes most earthquakes?",
    options: ["Movement along faults in Earth's crust", "Cloud formation", "Ocean evaporation", "Changes in the Moon's color"],
    answer: 0,
    explanation: "Most earthquakes occur when stress is released by sudden movement along faults."
},
{
    question: "What is molten rock beneath Earth's surface called?",
    options: ["Lava", "Magma", "Ash", "Sediment"],
    answer: 1,
    explanation: "Molten rock below Earth's surface is called magma; at the surface, it is called lava."
},
{
    question: "What is the process by which plants release water vapor through their leaves?",
    options: ["Transpiration", "Respiration only", "Pollination", "Germination"],
    answer: 0,
    explanation: "Transpiration is the release of water vapor from plants, mainly through leaf stomata."
},
{
    question: "What is pollination?",
    options: ["The transfer of pollen to a flower's stigma", "The production of soil", "The absorption of minerals by roots", "The release of oxygen from animals"],
    answer: 0,
    explanation: "Pollination transfers pollen to the stigma of a flower."
},
{
    question: "Which plant structure mainly absorbs water and minerals from the soil?",
    options: ["Flower", "Root", "Fruit", "Petal"],
    answer: 1,
    explanation: "Roots absorb water and minerals and help anchor plants."
},
{
    question: "What is the loss of water vapor from plant leaves mainly through tiny openings called?",
    options: ["Transpiration", "Fermentation", "Digestion", "Germination"],
    answer: 0,
    explanation: "Transpiration occurs mainly through tiny leaf openings called stomata."
},
{
    question: "Which organism is a primary consumer in a grassland food chain?",
    options: ["Grass", "Grasshopper", "Hawk", "Fungus"],
    answer: 1,
    explanation: "A grasshopper that eats grass is a primary consumer."
},
{
    question: "Which term describes an animal that eats both plants and animals?",
    options: ["Herbivore", "Carnivore", "Omnivore", "Producer"],
    answer: 2,
    explanation: "Omnivores consume both plant and animal matter."
},
{
    question: "Which term describes an animal that eats only plants?",
    options: ["Herbivore", "Carnivore", "Omnivore", "Decomposer"],
    answer: 0,
    explanation: "Herbivores feed primarily on plants or other producers."
},
{
    question: "What is the interaction in which both species benefit?",
    options: ["Parasitism", "Mutualism", "Competition", "Predation"],
    answer: 1,
    explanation: "Mutualism is an interaction in which both species benefit."
},
{
    question: "Which term describes an organism that lives on or in a host and benefits at the host's expense?",
    options: ["Producer", "Parasite", "Pollinator", "Decomposer"],
    answer: 1,
    explanation: "A parasite benefits while harming or imposing a cost on its host."
},
{
    question: "What is an adaptation?",
    options: ["An inherited feature that helps an organism survive or reproduce", "A temporary change in the weather", "A type of rock", "The daily movement of clouds"],
    answer: 0,
    explanation: "Adaptations are inherited characteristics that can improve survival or reproductive success."
},
{
    question: "What is natural selection?",
    options: ["A process where heritable traits affecting reproductive success change in frequency over generations", "The random movement of clouds", "The formation of all rocks", "The daily rotation of Earth"],
    answer: 0,
    explanation: "Natural selection favors heritable traits associated with greater reproductive success in a particular environment."
},
{
    question: "Which scientist is strongly associated with the theory of evolution by natural selection?",
    options: ["Charles Darwin", "Isaac Newton", "Gregor Mendel", "Louis Pasteur"],
    answer: 0,
    explanation: "Charles Darwin developed a major scientific explanation of evolution by natural selection."
},
{
    question: "Who is known for foundational experiments on inheritance using pea plants?",
    options: ["Gregor Mendel", "Albert Einstein", "Marie Curie", "Galileo Galilei"],
    answer: 0,
    explanation: "Gregor Mendel's pea plant experiments helped establish foundational principles of inheritance."
},
{
    question: "What is a fossil?",
    options: ["Preserved evidence of past life", "A newly formed cloud", "A type of living cell", "A chemical element"],
    answer: 0,
    explanation: "Fossils preserve remains, traces, or other evidence of organisms from the past."
},
{
    question: "What does a thermometer measure?",
    options: ["Pressure", "Temperature", "Mass", "Electric current"],
    answer: 1,
    explanation: "A thermometer measures temperature."
},
{
    question: "What does a barometer measure?",
    options: ["Atmospheric pressure", "Wind direction", "Humidity only", "Distance"],
    answer: 0,
    explanation: "A barometer measures atmospheric pressure."
},
{
    question: "What does an anemometer measure?",
    options: ["Wind speed", "Rainfall acidity", "Earthquake magnitude", "Water depth only"],
    answer: 0,
    explanation: "An anemometer measures wind speed."
},
{
    question: "What is a testable explanation for an observation called?",
    options: ["Hypothesis", "Conclusion", "Law of motion", "Data table"],
    answer: 0,
    explanation: "A hypothesis is a proposed explanation that can be tested."
},
{
    question: "In an experiment, what is the variable deliberately changed by the researcher?",
    options: ["Dependent variable", "Independent variable", "Controlled variable", "Constant result"],
    answer: 1,
    explanation: "The independent variable is deliberately changed to examine its effect."
},
{
    question: "In an experiment, what is the variable measured as an outcome?",
    options: ["Independent variable", "Dependent variable", "Control group", "Constant"],
    answer: 1,
    explanation: "The dependent variable is measured to assess the effect of the independent variable."
},
{
    question: "Why do scientists repeat experiments?",
    options: ["To improve confidence in the reliability of results", "To guarantee every hypothesis is correct", "To remove the need for data", "To make results agree with expectations"],
    answer: 0,
    explanation: "Repeated experiments help assess whether results are consistent and reliable."
},
{
    question: "Which practice is most appropriate when reporting scientific results?",
    options: ["Hide results that disagree with expectations", "Report methods and results honestly", "Change measurements to look better", "Ignore evidence from other researchers"],
    answer: 1,
    explanation: "Scientific integrity requires honest reporting of methods, data, and results."
},
{
    question: "Which renewable energy source uses moving air to generate electricity?",
    options: ["Wind energy", "Coal", "Diesel", "Natural gas"],
    answer: 0,
    explanation: "Wind turbines convert energy from moving air into electrical energy."
},
{
    question: "Which of these is a nonrenewable fossil fuel?",
    options: ["Sunlight", "Wind", "Coal", "Geothermal heat"],
    answer: 2,
    explanation: "Coal is a fossil fuel that forms over geological timescales."
},
{
    question: "Which gas is a major contributor to human-caused global warming?",
    options: ["Carbon dioxide", "Neon", "Helium", "Hydrogen"],
    answer: 0,
    explanation: "Carbon dioxide is a major greenhouse gas emitted by human activities."
},
{
    question: "What is the main purpose of the ozone layer?",
    options: ["Absorb much of the Sun's harmful ultraviolet radiation", "Produce all of Earth's oxygen", "Stop Earth's rotation", "Create ocean currents directly"],
    answer: 0,
    explanation: "Stratospheric ozone absorbs much of the Sun's harmful ultraviolet radiation."
},
{
    question: "Which action can help reduce plastic pollution?",
    options: ["Use reusable items and dispose of waste properly", "Throw plastic into rivers", "Burn all household waste outdoors", "Leave trash on beaches"],
    answer: 0,
    explanation: "Reducing single-use plastics and disposing of waste properly can limit plastic pollution."
},
{
    question: "Which practice helps conserve soil?",
    options: ["Planting cover crops", "Removing all vegetation from slopes", "Excessive overgrazing", "Dumping chemicals on farmland"],
    answer: 0,
    explanation: "Cover crops help protect soil from erosion and can improve soil health."
},
{
    question: "What is the main purpose of vaccination?",
    options: ["Train the immune system to recognize a pathogen", "Replace all white blood cells", "Guarantee that illness is impossible", "Destroy every microorganism in the body"],
    answer: 0,
    explanation: "Vaccines train the immune system to recognize specific pathogens and reduce the risk of disease."
},
{
    question: "Which microorganism causes malaria?",
    options: ["Plasmodium parasite", "Influenza virus", "Amoeba that causes all diarrhea", "Baker's yeast"],
    answer: 0,
    explanation: "Malaria is caused by Plasmodium parasites transmitted by infected female Anopheles mosquitoes."
},
{
    question: "Which of the following is a bacterial disease?",
    options: ["Tuberculosis", "Measles", "Influenza", "Chickenpox"],
    answer: 0,
    explanation: "Tuberculosis is caused by the bacterium Mycobacterium tuberculosis."
},
{
    question: "What is the primary function of vaccines?",
    options: ["Support immune protection against specific diseases", "Provide all nutrients needed by the body", "Replace sleep", "Cure every existing infection instantly"],
    answer: 0,
    explanation: "Vaccines help the immune system develop protection against specific diseases."
},
{
    question: "What is homeostasis?",
    options: ["Maintaining relatively stable internal conditions", "The movement of planets", "The breakdown of rocks", "The production of sunlight"],
    answer: 0,
    explanation: "Homeostasis helps organisms maintain stable internal conditions despite external changes."
},
{
    question: "Which hormone helps lower blood glucose levels?",
    options: ["Insulin", "Adrenaline", "Melatonin", "Thyroxine only"],
    answer: 0,
    explanation: "Insulin helps cells take up glucose and helps regulate blood glucose levels."
},
{
    question: "Which vitamin can the human body produce in the skin when exposed to suitable ultraviolet B radiation?",
    options: ["Vitamin A", "Vitamin C", "Vitamin D", "Vitamin B12"],
    answer: 2,
    explanation: "The skin can synthesize vitamin D when exposed to ultraviolet B radiation."
},
{
    question: "What is the main function of the lungs?",
    options: ["Exchange oxygen and carbon dioxide", "Filter urine", "Produce bile", "Pump blood"],
    answer: 0,
    explanation: "The lungs exchange oxygen and carbon dioxide between the air and blood."
},
{
    question: "Which structure prevents food from entering the windpipe during swallowing?",
    options: ["Epiglottis", "Diaphragm", "Rib cage", "Alveolus"],
    answer: 0,
    explanation: "The epiglottis helps direct food away from the airway during swallowing."
},
{
    question: "What is the main function of enzymes in living organisms?",
    options: ["Speed up chemical reactions", "Stop all metabolism", "Replace genetic material", "Turn every substance into water"],
    answer: 0,
    explanation: "Enzymes act as biological catalysts, speeding up chemical reactions."
},
{
    question: "What is an ecosystem?",
    options: ["Living organisms interacting with one another and their physical environment", "Only the animals in an area", "Only the soil in a forest", "A single individual organism"],
    answer: 0,
    explanation: "An ecosystem includes organisms and the nonliving environment with which they interact."
},
{
    question: "Which natural event can rapidly release volcanic ash and gases into the atmosphere?",
    options: ["Volcanic eruption", "Dew formation", "Pollination", "Ocean evaporation"],
    answer: 0,
    explanation: "Volcanic eruptions can release ash, gases, and other materials into the atmosphere."
},
{
    question: "What is the process of liquid water changing into water vapor at the surface called?",
    options: ["Evaporation", "Condensation", "Freezing", "Precipitation"],
    answer: 0,
    explanation: "Evaporation occurs when molecules escape from a liquid into the gas phase."
},
{
    question: "What is the transfer of heat through direct contact called?",
    options: ["Conduction", "Convection", "Radiation", "Reflection"],
    answer: 0,
    explanation: "Conduction transfers thermal energy through direct particle interactions."
},
{
    question: "What is heat transfer by the movement of fluids called?",
    options: ["Conduction", "Convection", "Refraction", "Insulation"],
    answer: 1,
    explanation: "Convection transfers heat through the bulk movement of liquids or gases."
},
{
    question: "How does energy from the Sun travel through the vacuum of space?",
    options: ["Conduction", "Convection", "Electromagnetic radiation", "Sound waves"],
    answer: 2,
    explanation: "Electromagnetic radiation can travel through a vacuum."
},
{
    question: "What is the bending of light as it passes between materials called?",
    options: ["Reflection", "Refraction", "Diffusion", "Conduction"],
    answer: 1,
    explanation: "Refraction is the change in direction of light due to a change in wave speed between materials."
},
{
    question: "What is the bouncing of light off a surface called?",
    options: ["Reflection", "Refraction", "Absorption only", "Sublimation"],
    answer: 0,
    explanation: "Reflection occurs when light returns from a surface."
},
{
    question: "Which simple machine consists of a rigid bar that turns around a fulcrum?",
    options: ["Lever", "Pulley only", "Wedge", "Screw"],
    answer: 0,
    explanation: "A lever is a rigid bar that rotates around a fulcrum."
},
{
    question: "What is density?",
    options: ["Mass per unit volume", "Volume per unit temperature", "Force per unit time", "Distance per unit speed"],
    answer: 0,
    explanation: "Density is calculated as mass divided by volume."
},
{
    question: "What is the SI unit of pressure?",
    options: ["Pascal", "Joule", "Watt", "Newton-meter"],
    answer: 0,
    explanation: "Pressure is measured in pascals."
},
{
    question: "What causes an object to float in a fluid?",
    options: ["The buoyant force can balance its weight", "Gravity disappears", "Its mass becomes zero", "The fluid has no density"],
    answer: 0,
    explanation: "An object floats when the buoyant force balances its weight."
},
{
    question: "Which instrument is used to observe very small objects such as cells?",
    options: ["Microscope", "Telescope", "Barometer", "Compass"],
    answer: 0,
    explanation: "A microscope magnifies small objects so they can be observed in detail."
},
{
    question: "Which instrument is commonly used to observe distant celestial objects?",
    options: ["Microscope", "Telescope", "Thermometer", "Ammeter"],
    answer: 1,
    explanation: "A telescope collects and focuses light or other electromagnetic radiation from distant objects."
},
{
    question: "What is the process of a liquid changing into a solid called?",
    options: ["Freezing", "Melting", "Evaporation", "Sublimation"],
    answer: 0,
    explanation: "Freezing is the transition from liquid to solid."
},
{
    question: "Which term describes a substance that speeds up a chemical reaction without being consumed overall?",
    options: ["Catalyst", "Reactant", "Solvent only", "Precipitate"],
    answer: 0,
    explanation: "A catalyst increases reaction rate without being consumed overall."
},
{
    question: "Which particle is emitted during beta-minus radioactive decay?",
    options: ["Electron", "Neutron only", "Water molecule", "Helium atom"],
    answer: 0,
    explanation: "Beta-minus decay emits an electron and an antineutrino."
},
{
    question: "Which scientist is associated with the three laws of motion?",
    options: ["Isaac Newton", "Charles Darwin", "Dmitri Mendeleev", "Gregor Mendel"],
    answer: 0,
    explanation: "Isaac Newton formulated the three classical laws of motion."
},
{
    question: "What is the main source of energy that drives Earth's weather and climate system?",
    options: ["The Sun", "The Moon alone", "Earth's magnetic field", "Lightning"],
    answer: 0,
    explanation: "Solar energy drives atmospheric circulation, evaporation, and many weather processes."
},
{
    question: "What is the name of the boundary where two tectonic plates meet?",
    options: ["Plate boundary", "Cloud front", "River delta", "Ocean gyre"],
    answer: 0,
    explanation: "A plate boundary is where two tectonic plates interact."
},
{
    question: "What type of plate boundary occurs when two tectonic plates move apart?",
    options: ["Divergent", "Convergent", "Transform", "Stationary"],
    answer: 0,
    explanation: "At a divergent boundary, tectonic plates move away from each other."
},
{
    question: "What type of plate boundary occurs when two plates move toward one another?",
    options: ["Divergent", "Convergent", "Transform", "Passive"],
    answer: 1,
    explanation: "At a convergent boundary, plates move toward each other."
},
{
    question: "Which process describes water soaking into the ground?",
    options: ["Infiltration", "Condensation", "Combustion", "Sublimation"],
    answer: 0,
    explanation: "Infiltration is the process by which water enters the soil."
},
{
    question: "What is the main purpose of scientific peer review?",
    options: ["To evaluate research quality before publication", "To guarantee a study can never be wrong", "To hide methods from other scientists", "To replace experiments"],
    answer: 0,
    explanation: "Peer review allows other experts to assess a study's methods, evidence, and conclusions."
}
],  

  mathematics: [
    {
      question: "what is the quare root of 81?",
    options: ["7", "8", "9", "10"],
    answer: 2,
    explanation: "9 × 9 = 81."
  },
  {
    question: "What is 3³?",
    options: ["9", "18", "27", "36"],
    answer: 2,
    explanation: "3³ = 3 × 3 × 3 = 27."
  },
  {
    question: "What is 25% of 200?",
    options: ["25", "40", "50", "75"],
    answer: 2,
    explanation: "0.25 × 200 = 50."
  },
  {
    question: "What is 0.75 expressed as a fraction in simplest form?",
    options: ["1/2", "2/3", "3/4", "4/5"],
    answer: 2,
    explanation: "0.75 = 75/100 = 3/4."
  },
  {
    question: "What is 2⁴?",
    options: ["8", "12", "16", "24"],
    answer: 2,
    explanation: "2⁴ = 2 × 2 × 2 × 2 = 16."
  },

  // 11–20: Fractions, Decimals, and Ratios
  {
    question: "What is 1/2 + 1/4?",
    options: ["1/6", "2/6", "3/4", "1"],
    answer: 2,
    explanation: "1/2 = 2/4, so 2/4 + 1/4 = 3/4."
  },
  {
    question: "What is 3/4 - 1/4?",
    options: ["1/4", "1/2", "2/3", "3/8"],
    answer: 1,
    explanation: "3/4 - 1/4 = 2/4 = 1/2."
  },
  {
    question: "What is 2/3 × 3/4?",
    options: ["1/2", "2/7", "5/12", "3/4"],
    answer: 0,
    explanation: "(2 × 3)/(3 × 4) = 6/12 = 1/2."
  },
  {
    question: "What is 1/2 ÷ 1/4?",
    options: ["1/8", "1/2", "2", "4"],
    answer: 2,
    explanation: "Dividing by 1/4 is multiplying by 4, so 1/2 × 4 = 2."
  },
  {
    question: "Convert 0.6 to a fraction in simplest form.",
    options: ["1/6", "2/3", "3/5", "6/5"],
    answer: 2,
    explanation: "0.6 = 6/10 = 3/5."
  },
  {
    question: "What is 3/5 expressed as a percentage?",
    options: ["30%", "50%", "60%", "75%"],
    answer: 2,
    explanation: "3/5 × 100% = 60%."
  },
  {
    question: "Simplify the ratio 12:18.",
    options: ["2:3", "3:4", "4:5", "6:9"],
    answer: 0,
    explanation: "Divide both terms by 6 to get 2:3."
  },
  {
    question: "What is 40% of 150?",
    options: ["40", "50", "60", "75"],
    answer: 2,
    explanation: "0.40 × 150 = 60."
  },
  {
    question: "What is 1.25 + 2.75?",
    options: ["3.50", "4.00", "4.25", "5.00"],
    answer: 1,
    explanation: "1.25 + 2.75 = 4.00."
  },
  {
    question: "A shirt costs ₱800 and has a 10% discount. What is the discount?",
    options: ["₱40", "₱60", "₱80", "₱100"],
    answer: 2,
    explanation: "10% of ₱800 is ₱80."
  },

  // 21–35: Algebra
  {
    question: "Solve for x: x + 7 = 15.",
    options: ["6", "7", "8", "9"],
    answer: 2,
    explanation: "Subtract 7 from both sides: x = 8."
  },
  {
    question: "Solve for x: 3x = 21.",
    options: ["6", "7", "8", "9"],
    answer: 1,
    explanation: "Divide both sides by 3: x = 7."
  },
  {
    question: "Solve for x: 2x + 4 = 14.",
    options: ["4", "5", "6", "7"],
    answer: 1,
    explanation: "Subtract 4, then divide by 2: x = 5."
  },
  {
    question: "Solve for x: 5x - 10 = 20.",
    options: ["4", "5", "6", "8"],
    answer: 2,
    explanation: "Add 10 and divide by 5: x = 6."
  },
  {
    question: "Simplify: 3x + 2x.",
    options: ["5", "5x", "6x", "6x²"],
    answer: 1,
    explanation: "Combine like terms: 3x + 2x = 5x."
  },
  {
    question: "Simplify: 4a + 3b - a + 2b.",
    options: ["3a + 5b", "5a + b", "7ab", "3a + b"],
    answer: 0,
    explanation: "Combine like terms: 4a - a = 3a and 3b + 2b = 5b."
  },
  {
    question: "Expand: 3(x + 4).",
    options: ["3x + 4", "3x + 7", "3x + 12", "7x"],
    answer: 2,
    explanation: "Distribute 3: 3(x + 4) = 3x + 12."
  },
  {
    question: "Factor: x² + 5x + 6.",
    options: ["(x + 1)(x + 6)", "(x + 2)(x + 3)", "(x - 2)(x - 3)", "(x + 5)(x + 1)"],
    answer: 1,
    explanation: "The numbers 2 and 3 multiply to 6 and add to 5."
  },
  {
    question: "Solve: x² = 49.",
    options: ["x = 7 only", "x = -7 only", "x = ±7", "x = 49"],
    answer: 2,
    explanation: "Both 7² and (-7)² equal 49."
  },
  {
    question: "What is the value of 2x + 3 when x = 4?",
    options: ["8", "9", "11", "14"],
    answer: 2,
    explanation: "Substitute x = 4: 2(4) + 3 = 11."
  },
  {
    question: "Solve: 4x + 8 = 0.",
    options: ["-4", "-2", "2", "4"],
    answer: 1,
    explanation: "4x = -8, so x = -2."
  },
  {
    question: "What is the coefficient of x in 9x + 5?",
    options: ["5", "9", "x", "14"],
    answer: 1,
    explanation: "The coefficient is the number multiplying x: 9."
  },
  {
    question: "Simplify: (x³)(x²).",
    options: ["x", "x⁵", "x⁶", "2x⁵"],
    answer: 1,
    explanation: "When multiplying powers with the same base, add exponents: x³ × x² = x⁵."
  },
  {
    question: "Simplify: x⁶ ÷ x², where x ≠ 0.",
    options: ["x³", "x⁴", "x⁸", "x¹²"],
    answer: 1,
    explanation: "When dividing powers with the same base, subtract exponents: x⁶ ÷ x² = x⁴."
  },
  {
    question: "Solve the system: x + y = 10 and x - y = 2.",
    options: ["x = 4, y = 6", "x = 6, y = 4", "x = 5, y = 5", "x = 8, y = 2"],
    answer: 1,
    explanation: "Adding the equations gives 2x = 12, so x = 6 and y = 4."
  },

  // 36–45: Geometry
  {
    question: "What is the sum of the interior angles of a triangle?",
    options: ["90°", "180°", "270°", "360°"],
    answer: 1,
    explanation: "The interior angles of every triangle add up to 180°."
  },
  {
    question: "What is the area of a rectangle with length 8 cm and width 5 cm?",
    options: ["13 cm²", "26 cm²", "40 cm²", "80 cm²"],
    answer: 2,
    explanation: "Area = length × width = 8 × 5 = 40 cm²."
  },
  {
    question: "What is the perimeter of a square with side length 6 cm?",
    options: ["12 cm", "18 cm", "24 cm", "36 cm"],
    answer: 2,
    explanation: "Perimeter = 4 × side = 4 × 6 = 24 cm."
  },
  {
    question: "What is the area of a triangle with base 10 cm and height 6 cm?",
    options: ["16 cm²", "30 cm²", "60 cm²", "120 cm²"],
    answer: 1,
    explanation: "Area = 1/2 × base × height = 1/2 × 10 × 6 = 30 cm²."
  },
  {
    question: "What is the circumference of a circle with radius 7 cm?",
    options: ["7π cm", "14π cm", "21π cm", "49π cm"],
    answer: 1,
    explanation: "Circumference = 2πr = 2π(7) = 14π cm."
  },
  {
    question: "What is the area of a circle with radius 3 cm?",
    options: ["6π cm²", "9π cm²", "12π cm²", "18π cm²"],
    answer: 1,
    explanation: "Area = πr² = π(3²) = 9π cm²."
  },
  {
    question: "A right triangle has legs of 3 cm and 4 cm. What is its hypotenuse?",
    options: ["5 cm", "6 cm", "7 cm", "8 cm"],
    answer: 0,
    explanation: "By the Pythagorean theorem, c² = 3² + 4² = 25, so c = 5 cm."
  },
  {
    question: "How many degrees are in a straight angle?",
    options: ["45°", "90°", "180°", "360°"],
    answer: 2,
    explanation: "A straight angle measures 180°."
  },
  {
    question: "What is the volume of a cube with side length 3 cm?",
    options: ["9 cm³", "18 cm³", "27 cm³", "36 cm³"],
    answer: 2,
    explanation: "Volume = side³ = 3³ = 27 cm³."
  },
  {
    question: "How many sides does a hexagon have?",
    options: ["5", "6", "7", "8"],
    answer: 1,
    explanation: "A hexagon is a polygon with six sides."
  },

  // 46–55: Trigonometry
  {
    question: "What is sin 30°?",
    options: ["0", "1/2", "√2/2", "1"],
    answer: 1,
    explanation: "The exact value of sin 30° is 1/2."
  },
  {
    question: "What is cos 60°?",
    options: ["0", "1/2", "√3/2", "1"],
    answer: 1,
    explanation: "The exact value of cos 60° is 1/2."
  },
  {
    question: "What is tan 45°?",
    options: ["0", "1/2", "1", "√3"],
    answer: 2,
    explanation: "tan 45° = sin 45° / cos 45° = 1."
  },
  {
    question: "Which ratio represents sine in a right triangle?",
    options: ["Adjacent / Hypotenuse", "Opposite / Hypotenuse", "Opposite / Adjacent", "Hypotenuse / Opposite"],
    answer: 1,
    explanation: "Sine = opposite side divided by hypotenuse."
  },
  {
    question: "Which ratio represents cosine in a right triangle?",
    options: ["Opposite / Hypotenuse", "Opposite / Adjacent", "Adjacent / Hypotenuse", "Hypotenuse / Adjacent"],
    answer: 2,
    explanation: "Cosine = adjacent side divided by hypotenuse."
  },
  {
    question: "Which ratio represents tangent in a right triangle?",
    options: ["Opposite / Adjacent", "Adjacent / Hypotenuse", "Opposite / Hypotenuse", "Hypotenuse / Opposite"],
    answer: 0,
    explanation: "Tangent = opposite side divided by adjacent side."
  },
  {
    question: "How many degrees are in a right angle?",
    options: ["45°", "60°", "90°", "180°"],
    answer: 2,
    explanation: "A right angle measures 90°."
  },
  {
    question: "What is sin 90°?",
    options: ["0", "1/2", "√3/2", "1"],
    answer: 3,
    explanation: "The exact value of sin 90° is 1."
  },
  {
    question: "What is cos 0°?",
    options: ["0", "1/2", "1", "Undefined"],
    answer: 2,
    explanation: "The exact value of cos 0° is 1."
  },
  {
    question: "A right triangle has an opposite side of 6 and a hypotenuse of 10. What is the sine of the angle?",
    options: ["0.4", "0.5", "0.6", "0.8"],
    answer: 2,
    explanation: "Sine = opposite / hypotenuse = 6/10 = 0.6."
  },

  // 56–65: Statistics
  {
    question: "What is the mean of 4, 6, and 8?",
    options: ["4", "5", "8", "6"],
    answer: 3,
    explanation: "The mean is (4 + 6 + 😎 / 3 = 6."
  },
  {
    question: "What is the median of 3, 7, and 9?",
    options: ["3", "7", "8", "9"],
    answer: 1,
    explanation: "The median is the middle value when the numbers are ordered: 7."
  },
  {
    question: "What is the mode of 2, 3, 3, 4, 5?",
    options: ["2", "3", "4", "5"],
    answer: 1,
    explanation: "The mode is the value that appears most often: 3."
  },
  {
    question: "What is the range of 5, 8, 12, and 15?",
    options: ["7", "10", "12", "15"],
    answer: 1,
    explanation: "Range = maximum - minimum = 15 - 5 = 10."
  },
  {
    question: "Which measure is found by adding all values and dividing by the number of values?",
    options: ["Mode", "Median", "Mean", "Range"],
    answer: 2,
    explanation: "The mean is the sum of the values divided by the number of values."
  },
  {
    question: "What is the median of 2, 4, 6, and 8?",
    options: ["4", "5", "6", "7"],
    answer: 1,
    explanation: "For four ordered values, the median is the average of the two middle values: (4 + 6) / 2 = 5."
  },
  {
    question: "What is the mean of 10, 20, 30, and 40?",
    options: ["20", "25", "30", "35"],
    answer: 1,
    explanation: "(10 + 20 + 30 + 40) / 4 = 25."
  },
  {
    question: "Which measure is least affected by extreme values?",
    options: ["Mean", "Median", "Range", "Maximum"],
    answer: 1,
    explanation: "The median is generally less affected by extreme values than the mean."
  },
  {
    question: "If every value in a data set increases by 5, what happens to the mean?",
    options: ["It decreases by 5", "It stays the same", "It increases by 5", "It doubles"],
    answer: 2,
    explanation: "Adding the same amount to every value increases the mean by that amount."
  },
  {
    question: "A student scores 80, 85, and 90. What is the mean score?",
    options: ["80", "83", "85", "90"],
    answer: 2,
    explanation: "(80 + 85 + 90) / 3 = 85."
  },

  // 66–75: Probability
  {
    question: "What is the probability of getting heads when tossing a fair coin?",
    options: ["0", "1/4", "1/2", "1"],
    answer: 2,
    explanation: "There are two equally likely outcomes, so P(heads) = 1/2."
  },
  {
    question: "What is the probability of rolling a 6 on a fair six-sided die?",
    options: ["1/2", "1/3", "1/6", "5/6"],
    answer: 2,
    explanation: "One of the six equally likely outcomes is 6, so the probability is 1/6."
  },
  {
    question: "A bag contains 3 red balls and 2 blue balls. What is the probability of drawing a red ball?",
    options: ["2/5", "3/5", "1/2", "3/2"],
    answer: 1,
    explanation: "There are 3 red balls out of 5 total balls, so the probability is 3/5."
  },
  {
    question: "What is the probability of an impossible event?",
    options: ["0", "1/4", "1/2", "1"],
    answer: 0,
    explanation: "An impossible event has probability 0."
  },
  {
    question: "What is the probability of a certain event?",
    options: ["0", "0.25", "0.5", "1"],
    answer: 3,
    explanation: "A certain event has probability 1."
  },
  {
    question: "What is the probability of rolling an even number on a fair six-sided die?",
    options: ["1/6", "1/3", "1/2", "2/3"],
    answer: 2,
    explanation: "The even outcomes are 2, 4, and 6: 3/6 = 1/2."
  },
  {
    question: "A card is selected randomly from four equally likely cards numbered 1 to 4. What is the probability of selecting number 3?",
    options: ["1/2", "1/3", "1/4", "3/4"],
    answer: 2,
    explanation: "One of the four cards shows 3, so the probability is 1/4."
  },
  {
    question: "If P(A) = 0.3, what is P(not A)?",
    options: ["0.3", "0.5", "0.7", "1.3"],
    answer: 2,
    explanation: "P(not A) = 1 - P(A) = 1 - 0.3 = 0.7."
  },
  {
    question: "A fair coin is tossed twice. What is the probability of getting heads both times?",
    options: ["1/2", "1/3", "1/4", "3/4"],
    answer: 2,
    explanation: "The probability is 1/2 × 1/2 = 1/4."
  },
  {
    question: "A spinner has 8 equal sections, and 2 are green. What is the probability of landing on green?",
    options: ["1/8", "1/4", "1/2", "3/4"],
    answer: 1,
    explanation: "P(green) = 2/8 = 1/4."
  },

  // 76–85: Functions and Coordinate Geometry
  {
    question: "What is the slope of a horizontal line?",
    options: ["-1", "0", "1", "Undefined"],
    answer: 1,
    explanation: "A horizontal line has no vertical change, so its slope is 0."
  },
  {
    question: "What is the slope of a vertical line?",
    options: ["0", "1", "-1", "Undefined"],
    answer: 3,
    explanation: "A vertical line has zero horizontal change, so its slope is undefined."
  },
  {
    question: "What is the slope between (0, 0) and (2, 4)?",
    options: ["1", "2", "3", "4"],
    answer: 1,
    explanation: "Slope = (4 - 0) / (2 - 0) = 2."
  },
  {
    question: "What is the y-intercept of y = 2x + 3?",
    options: ["2", "3", "-2", "-3"],
    answer: 1,
    explanation: "In y = mx + b, the y-intercept is b, which is 3."
  },
  {
    question: "If f(x) = 2x + 1, what is f(3)?",
    options: ["5", "6", "7", "8"],
    answer: 2,
    explanation: "f(3) = 2(3) + 1 = 7."
  },
  {
    question: "Which ordered pair represents the origin?",
    options: ["(1, 1)", "(0, 1)", "(1, 0)", "(0, 0)"],
    answer: 3,
    explanation: "The origin is the point (0, 0)."
  },
  {
    question: "In which quadrant is the point (3, 4)?",
    options: ["Quadrant I", "Quadrant II", "Quadrant III", "Quadrant IV"],
    answer: 0,
    explanation: "Both coordinates are positive, so the point is in Quadrant I."
  },
  {
    question: "In which quadrant is the point (-2, 5)?",
    options: ["Quadrant I", "Quadrant II", "Quadrant III", "Quadrant IV"],
    answer: 1,
    explanation: "The x-coordinate is negative and the y-coordinate is positive, so it is in Quadrant II."
  },
  {
    question: "What is the distance between (0, 0) and (3, 4)?",
    options: ["4", "5", "6", "7"],
    answer: 1,
    explanation: "Distance = √(3² + 4²) = √25 = 5."
  },
  {
    question: "Which equation represents a line with slope 2 and y-intercept 1?",
    options: ["y = x + 2", "y = 2x + 1", "y = 2x - 1", "y = x - 2"],
    answer: 1,
    explanation: "The slope-intercept form is y = mx + b, so y = 2x + 1."
  },

  // 86–95: Exponents, Polynomials, and Quadratics
  {
    question: "What is 10⁰?",
    options: ["0", "1", "10", "100"],
    answer: 1,
    explanation: "Any nonzero number raised to the zero power equals 1."
  },
  {
    question: "Simplify: (2x)(3x).",
    options: ["5x", "6x", "5x²", "6x²"],
    answer: 3,
    explanation: "Multiply the coefficients and variables: 2 × 3 × x × x = 6x²."
  },
  {
    question: "What is the degree of the polynomial 4x³ + 2x² - x + 7?",
    options: ["1", "2", "3", "4"],
    answer: 2,
    explanation: "The highest exponent of x is 3, so the degree is 3."
  },
  {
    question: "What is the product of (x + 2)(x + 3)?",
    options: ["x² + 5x + 6", "x² + 6x + 5", "x² + x + 6", "x² + 5"],
    answer: 0,
    explanation: "Expanding gives x² + 3x + 2x + 6 = x² + 5x + 6."
  },
  {
    question: "Solve: x² - 9 = 0.",
    options: ["x = 3 only", "x = -3 only", "x = ±3", "x = 9"],
    answer: 2,
    explanation: "x² = 9, so x = 3 or x = -3."
  },
  {
    question: "What is the discriminant of ax² + bx + c = 0?",
    options: ["b² + 4ac", "b² - 4ac", "a² - 4bc", "2a + b"],
    answer: 1,
    explanation: "The discriminant is b² - 4ac."
  },
  {
    question: "What is the value of the discriminant for x² - 4x + 4 = 0?",
    options: ["-4", "0", "4", "16"],
    answer: 1,
    explanation: "D = (-4)² - 4(1)(4) = 16 - 16 = 0."
  },
  {
    question: "Which expression is a perfect square trinomial?",
    options: ["x² + 4x + 4", "x² + 4x + 3", "x² - 4", "x² + x + 4"],
    answer: 0,
    explanation: "x² + 4x + 4 = (x + 2)²."
  },
  {
    question: "Solve: x² - 5x + 6 = 0.",
    options: ["x = 1 or 6", "x = 2 or 3", "x = -2 or -3", "x = 5 or 6"],
    answer: 1,
    explanation: "Factor: (x - 2)(x - 3) = 0, so x = 2 or x = 3."
  },
  {
    question: "What is the vertex x-coordinate of y = x² - 6x + 5?",
    options: ["-6", "-3", "3", "6"],
    answer: 2,
    explanation: "The vertex x-coordinate is -b/(2a) = -(-6)/(2 × 1) = 3."
  },

  // 96–100: Sequences and Mathematical Reasoning
  {
    question: "What is the next number in the sequence 2, 4, 6, 8, ...?",
    options: ["9", "10", "11", "12"],
    answer: 1,
    explanation: "The sequence increases by 2 each time, so the next number is 10."
  },
  {
    question: "What is the next number in the sequence 3, 6, 12, 24, ...?",
    options: ["30", "36", "42", "48"],
    answer: 3,
    explanation: "Each term is multiplied by 2, so 24 × 2 = 48."
  },
  {
    question: "What is the 10th term of the arithmetic sequence 2, 5, 8, 11, ...?",
    options: ["26", "27", "29", "32"],
    answer: 2,
    explanation: "aₙ = a₁ + (n - 1)d = 2 + 9(3) = 29."
  },
  {
    question: "What is the sum of the first five positive integers?",
    options: ["10", "15", "20", "25"],
    answer: 1,
    explanation: "1 + 2 + 3 + 4 + 5 = 15."
  },
  {
    question: "Which statement best describes a mathematical conjecture?",
    options: [
      "A statement accepted without any reasoning",
      "A conclusion believed to be true based on patterns or observations",
      "A number that cannot be calculated",
      "An equation with no variables"
    ],
    answer: 1,
    explanation: "A conjecture is a proposed statement based on observations that may need proof."
  }
],
  english: [
  // 1–10: Basic Grammar
  {
    question: "Which word is a noun in the sentence 'The teacher smiled'?",
    options: ["The", "teacher", "smiled", "quickly"],
    answer: 1,
    explanation: "A noun names a person, place, thing, or idea. Teacher names a person."
  },
  {
    question: "Which word is a verb in the sentence 'Birds fly across the sky'?",
    options: ["Birds", "across", "fly", "sky"],
    answer: 2,
    explanation: "Fly is the verb because it expresses an action."
  },
  {
    question: "Which word is an adjective?",
    options: ["Beautiful", "Sing", "Quickly", "Happiness"],
    answer: 0,
    explanation: "An adjective describes a noun or pronoun."
  },
  {
    question: "Which word is an adverb in 'She speaks softly'?",
    options: ["She", "speaks", "softly", "none"],
    answer: 2,
    explanation: "Softly describes how she speaks."
  },
  {
    question: "Choose the correct article: 'She ate _ apple.'",
    options: ["a", "an", "the a", "no article"],
    answer: 1,
    explanation: "An is used before a vowel sound. Apple begins with a vowel sound."
  },
  {
    question: "Which is a pronoun?",
    options: ["Maria", "School", "They", "Beautiful"],
    answer: 2,
    explanation: "They is a pronoun used to refer to people or things."
  },
  {
    question: "Which word is a preposition in 'The book is on the table'?",
    options: ["book", "is", "on", "table"],
    answer: 2,
    explanation: "On expresses the relationship between the book and the table."
  },
  {
    question: "Which word is a conjunction?",
    options: ["And", "Happy", "Jump", "Slowly"],
    answer: 0,
    explanation: "And connects words, phrases, or clauses."
  },
  {
    question: "Which sentence contains an interjection?",
    options: [
      "The dog barked.",
      "Wow! That is amazing.",
      "She reads books.",
      "They went home."
    ],
    answer: 1,
    explanation: "Wow expresses a sudden feeling or reaction."
  },
  {
    question: "Which is a proper noun?",
    options: ["city", "country", "teacher", "Manila"],
    answer: 3,
    explanation: "Manila is the specific name of a place, so it is a proper noun."
  },

  // 11–20: Subject-Verb Agreement
  {
    question: "Choose the correct sentence.",
    options: [
      "She walk to school.",
      "She walks to school.",
      "She walking to school.",
      "She have walk to school."
    ],
    answer: 1,
    explanation: "In the simple present tense, a singular third-person subject usually takes a verb ending in -s."
  },
  {
    question: "The students _ studying for the examination.",
    options: ["is", "am", "are", "was"],
    answer: 2,
    explanation: "Students is plural, so are is the correct helping verb."
  },
  {
    question: "Everyone _ responsible for keeping the classroom clean.",
    options: ["are", "is", "were", "have"],
    answer: 1,
    explanation: "Everyone is grammatically singular and takes the singular verb is."
  },
  {
    question: "Neither the teacher nor the students _ late.",
    options: ["is", "was", "are", "has"],
    answer: 2,
    explanation: "With neither...nor, the verb commonly agrees with the nearer subject. Students is plural."
  },
  {
    question: "My brother and sister _ at home.",
    options: ["is", "are", "was", "has"],
    answer: 1,
    explanation: "Two subjects joined by and usually take a plural verb."
  },
  {
    question: "Each of the players _ a uniform.",
    options: ["have", "are having", "has", "were"],
    answer: 2,
    explanation: "Each is singular, so it takes has."
  },
  {
    question: "The news _ surprising.",
    options: ["are", "were", "is", "have"],
    answer: 2,
    explanation: "News is treated as a singular noun in standard English."
  },
  {
    question: "There _ several books on the shelf.",
    options: ["is", "are", "was", "has"],
    answer: 1,
    explanation: "The subject books is plural, so are is correct."
  },
  {
    question: "Either my mother or my sisters _ preparing dinner.",
    options: ["is", "was", "are", "has"],
    answer: 2,
    explanation: "The nearer subject, sisters, is plural, so are is used."
  },
  {
    question: "Ten kilometers _ a long distance to walk.",
    options: ["are", "were", "is", "have"],
    answer: 2,
    explanation: "A distance considered as one total amount generally takes a singular verb."
  },

  // 21–30: Verb Tenses
  {
    question: "Which sentence is in the simple past tense?",
    options: [
      "I eat breakfast.",
      "I am eating breakfast.",
      "I ate breakfast.",
      "I will eat breakfast."
    ],
    answer: 2,
    explanation: "Ate is the simple past form of eat."
  },
  {
    question: "She _ her homework every evening.",
    options: ["do", "does", "did", "doing"],
    answer: 1,
    explanation: "Does is the correct simple present form for she."
  },
  {
    question: "They _ basketball right now.",
    options: ["play", "played", "are playing", "plays"],
    answer: 2,
    explanation: "Are playing is the present progressive form, used for an action happening now."
  },
  {
    question: "I _ my assignment before the deadline yesterday.",
    options: ["finish", "finished", "will finish", "finishing"],
    answer: 1,
    explanation: "Yesterday indicates the past, so finished is correct."
  },
  {
    question: "By next year, she _ senior high school.",
    options: ["completed", "completes", "will have completed", "completing"],
    answer: 2,
    explanation: "The future perfect tense describes an action completed by a future time."
  },
  {
    question: "He has _ in this town for five years.",
    options: ["live", "lived", "living", "lives"],
    answer: 1,
    explanation: "The present perfect uses has or have plus a past participle. Lived is the past participle."
  },
  {
    question: "When I arrived, they _ dinner.",
    options: ["eat", "have eaten", "were eating", "will eat"],
    answer: 2,
    explanation: "The past progressive describes an action that was ongoing when another past event occurred."
  },
  {
    question: "If it rains tomorrow, we _ at home.",
    options: ["stayed", "stay yesterday", "will stay", "would stayed"],
    answer: 2,
    explanation: "The first conditional commonly uses if + present simple and will + base verb."
  },
  {
    question: "She _ the movie before her friends arrived.",
    options: ["has watched", "had watched", "watches", "will watch"],
    answer: 1,
    explanation: "The past perfect describes an action completed before another past event."
  },
  {
    question: "Which sentence uses the future continuous tense?",
    options: [
      "I study tonight.",
      "I studied last night.",
      "I will be studying at 8 PM.",
      "I have studied already."
    ],
    answer: 2,
    explanation: "Will be studying is the future continuous form."
  },

  // 31–40: Pronouns, Articles, and Prepositions
  {
    question: "Maria and _ went to the library.",
    options: ["me", "I", "my", "mine"],
    answer: 1,
    explanation: "I is the subject pronoun used with Maria as the compound subject."
  },
  {
    question: "This book belongs to Carlo. It is _.",
    options: ["he", "him", "his", "himself"],
    answer: 2,
    explanation: "His is a possessive pronoun that indicates ownership."
  },
  {
    question: "The cat cleaned _ after eating.",
    options: ["it", "its", "itself", "it's"],
    answer: 2,
    explanation: "Itself is a reflexive pronoun referring back to the cat."
  },
  {
    question: "Choose the correct sentence.",
    options: [
      "Their going to school.",
      "There going to school.",
      "They're going to school.",
      "Theyre going to school."
    ],
    answer: 2,
    explanation: "They're is the contraction of they are."
  },
  {
    question: "The meeting begins _ 9 AM.",
    options: ["in", "on", "at", "by"],
    answer: 2,
    explanation: "At is used for specific times."
  },
  {
    question: "My birthday is _ October.",
    options: ["at", "on", "in", "by"],
    answer: 2,
    explanation: "In is used with months."
  },
  {
    question: "The examination is _ Monday.",
    options: ["in", "on", "at", "under"],
    answer: 1,
    explanation: "On is used with days of the week."
  },
  {
    question: "He walked _ the bridge.",
    options: ["across", "between", "during", "since"],
    answer: 0,
    explanation: "Across means from one side to the other."
  },
  {
    question: "There is a small garden _ the two buildings.",
    options: ["among", "between", "through", "during"],
    answer: 1,
    explanation: "Between is used when referring to two people or things."
  },
  {
    question: "She is interested _ learning new languages.",
    options: ["on", "at", "in", "for"],
    answer: 2,
    explanation: "The standard expression is interested in."
  },

  // 41–50: Vocabulary
  {
    question: "What is a synonym of 'happy'?",
    options: ["Angry", "Joyful", "Tired", "Nervous"],
    answer: 1,
    explanation: "Joyful means feeling or expressing happiness."
  },
  {
    question: "What is an antonym of 'ancient'?",
    options: ["Old", "Historic", "Modern", "Traditional"],
    answer: 2,
    explanation: "Modern refers to something of the present or recent times."
  },
  {
    question: "What does 'generous' mean?",
    options: [
      "Unwilling to share",
      "Willing to give or share",
      "Always angry",
      "Easily confused"
    ],
    answer: 1,
    explanation: "A generous person willingly gives or shares with others."
  },
  {
    question: "What does 'reluctant' mean?",
    options: ["Unwilling or hesitant", "Excited", "Certain", "Careless"],
    answer: 0,
    explanation: "Reluctant means hesitant or unwilling to do something."
  },
  {
    question: "Which word means 'to make something clear'?",
    options: ["Confuse", "Clarify", "Ignore", "Conceal"],
    answer: 1,
    explanation: "Clarify means to make something easier to understand."
  },
  {
    question: "What does 'abundant' mean?",
    options: ["Rare", "Plentiful", "Empty", "Weak"],
    answer: 1,
    explanation: "Abundant means existing in large quantities."
  },
  {
    question: "What is a synonym of 'courageous'?",
    options: ["Brave", "Timid", "Lazy", "Silent"],
    answer: 0,
    explanation: "Courageous means brave, especially when facing difficulty or danger."
  },
  {
    question: "What is an antonym of 'expand'?",
    options: ["Increase", "Enlarge", "Contract", "Extend"],
    answer: 2,
    explanation: "Contract means to become smaller or decrease in size."
  },
  {
    question: "What does 'meticulous' mean?",
    options: [
      "Careless",
      "Very careful and attentive to detail",
      "Extremely noisy",
      "Easily frightened"
    ],
    answer: 1,
    explanation: "Meticulous describes someone who pays close attention to details."
  },
  {
    question: "What does 'inevitable' mean?",
    options: ["Impossible", "Uncertain", "Unable to be avoided", "Easy to forget"],
    answer: 2,
    explanation: "Inevitable describes something that cannot be avoided."
  },

  // 51–60: Sentence Structure and Punctuation
  {
    question: "Which sentence is grammatically correct?",
    options: [
      "She don't like coffee.",
      "She doesn't likes coffee.",
      "She doesn't like coffee.",
      "She not like coffee."
    ],
    answer: 2,
    explanation: "After doesn't, use the base form of the verb: like."
  },
  {
    question: "Which sentence is a question?",
    options: [
      "The sun is shining.",
      "Please close the door.",
      "Where are you going?",
      "What a beautiful day!"
    ],
    answer: 2,
    explanation: "A question asks for information and normally ends with a question mark."
  },
  {
    question: "Which punctuation mark ends a declarative sentence?",
    options: ["Comma", "Period", "Colon", "Apostrophe"],
    answer: 1,
    explanation: "A declarative sentence states information and usually ends with a period."
  },
  {
    question: "Choose the correctly punctuated sentence.",
    options: [
      "However I was late.",
      "However, I was late.",
      "However I, was late.",
      "However; I, was late."
    ],
    answer: 1,
    explanation: "An introductory conjunctive adverb such as however is commonly followed by a comma."
  },
  {
    question: "Which is a compound sentence?",
    options: [
      "Because it was raining.",
      "The little dog barked.",
      "I studied, and my friend reviewed.",
      "Running down the street."
    ],
    answer: 2,
    explanation: "A compound sentence joins two independent clauses."
  },
  {
    question: "Which is a complex sentence?",
    options: [
      "I read and wrote.",
      "Although it was late, we continued studying.",
      "The bell rang.",
      "She sings, and he dances."
    ],
    answer: 1,
    explanation: "A complex sentence contains an independent clause and a dependent clause."
  },
  {
    question: "Which sentence contains a comma splice?",
    options: [
      "I was tired, so I slept.",
      "I was tired; I slept.",
      "I was tired, I slept.",
      "Because I was tired, I slept."
    ],
    answer: 2,
    explanation: "A comma splice occurs when two independent clauses are joined with only a comma."
  },
  {
    question: "Which sentence uses an apostrophe correctly?",
    options: [
      "The students books are new.",
      "The student's books are new.",
      "The students' books are new.",
      "Both B and C can be correct, depending on ownership."
    ],
    answer: 3,
    explanation: "Student's indicates one student's ownership, while students' indicates multiple students' ownership."
  },
  {
    question: "Which sentence uses capitalization correctly?",
    options: [
      "we visited manila last june.",
      "We visited Manila last June.",
      "We Visited manila last June.",
      "we visited Manila Last june."
    ],
    answer: 1,
    explanation: "The first word of a sentence and proper nouns such as Manila and June are capitalized."
  },
  {
    question: "What is a sentence fragment?",
    options: [
      "A complete sentence with a subject and predicate",
      "An incomplete group of words presented as a sentence",
      "Two complete sentences joined correctly",
      "A sentence that asks a question"
    ],
    answer: 1,
    explanation: "A fragment lacks the structure or information needed to function as a complete sentence."
  },

  // 61–70: Figures of Speech
  {
    question: "Which figure of speech compares two things using 'like' or 'as'?",
    options: ["Metaphor", "Simile", "Irony", "Hyperbole"],
    answer: 1,
    explanation: "A simile makes a comparison using words such as like or as."
  },
  {
    question: "What figure of speech is used in 'Time is a thief'?",
    options: ["Simile", "Metaphor", "Alliteration", "Onomatopoeia"],
    answer: 1,
    explanation: "A metaphor directly compares time to a thief without using like or as."
  },
  {
    question: "What figure of speech is 'The wind whispered through the trees'?",
    options: ["Personification", "Hyperbole", "Irony", "Pun"],
    answer: 0,
    explanation: "Personification gives a human action, whispering, to the wind."
  },
  {
    question: "Which figure of speech exaggerates for emphasis?",
    options: ["Metaphor", "Hyperbole", "Simile", "Euphemism"],
    answer: 1,
    explanation: "Hyperbole uses deliberate exaggeration for emphasis or effect."
  },
  {
    question: "Which phrase demonstrates alliteration?",
    options: [
      "The bright moon",
      "Peter Piper picked peppers",
      "Time flies",
      "As cold as ice"
    ],
    answer: 1,
    explanation: "Alliteration repeats initial consonant sounds in nearby words."
  },
  {
    question: "Which is an example of onomatopoeia?",
    options: ["Buzz", "Blue", "Gentle", "Tall"],
    answer: 0,
    explanation: "Onomatopoeia uses words that imitate sounds, such as buzz."
  },
  {
    question: "What figure of speech appears in 'I have told you a million times'?",
    options: ["Hyperbole", "Simile", "Personification", "Allusion"],
    answer: 0,
    explanation: "A million times is an exaggeration rather than a literal count."
  },
  {
    question: "What figure of speech is used in 'The classroom was a zoo'?",
    options: ["Simile", "Metaphor", "Alliteration", "Oxymoron"],
    answer: 1,
    explanation: "The sentence metaphorically compares a noisy classroom to a zoo."
  },
  {
    question: "Which phrase is an example of an oxymoron?",
    options: ["Deafening silence", "Bright sunshine", "Green grass", "Fast runner"],
    answer: 0,
    explanation: "An oxymoron combines apparently contradictory terms."
  },
  {
    question: "What is irony?",
    options: [
      "Repeating the same sound",
      "A contrast between expectation and reality or intended meaning",
      "Comparing two things with like",
      "Giving human qualities to objects"
    ],
    answer: 1,
    explanation: "Irony involves a contrast between what is expected, stated, or intended and what actually occurs or is meant."
  },

  // 71–80: Reading Comprehension
  {
    question: "A passage explains how regular reading improves vocabulary and comprehension. What is its likely main idea?",
    options: [
      "Reading is only for entertainment.",
      "Regular reading can improve language skills.",
      "Vocabulary is unimportant.",
      "Comprehension cannot be learned."
    ],
    answer: 1,
    explanation: "The main idea summarizes the central point supported by the passage."
  },
  {
    question: "What is an inference?",
    options: [
      "A direct quotation",
      "A conclusion based on clues and prior knowledge",
      "A list of chapter titles",
      "A spelling rule"
    ],
    answer: 1,
    explanation: "An inference is a reasonable conclusion drawn from available evidence and knowledge."
  },
  {
    question: "If dark clouds gather and the wind becomes strong, what might you infer?",
    options: [
      "A storm may be approaching.",
      "The weather will certainly be hot.",
      "It is already midnight.",
      "The clouds have disappeared."
    ],
    answer: 0,
    explanation: "Dark clouds and strong winds are clues that a storm may be approaching."
  },
  {
    question: "What is the author's purpose in a text explaining the steps of recycling?",
    options: ["To entertain only", "To inform or instruct", "To describe a fictional hero", "To create suspense"],
    answer: 1,
    explanation: "A text explaining steps usually aims to inform or instruct readers."
  },
  {
    question: "What is a supporting detail?",
    options: [
      "Information that explains or supports the main idea",
      "A random word",
      "The title alone",
      "An unrelated opinion"
    ],
    answer: 0,
    explanation: "Supporting details provide evidence, examples, or explanations for the main idea."
  },
  {
    question: "What does context clue mean?",
    options: [
      "A dictionary's cover",
      "Information surrounding an unfamiliar word that helps reveal its meaning",
      "The author's signature",
      "A punctuation mark only"
    ],
    answer: 1,
    explanation: "Context clues help readers determine a word's meaning from the surrounding text."
  },
  {
    question: "A story ends with the main character achieving a goal after many struggles. Which theme might this suggest?",
    options: [
      "Persistence can help overcome challenges.",
      "All goals are impossible.",
      "Friends always cause problems.",
      "Hard work never matters."
    ],
    answer: 0,
    explanation: "The character's struggle and eventual success suggest the value of persistence."
  },
  {
    question: "What is the tone of a passage?",
    options: [
      "The author's attitude toward the subject",
      "The number of paragraphs",
      "The setting's location",
      "The reader's age"
    ],
    answer: 0,
    explanation: "Tone reflects the author's attitude, such as humorous, serious, critical, or hopeful."
  },
  {
    question: "What is the mood of a literary work?",
    options: [
      "The author's biography",
      "The feeling or atmosphere experienced by the reader",
      "The number of characters",
      "The grammatical tense"
    ],
    answer: 1,
    explanation: "Mood is the emotional atmosphere created for the reader."
  },
  {
    question: "What is a summary?",
    options: [
      "A complete copy of the original text",
      "A brief statement of the text's main points",
      "A list of every word",
      "An unrelated personal story"
    ],
    answer: 1,
    explanation: "A summary briefly presents the main ideas without unnecessary details."
  },

  // 81–90: Literature
  {
    question: "Who is the protagonist?",
    options: [
      "The main character",
      "The setting",
      "The story's title",
      "The person who prints the book"
    ],
    answer: 0,
    explanation: "The protagonist is the central character in a story."
  },
  {
    question: "Who or what is the antagonist?",
    options: [
      "Always the narrator",
      "The character or force opposing the protagonist",
      "The story's setting",
      "The author"
    ],
    answer: 1,
    explanation: "The antagonist opposes or creates obstacles for the protagonist."
  },
  {
    question: "What is the setting of a story?",
    options: [
      "The central lesson",
      "The time and place in which events occur",
      "The main conflict only",
      "The author's name"
    ],
    answer: 1,
    explanation: "Setting establishes when and where the story takes place."
  },
  {
    question: "What is the plot?",
    options: [
      "The sequence of events in a story",
      "The list of characters only",
      "The author's education",
      "The moral alone"
    ],
    answer: 0,
    explanation: "Plot is the sequence of connected events that make up a narrative."
  },
  {
    question: "What is a theme in literature?",
    options: [
      "The book's price",
      "The central message or insight about life",
      "The number of pages",
      "The author's address"
    ],
    answer: 1,
    explanation: "A theme is an underlying message or insight explored in a literary work."
  },
  {
    question: "Which literary genre commonly includes magical or supernatural elements?",
    options: ["Fantasy", "Biography", "News report", "Instruction manual"],
    answer: 0,
    explanation: "Fantasy commonly features magic, supernatural elements, or imaginary worlds."
  },
  {
    question: "What is a biography?",
    options: [
      "A poem about nature",
      "An account of a person's life written by someone else",
      "A fictional dialogue only",
      "A list of instructions"
    ],
    answer: 1,
    explanation: "A biography tells the story of a person's life and is written by another person."
  },
  {
    question: "What is an autobiography?",
    options: [
      "A person's account of their own life",
      "A play written for children",
      "A fictional mystery",
      "A newspaper editorial"
    ],
    answer: 0,
    explanation: "An autobiography is a life story written by the person whose life is described."
  },
  {
    question: "What is a stanza?",
    options: [
      "A group of lines in a poem",
      "A chapter in a novel",
      "A character's name",
      "A type of punctuation"
    ],
    answer: 0,
    explanation: "A stanza is a grouped set of lines in a poem, similar to a paragraph in prose."
  },
  {
    question: "What is dialogue in a story?",
    options: [
      "A description of the weather",
      "A conversation between characters",
      "A list of themes",
      "The author's biography"
    ],
    answer: 1,
    explanation: "Dialogue presents the spoken words exchanged by characters."
  },

  // 91–100: Advanced Grammar and Writing
  {
    question: "Which sentence uses the passive voice?",
    options: [
      "The students completed the project.",
      "The project was completed by the students.",
      "The students are completing the project.",
      "The students will complete the project."
    ],
    answer: 1,
    explanation: "The passive voice makes the receiver of the action the grammatical subject."
  },
  {
    question: "Which sentence is in the active voice?",
    options: [
      "The cake was baked by Ana.",
      "The song was sung by the choir.",
      "Ana baked the cake.",
      "The letter was written by Mark."
    ],
    answer: 2,
    explanation: "In the active voice, the subject performs the action."
  },
  {
    question: "Choose the correct comparative form of 'good.'",
    options: ["Gooder", "More good", "Best", "Better"],
    answer: 3,
    explanation: "Better is the comparative form of good."
  },
  {
    question: "Choose the correct superlative form of 'interesting.'",
    options: ["Interestinger", "More interesting", "Most interesting", "Interestingest"],
    answer: 2,
    explanation: "Most interesting is the superlative form used to compare three or more things."
  },
  {
    question: "Which sentence uses the correct conditional form?",
    options: [
      "If I were you, I would apologize.",
      "If I am you, I would apologized.",
      "If I was you, I will apologized.",
      "If I be you, I would apologize."
    ],
    answer: 0,
    explanation: "The second conditional commonly uses if + past form and would + base verb for hypothetical situations."
  },
  {
    question: "Which word correctly completes the sentence: 'The student _ won the contest is my friend.'",
    options: ["which", "who", "where", "when"],
    answer: 1,
    explanation: "Who is a relative pronoun used to refer to people."
  },
  {
    question: "Choose the correct sentence.",
    options: [
      "Despite of the rain, we played.",
      "Despite the rain, we played.",
      "Despite it was raining, we played.",
      "Despite raining was, we played."
    ],
    answer: 1,
    explanation: "Despite is followed by a noun phrase or gerund, not 'of.'"
  },
  {
    question: "Which sentence avoids a dangling modifier?",
    options: [
      "Walking to school, the rain started.",
      "Walking to school, Maria saw a rainbow.",
      "Walking to school, the bag fell.",
      "Walking to school, the road was wet."
    ],
    answer: 1,
    explanation: "Maria is clearly the person walking to school, so the introductory phrase correctly modifies the subject."
  },
  {
    question: "Which transition word indicates contrast?",
    options: ["Furthermore", "Therefore", "However", "Similarly"],
    answer: 2,
    explanation: "However signals contrast between ideas."
  },
  {
    question: "What is plagiarism?",
    options: [
      "Using your own original ideas",
      "Giving proper credit to sources",
      "Presenting someone else's work or ideas as your own without proper acknowledgment",
      "Revising your own draft"
    ],
    answer: 2,
    explanation: "Plagiarism involves using another person's work or ideas without appropriate acknowledgment."
  }
],
  mil: [
  // 1–10: Introduction to Media and Information Literacy
  {
    question: "What does MIL stand for?",
    options: [
      "Media and Information Literacy",
      "Modern Internet Learning",
      "Media Integration Language",
      "Multimedia Information Link"
    ],
    answer: 0,
    explanation: "MIL stands for Media and Information Literacy."
  },
  {
    question: "What is the main purpose of Media and Information Literacy?",
    options: [
      "To make everyone famous online",
      "To access, evaluate, use, and create information responsibly",
      "To prevent people from using technology",
      "To promote every online post"
    ],
    answer: 1,
    explanation: "MIL develops the skills needed to access, analyze, evaluate, and communicate information responsibly."
  },
  {
    question: "Which is an example of media?",
    options: ["Television", "A wooden chair", "A spoon", "A pencil sharpener"],
    answer: 0,
    explanation: "Television is a medium for communicating information and entertainment."
  },
  {
    question: "What is information literacy?",
    options: [
      "The ability to memorize every website",
      "The ability to find, evaluate, and use information effectively",
      "The ability to create passwords only",
      "The ability to use social media without limits"
    ],
    answer: 1,
    explanation: "Information literacy involves finding, evaluating, and using information appropriately."
  },
  {
    question: "What is media literacy?",
    options: [
      "The ability to analyze and understand media messages",
      "The ability to watch television for hours",
      "The ability to avoid every form of media",
      "The ability to become a celebrity"
    ],
    answer: 0,
    explanation: "Media literacy helps people interpret, evaluate, and create media messages."
  },
  {
    question: "Which is an example of traditional media?",
    options: ["Printed newspaper", "Online livestream", "Social media story", "Video-sharing app"],
    answer: 0,
    explanation: "Printed newspapers are a traditional form of mass media."
  },
  {
    question: "Which is an example of digital media?",
    options: ["A handwritten letter", "An online video", "A stone tablet", "A printed poster only"],
    answer: 1,
    explanation: "An online video is created, distributed, or accessed using digital technology."
  },
  {
    question: "What is mass media?",
    options: [
      "Communication intended to reach a large audience",
      "A private conversation between two people",
      "A notebook used by one student",
      "A message that is never shared"
    ],
    answer: 0,
    explanation: "Mass media communicates messages to large audiences through channels such as television, radio, and newspapers."
  },
  {
    question: "What is the difference between data and information?",
    options: [
      "They always mean exactly the same thing",
      "Data are raw facts, while information is data organized to provide meaning",
      "Information is always incorrect",
      "Data can only be written on paper"
    ],
    answer: 1,
    explanation: "Data are raw facts or observations; information is processed or organized data that has meaning."
  },
  {
    question: "Why is MIL important for students?",
    options: [
      "It removes the need to study",
      "It helps students evaluate sources and make informed decisions",
      "It guarantees perfect grades",
      "It prevents students from asking questions"
    ],
    answer: 1,
    explanation: "MIL helps students assess credibility, think critically, and use information responsibly."
  },

  // 11–20: Types and Forms of Media
  {
    question: "Which medium primarily communicates through sound?",
    options: ["Radio", "Poster", "Photograph", "Comic strip"],
    answer: 0,
    explanation: "Radio primarily communicates through audio."
  },
  {
    question: "Which medium combines moving images and sound?",
    options: ["Printed flyer", "Film", "Written letter", "Static photograph"],
    answer: 1,
    explanation: "Films combine moving images and usually sound to communicate stories or information."
  },
  {
    question: "Which is an example of print media?",
    options: ["Podcast", "Newspaper", "Livestream", "Radio broadcast"],
    answer: 1,
    explanation: "A newspaper is a printed publication."
  },
  {
    question: "What is a podcast?",
    options: [
      "A printed magazine",
      "A digital audio program, sometimes accompanied by video",
      "A type of computer virus",
      "A handwritten journal"
    ],
    answer: 1,
    explanation: "Podcasts are digital programs commonly distributed as audio episodes."
  },
  {
    question: "What is a blog?",
    options: [
      "An online publication featuring posts or articles",
      "A type of television antenna",
      "A printed receipt",
      "A computer's physical keyboard"
    ],
    answer: 0,
    explanation: "A blog is a website or section of a website that publishes posts or articles."
  },
  {
    question: "What is a vlog?",
    options: [
      "A video-based blog",
      "A radio frequency",
      "A printed dictionary",
      "A spreadsheet formula"
    ],
    answer: 0,
    explanation: "A vlog presents blog-style content primarily through video."
  },
  {
    question: "Which is an example of interactive media?",
    options: ["A static billboard", "An interactive learning application", "A printed photograph", "A traditional poster"],
    answer: 1,
    explanation: "Interactive media allows users to participate or influence what happens."
  },
  {
    question: "What is a multimedia presentation?",
    options: [
      "A presentation using only plain text",
      "A presentation combining elements such as text, images, audio, and video",
      "A handwritten note",
      "A single uncaptioned word"
    ],
    answer: 1,
    explanation: "Multimedia combines multiple forms of content to communicate a message."
  },
  {
    question: "Which is a characteristic of social media?",
    options: [
      "Users can create, share, and interact with content",
      "Only printed materials are allowed",
      "Communication must always be one-way",
      "Users cannot respond to posts"
    ],
    answer: 0,
    explanation: "Social media enables users to create, share, and interact with content and other users."
  },
  {
    question: "What is broadcast media?",
    options: [
      "Media distributed to audiences through channels such as radio and television",
      "A personal notebook",
      "A private diary",
      "A document stored only on one computer"
    ],
    answer: 0,
    explanation: "Broadcast media distributes audio or audiovisual content to audiences through transmission systems."
  },

  // 21–30: Information Sources and Evaluation
  {
    question: "Which source is generally best for finding an original research study?",
    options: [
      "An anonymous comment",
      "The original research article in a scholarly journal",
      "An unsourced meme",
      "A random entertainment post"
    ],
    answer: 1,
    explanation: "An original research article provides direct access to the researchers' methods, findings, and conclusions."
  },
  {
    question: "What is a primary source?",
    options: [
      "A source that directly documents an event, experience, or original research",
      "A summary written by someone who was not involved",
      "An opinion with no evidence",
      "A fictional story presented as fact"
    ],
    answer: 0,
    explanation: "Primary sources provide firsthand evidence or original material relevant to a topic."
  },
  {
    question: "Which is an example of a secondary source?",
    options: [
      "An original interview recording",
      "A researcher's original laboratory data",
      "A review analyzing several published studies",
      "An original photograph taken at an event"
    ],
    answer: 2,
    explanation: "A review that analyzes existing studies is a secondary source."
  },
  {
    question: "What should you check first when evaluating an online article?",
    options: [
      "Whether it has many emojis",
      "Its author, evidence, publication, and date",
      "Whether its title is written in capital letters",
      "How colorful its background is"
    ],
    answer: 1,
    explanation: "Authorship, evidence, publication context, and date help establish credibility and relevance."
  },
  {
    question: "Why is the publication date important?",
    options: [
      "All old information is false",
      "Some information may become outdated",
      "New information is always correct",
      "Dates determine whether a website is attractive"
    ],
    answer: 1,
    explanation: "The date helps readers determine whether information is current enough for their purpose."
  },
  {
    question: "What is source credibility?",
    options: [
      "How attractive a website looks",
      "How trustworthy and reliable a source is",
      "How many colors a source uses",
      "How long a headline is"
    ],
    answer: 1,
    explanation: "Credibility concerns the trustworthiness and reliability of a source and its claims."
  },
  {
    question: "Why should you consult multiple reliable sources?",
    options: [
      "To find evidence that supports verification and comparison",
      "To make research unnecessarily longer",
      "To avoid reading any original source",
      "To guarantee that every source agrees"
    ],
    answer: 0,
    explanation: "Comparing reliable sources can reveal agreement, disagreement, missing context, and errors."
  },
  {
    question: "What is a scholarly journal?",
    options: [
      "A publication that presents academic research or scholarly discussion",
      "A personal social media account",
      "A random collection of advertisements",
      "A fictional chatroom"
    ],
    answer: 0,
    explanation: "Scholarly journals publish academic research and related scholarly work."
  },
  {
    question: "What does peer-reviewed mean?",
    options: [
      "A post has many likes",
      "A research work has been evaluated by other experts before publication",
      "A video has been shared by friends",
      "An article has no author"
    ],
    answer: 1,
    explanation: "Peer review involves expert assessment of research before publication, although it does not guarantee that a study is error-free."
  },
  {
    question: "What is the purpose of a citation?",
    options: [
      "To hide where information came from",
      "To acknowledge sources and help readers locate them",
      "To replace the entire discussion",
      "To make unsupported claims appear true"
    ],
    answer: 1,
    explanation: "Citations acknowledge the original sources and allow readers to verify information."
  },

  // 31–40: Misinformation and Fact-Checking
  {
    question: "What is misinformation?",
    options: [
      "False or inaccurate information shared regardless of whether the sharer intends to deceive",
      "Information that is always supported by evidence",
      "A verified scientific finding",
      "A properly cited quotation"
    ],
    answer: 0,
    explanation: "Misinformation is false or inaccurate information that may be shared without an intent to deceive."
  },
  {
    question: "What is disinformation?",
    options: [
      "An accidental spelling mistake",
      "False information deliberately created or shared to mislead",
      "A correctly reported fact",
      "A properly referenced research paper"
    ],
    answer: 1,
    explanation: "Disinformation involves deliberately spreading false or misleading information."
  },
  {
    question: "What is malinformation?",
    options: [
      "True information used to cause harm, often through harmful context or disclosure",
      "Any information found in a library",
      "A harmless grammar error",
      "An academic citation"
    ],
    answer: 0,
    explanation: "Malinformation refers to genuine information used in ways intended to cause harm, such as exposing private details."
  },
  {
    question: "You receive a shocking news story from an unknown account. What should you do?",
    options: [
      "Share it immediately",
      "Check reliable sources and the original context before sharing",
      "Assume it is true because it is shocking",
      "Add more dramatic details"
    ],
    answer: 1,
    explanation: "Verification helps prevent the spread of false or misleading claims."
  },
  {
    question: "What is clickbait?",
    options: [
      "A headline designed to attract clicks, sometimes through exaggeration",
      "A scholarly citation format",
      "A method of protecting passwords",
      "A tool for correcting spelling"
    ],
    answer: 0,
    explanation: "Clickbait uses attention-grabbing headlines that may exaggerate or misrepresent the content."
  },
  {
    question: "What is a misleading headline?",
    options: [
      "A headline that accurately summarizes the article",
      "A headline that creates an inaccurate impression of the content",
      "A title that identifies the topic clearly",
      "A headline that includes a publication date"
    ],
    answer: 1,
    explanation: "A misleading headline may distort the story even when parts of the article are accurate."
  },
  {
    question: "What is fact-checking?",
    options: [
      "Checking whether claims are supported by evidence",
      "Checking only the number of likes",
      "Correcting someone's opinion without evidence",
      "Sharing every trending post"
    ],
    answer: 0,
    explanation: "Fact-checking assesses the accuracy of claims using evidence and reliable sources."
  },
  {
    question: "A photograph is shared as proof of a recent event. What is a useful verification step?",
    options: [
      "Assume the caption is correct",
      "Use reverse image search and investigate the original context",
      "Judge the claim by the number of comments",
      "Crop the image and remove its source"
    ],
    answer: 1,
    explanation: "Reverse image search can help identify earlier appearances of an image and possible context changes."
  },
  {
    question: "What is confirmation bias?",
    options: [
      "Giving equal consideration to all evidence",
      "Favoring information that supports existing beliefs",
      "Checking the publication date",
      "Correcting an incorrect statement"
    ],
    answer: 1,
    explanation: "Confirmation bias is the tendency to favor information that agrees with existing beliefs."
  },
  {
    question: "What should you do after discovering that you shared false information?",
    options: [
      "Ignore it permanently",
      "Correct or remove the post and share a reliable correction",
      "Blame everyone who saw it",
      "Create another misleading post"
    ],
    answer: 1,
    explanation: "Correcting the record helps reduce the continued spread of inaccurate information."
  },

  // 41–50: Media Language and Representation
  {
    question: "What is media language?",
    options: [
      "The codes and conventions used to communicate meaning through media",
      "A language spoken only by computers",
      "A list of passwords",
      "A type of printing machine"
    ],
    answer: 0,
    explanation: "Media language includes elements such as images, sound, editing, color, framing, and written words."
  },
  {
    question: "What is framing in photography or video?",
    options: [
      "Selecting what appears within the image boundaries",
      "Writing a bibliography",
      "Adding a password",
      "Measuring internet speed"
    ],
    answer: 0,
    explanation: "Framing determines what is included or excluded from an image or shot."
  },
  {
    question: "How can camera angles affect a viewer's interpretation?",
    options: [
      "They can influence perceptions of power, vulnerability, or importance",
      "They always make every subject look identical",
      "They eliminate the need for context",
      "They guarantee that a story is factual"
    ],
    answer: 0,
    explanation: "Camera angles can influence how viewers perceive subjects and situations."
  },
  {
    question: "What is media representation?",
    options: [
      "How people, places, events, and ideas are portrayed in media",
      "The process of charging a device",
      "A list of computer parts",
      "A method of saving a document"
    ],
    answer: 0,
    explanation: "Representation concerns how media selects and portrays people, groups, places, and ideas."
  },
  {
    question: "What is a stereotype?",
    options: [
      "A fixed and oversimplified belief about a group",
      "A verified individual biography",
      "A scientific measurement",
      "A neutral file format"
    ],
    answer: 0,
    explanation: "Stereotypes generalize characteristics to members of a group and may misrepresent individuals."
  },
  {
    question: "Why is diverse representation in media important?",
    options: [
      "It can offer a broader range of experiences and perspectives",
      "It ensures everyone has identical experiences",
      "It eliminates all disagreement",
      "It makes fact-checking unnecessary"
    ],
    answer: 0,
    explanation: "Diverse representation can help audiences encounter perspectives and experiences beyond a single viewpoint."
  },
  {
    question: "What is bias in a media report?",
    options: [
      "A perspective or preference that may influence how information is selected or presented",
      "Proof that every statement is false",
      "The use of a publication date",
      "A guarantee of neutrality"
    ],
    answer: 0,
    explanation: "Bias may affect which facts, sources, or perspectives a report emphasizes or omits."
  },
  {
    question: "What is a media convention?",
    options: [
      "A commonly used technique or pattern in a media form",
      "A private password",
      "A type of computer battery",
      "A random error in a file"
    ],
    answer: 0,
    explanation: "Media conventions are familiar techniques or patterns used to communicate meaning in a particular media form."
  },
  {
    question: "What is the purpose of background music in a film?",
    options: [
      "It can help establish mood and influence audience emotions",
      "It proves that the story is true",
      "It replaces every visual element",
      "It guarantees that viewers agree"
    ],
    answer: 0,
    explanation: "Music can create atmosphere, signal emotion, and shape how audiences experience a scene."
  },
  {
    question: "Why should audiences consider the context of an image?",
    options: [
      "An image can be misunderstood when removed from its original setting",
      "Images never communicate meaning",
      "Captions are always correct",
      "Context matters only in printed newspapers"
    ],
    answer: 0,
    explanation: "Context helps establish when, where, and why an image was created and shared."
  },

  // 51–60: Advertising and Persuasion
  {
    question: "What is the primary purpose of most commercial advertisements?",
    options: [
      "To promote a product or service",
      "To provide only neutral scientific data",
      "To prevent all purchases",
      "To eliminate competition"
    ],
    answer: 0,
    explanation: "Commercial advertisements generally aim to promote products, services, or brands."
  },
  {
    question: "What is a target audience?",
    options: [
      "The specific group a message is intended to reach",
      "Everyone who has ever used the internet",
      "The person who prints an advertisement",
      "A list of unrelated websites"
    ],
    answer: 0,
    explanation: "A target audience is the group a communicator intends to reach with a message."
  },
  {
    question: "What is a slogan?",
    options: [
      "A short, memorable phrase used to communicate a message or brand identity",
      "A complete research methodology",
      "A computer operating system",
      "A list of references"
    ],
    answer: 0,
    explanation: "A slogan is a concise phrase designed to be memorable and communicate a key idea."
  },
  {
    question: "What is the bandwagon technique in advertising?",
    options: [
      "Encouraging people to join because many others supposedly do",
      "Providing a full scientific report",
      "Listing only product ingredients",
      "Explaining how to cite a source"
    ],
    answer: 0,
    explanation: "Bandwagon appeals suggest that people should follow a trend because many others are doing so."
  },
  {
    question: "What is an emotional appeal?",
    options: [
      "A message designed to evoke feelings to influence an audience",
      "A message containing only numerical tables",
      "A bibliography",
      "A neutral file name"
    ],
    answer: 0,
    explanation: "Emotional appeals use feelings such as hope, fear, pride, or compassion to influence audiences."
  },
  {
    question: "What is a testimonial in advertising?",
    options: [
      "An endorsement or statement from a person about a product or service",
      "A computer error report",
      "A private search history",
      "A newspaper's publication date"
    ],
    answer: 0,
    explanation: "Testimonials use a person's statement or endorsement to promote a product, service, or idea."
  },
  {
    question: "What is product placement?",
    options: [
      "Featuring a branded product within entertainment or other content",
      "Placing books alphabetically in a library",
      "Removing advertisements from a website",
      "Checking a product's expiration date"
    ],
    answer: 0,
    explanation: "Product placement integrates a product or brand into a film, show, video, or other content."
  },
  {
    question: "What is persuasive language?",
    options: [
      "Language intended to influence attitudes, beliefs, or actions",
      "Language that contains no message",
      "A list of unrelated words",
      "A method of encrypting files"
    ],
    answer: 0,
    explanation: "Persuasive language aims to influence how an audience thinks or acts."
  },
  {
    question: "Why should consumers evaluate advertising claims?",
    options: [
      "Claims may be exaggerated, incomplete, or unsupported",
      "Every advertisement is guaranteed to be accurate",
      "Advertising never influences decisions",
      "A colorful design proves a product works"
    ],
    answer: 0,
    explanation: "Evaluating evidence and conditions helps consumers judge whether advertising claims are reliable."
  },
  {
    question: "What is sponsored content?",
    options: [
      "Content funded or supported by an advertiser or sponsor",
      "Content that has no creator",
      "A private handwritten note",
      "A document that cannot be shared"
    ],
    answer: 0,
    explanation: "Sponsored content is created or distributed with financial or other support from a sponsor and should be clearly disclosed where required."
  },

  // 61–70: Digital Citizenship and Online Safety
  {
    question: "What is digital citizenship?",
    options: [
      "Responsible, safe, and respectful participation in digital environments",
      "Having the most social media followers",
      "Using technology without rules",
      "Sharing every personal detail online"
    ],
    answer: 0,
    explanation: "Digital citizenship involves responsible and ethical behavior when using digital technologies."
  },
  {
    question: "What is a digital footprint?",
    options: [
      "The trail of information created by someone's online activities",
      "A physical mark on a computer",
      "A type of keyboard",
      "A file used only for printing"
    ],
    answer: 0,
    explanation: "A digital footprint consists of traces of information associated with a person's online activities."
  },
  {
    question: "Which is the strongest password practice?",
    options: [
      "Using your birthday",
      "Using the same short password everywhere",
      "Using long, unique passwords or passphrases for different accounts",
      "Sharing your password with classmates"
    ],
    answer: 2,
    explanation: "Long, unique passwords or passphrases reduce the risk that one compromised password exposes multiple accounts."
  },
  {
    question: "What is phishing?",
    options: [
      "A deceptive attempt to steal information by pretending to be trustworthy",
      "A legitimate method of backing up files",
      "A way to improve screen brightness",
      "A type of spreadsheet chart"
    ],
    answer: 0,
    explanation: "Phishing uses deceptive messages or websites to trick people into revealing sensitive information."
  },
  {
    question: "What should you do if an unknown message asks for your password?",
    options: [
      "Send the password immediately",
      "Verify the request through an official channel and never disclose your password",
      "Post the password publicly",
      "Forward the message to everyone"
    ],
    answer: 1,
    explanation: "Legitimate services should not require you to reveal your password in an unsolicited message."
  },
  {
    question: "What is two-factor authentication?",
    options: [
      "Using two different usernames",
      "Using two distinct types of verification to access an account",
      "Changing your screen color twice",
      "Saving two copies of a photograph"
    ],
    answer: 1,
    explanation: "Two-factor authentication adds a second verification factor beyond the password."
  },
  {
    question: "What is cyberbullying?",
    options: [
      "Using digital communication to bully, harass, or intimidate someone",
      "Giving respectful feedback",
      "Reporting a security problem",
      "Learning a new application"
    ],
    answer: 0,
    explanation: "Cyberbullying involves harmful behavior carried out through digital technologies."
  },
  {
    question: "What is an appropriate response to cyberbullying?",
    options: [
      "Join in and spread the content",
      "Save relevant evidence, block or report the account, and seek help from a trusted adult when needed",
      "Publish the person's private information",
      "Create a fake account to retaliate"
    ],
    answer: 1,
    explanation: "Documenting relevant evidence, using reporting tools, and seeking trusted support can help address cyberbullying safely."
  },
  {
    question: "Why should you avoid sharing your home address publicly?",
    options: [
      "It may expose you to privacy and safety risks",
      "It improves account security",
      "It makes every post more accurate",
      "It prevents people from seeing your profile"
    ],
    answer: 0,
    explanation: "Publicly sharing precise personal details can increase privacy and safety risks."
  },
  {
    question: "What should you do before connecting to public Wi-Fi for sensitive activities?",
    options: [
      "Assume every public network is safe",
      "Use trusted security measures, verify the network, and avoid sensitive transactions on untrusted connections",
      "Disable every security feature",
      "Share your login details with other users"
    ],
    answer: 1,
    explanation: "Public networks can pose risks. Verifying the network and using secure connections help protect sensitive activity."
  },

  // 71–80: Copyright, Ethics, and Responsible Use
  {
    question: "What is copyright?",
    options: [
      "Legal protection for eligible original creative works",
      "A guarantee that every online post is accurate",
      "A type of internet connection",
      "A way to remove every author's name"
    ],
    answer: 0,
    explanation: "Copyright gives creators certain legal rights over eligible original works."
  },
  {
    question: "What is plagiarism?",
    options: [
      "Acknowledging an author's work",
      "Presenting another person's words or ideas as your own without proper acknowledgment",
      "Writing an original paragraph",
      "Using a citation correctly"
    ],
    answer: 1,
    explanation: "Plagiarism involves using another person's work or ideas without appropriate acknowledgment."
  },
  {
    question: "Why should you cite sources in a school research project?",
    options: [
      "To acknowledge the original creators and support verification",
      "To make the project appear longer without evidence",
      "To hide the origin of information",
      "To avoid reading sources"
    ],
    answer: 0,
    explanation: "Citations credit original creators and help readers locate and verify sources."
  },
  {
    question: "What does public domain mean?",
    options: [
      "Works that are not protected by copyright or whose copyright has expired or been waived as applicable",
      "Every work posted on social media",
      "Every image found through a search engine",
      "A private folder on a computer"
    ],
    answer: 0,
    explanation: "Public-domain works are not restricted by copyright in the relevant jurisdiction, though other rights or rules may still apply."
  },
  {
    question: "Does finding an image through a search engine automatically make it free to use?",
    options: [
      "Yes, every image is free",
      "No, you must check its license and applicable usage conditions",
      "Yes, if the image is attractive",
      "Yes, if you remove the creator's name"
    ],
    answer: 1,
    explanation: "Search engines display images with different rights and licenses. Users must check the applicable permissions."
  },
  {
    question: "What is Creative Commons?",
    options: [
      "A set of licenses that lets creators communicate permissions for using their works",
      "A social media password",
      "A computer virus",
      "A guarantee that a work has no restrictions"
    ],
    answer: 0,
    explanation: "Creative Commons licenses allow creators to grant specified permissions under stated conditions."
  },
  {
    question: "What is fair use or fair dealing?",
    options: [
      "A universal rule allowing unlimited copying",
      "Legal doctrines or exceptions that permit certain uses under specific conditions, depending on jurisdiction",
      "A guarantee that attribution makes every use legal",
      "A rule applying only to photographs"
    ],
    answer: 1,
    explanation: "Fair use and fair dealing depend on the relevant law and circumstances; neither permits every kind of copying."
  },
  {
    question: "What is netiquette?",
    options: [
      "Appropriate and respectful behavior when communicating online",
      "A computer's network cable",
      "A type of online advertisement",
      "A method of deleting files"
    ],
    answer: 0,
    explanation: "Netiquette refers to conventions for polite and respectful online communication."
  },
  {
    question: "What should you do when using another person's work in a presentation?",
    options: [
      "Claim that you created it",
      "Follow the license or permission requirements and provide appropriate attribution",
      "Remove all identifying information",
      "Assume educational use always permits every use"
    ],
    answer: 1,
    explanation: "You should respect applicable rights and licensing terms and credit creators appropriately."
  },
  {
    question: "What is ethical media creation?",
    options: [
      "Creating content that respects accuracy, privacy, fairness, and other people's rights",
      "Publishing rumors to attract attention",
      "Using any image without checking permission",
      "Editing evidence to deceive an audience"
    ],
    answer: 0,
    explanation: "Ethical media creation considers accuracy, consent, privacy, fairness, and applicable rights."
  },

  // 81–90: Technology and Information Management
  {
    question: "What is a search engine?",
    options: [
      "A tool that helps users find online information",
      "A physical printer",
      "A type of camera lens",
      "A word-processing font"
    ],
    answer: 0,
    explanation: "Search engines index or retrieve online content to help users find relevant information."
  },
  {
    question: "Which search query is likely to be more precise?",
    options: [
      "Science",
      "Everything about water",
      "effects of plastic pollution on marine ecosystems research",
      "Information"
    ],
    answer: 2,
    explanation: "A focused query with specific terms is more likely to return relevant results."
  },
  {
    question: "What is cloud storage?",
    options: [
      "Storing files on remote servers accessed through a network",
      "Keeping documents only in a paper folder",
      "Saving information inside a television screen",
      "Printing files without saving them"
    ],
    answer: 0,
    explanation: "Cloud storage allows files to be stored on remote servers and accessed over a network."
  },
  {
    question: "Why is backing up important files useful?",
    options: [
      "It can help recover information after loss or device failure",
      "It guarantees that devices cannot be hacked",
      "It removes the need for passwords",
      "It makes every file publicly accessible"
    ],
    answer: 0,
    explanation: "Backups help restore files if the originals are deleted, damaged, or lost."
  },
  {
    question: "What is metadata?",
    options: [
      "Data that describes other data",
      "A type of computer monitor",
      "A fictional character",
      "A method of charging a phone"
    ],
    answer: 0,
    explanation: "Metadata describes characteristics of other data, such as a file's creation date or an image's camera details."
  },
  {
    question: "What is an algorithm on a social media platform?",
    options: [
      "A set of computational rules or procedures used to process information or rank content",
      "A physical keyboard",
      "A handwritten essay",
      "A guarantee that every recommendation is correct"
    ],
    answer: 0,
    explanation: "Algorithms process information and may determine how content is ranked, recommended, or displayed."
  },
  {
    question: "What is a filter bubble?",
    options: [
      "An environment where personalized content may limit exposure to different perspectives",
      "A device that cleans a computer screen",
      "A type of printer paper",
      "A system that verifies every claim"
    ],
    answer: 0,
    explanation: "Personalization can narrow the range of content a person encounters, potentially limiting exposure to other viewpoints."
  },
  {
    question: "What is artificial intelligence (AI)?",
    options: [
      "Technology designed to perform tasks associated with abilities such as learning, prediction, or language processing",
      "A type of printed newspaper",
      "A guarantee of perfect accuracy",
      "A synonym for the internet"
    ],
    answer: 0,
    explanation: "AI refers to computational systems designed to perform tasks that may involve learning, reasoning, prediction, or language processing."
  },
  {
    question: "Why should AI-generated information be checked?",
    options: [
      "AI systems can produce inaccurate or fabricated information",
      "AI is always wrong",
      "AI never uses language",
      "AI-generated text is automatically a primary source"
    ],
    answer: 0,
    explanation: "AI systems can make mistakes or generate unsupported claims, so important information should be verified."
  },
  {
    question: "What is data privacy?",
    options: [
      "The appropriate handling and protection of personal information",
      "Publishing all personal details online",
      "A way to make every file public",
      "A method of increasing screen brightness"
    ],
    answer: 0,
    explanation: "Data privacy concerns how personal information is collected, used, stored, and shared."
  },

  // 91–100: Media Production and Critical Thinking
  {
    question: "What should be considered first when planning a media project?",
    options: [
      "The purpose and intended audience",
      "The number of decorative stickers",
      "The most expensive equipment",
      "The color of the editor's desk"
    ],
    answer: 0,
    explanation: "Purpose and audience guide the content, format, tone, and design of a media project."
  },
  {
    question: "What is a storyboard?",
    options: [
      "A sequence of visual panels used to plan scenes or shots",
      "A password storage system",
      "A list of unrelated references",
      "A printed receipt"
    ],
    answer: 0,
    explanation: "A storyboard visually organizes planned scenes or shots before production."
  },
  {
    question: "Why is a script useful when producing a video?",
    options: [
      "It organizes dialogue, narration, and planned actions",
      "It guarantees that the video will go viral",
      "It replaces all editing",
      "It prevents viewers from interpreting the message"
    ],
    answer: 0,
    explanation: "A script helps creators organize what will be said and what will happen during production."
  },
  {
    question: "What is the purpose of video editing?",
    options: [
      "To organize and refine footage, audio, transitions, and other elements",
      "To guarantee that every scene is factual",
      "To eliminate the need for planning",
      "To make every video the same length"
    ],
    answer: 0,
    explanation: "Editing shapes the sequence and presentation of footage to communicate the intended message."
  },
  {
    question: "Why is audio quality important in a video?",
    options: [
      "Clear audio helps audiences understand speech and other sounds",
      "Audio quality determines whether every claim is true",
      "Good audio eliminates the need for visuals",
      "Audio should always be louder than speech"
    ],
    answer: 0,
    explanation: "Clear, balanced audio improves intelligibility and the overall viewing experience."
  },
  {
    question: "What is visual hierarchy in graphic design?",
    options: [
      "Arranging elements to guide attention according to importance",
      "Putting every element at the same size",
      "Using as many fonts as possible",
      "Removing all spacing"
    ],
    answer: 0,
    explanation: "Visual hierarchy uses size, placement, contrast, and other features to guide the viewer's attention."
  },
  {
    question: "Why is contrast important in a poster?",
    options: [
      "It can make text and important elements easier to distinguish",
      "It guarantees that every claim is accurate",
      "It removes the need for readable fonts",
      "It makes all colors identical"
    ],
    answer: 0,
    explanation: "Adequate contrast helps viewers distinguish elements and read text more easily."
  },
  {
    question: "What is an infographic?",
    options: [
      "A visual presentation of information or data",
      "A private password",
      "A type of computer cable",
      "A sound-only recording"
    ],
    answer: 0,
    explanation: "Infographics communicate information through visual elements such as charts, icons, labels, and concise text."
  },
  {
    question: "What is the best way to present statistics in a media report?",
    options: [
      "Remove the source and context",
      "Use accurate figures, explain their context, and cite reliable sources",
      "Change the values to make the design attractive",
      "Show only figures that support a preferred conclusion"
    ],
    answer: 1,
    explanation: "Accurate figures, context, and citations help audiences interpret statistics responsibly."
  },
  {
    question: "What is the most responsible action before publishing a news-style school post?",
    options: [
      "Publish immediately without checking",
      "Verify facts, names, dates, permissions, and relevant privacy concerns",
      "Add rumors to make the post interesting",
      "Use any image without considering its source"
    ],
    answer: 1,
    explanation: "Checking accuracy, permissions, and privacy helps ensure that published content is responsible and trustworthy."
  }
]
};

function shuffleQuizQuestions(questions) {
  const shuffled = questions.slice();

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function startQuiz() {
  if (!quizContent) {
    console.error("Quick Quiz: quizContent element was not found.");
    return;
  }

  const selectedCategory = quizCategory
    ? quizCategory.value
    : "mixed";

  let availableQuestions;

  if (selectedCategory === "mixed") {
    availableQuestions = [
      ...quizQuestionBank.science,
      ...quizQuestionBank.mathematics,
      ...quizQuestionBank.english,
      ...quizQuestionBank.mil
    ];
  } else {
    availableQuestions = quizQuestionBank[selectedCategory] || [];
  }

  if (availableQuestions.length === 0) {
    quizContent.textContent = "No questions are available for this category.";
    return;
  }

  const questions = shuffleQuizQuestions(availableQuestions).slice(0, 20);
  let currentQuestion = 0;
  let score = 0;

  showQuestion();

  function showQuestion() {
    quizContent.replaceChildren();

    if (currentQuestion >= questions.length) {
      showResults();
      return;
    }

    const question = questions[currentQuestion];

    quizContent.appendChild(
      createElement(
        "p",
        "quiz-progress",
        "Question " + (currentQuestion + 1) + " of " + questions.length
      )
    );

    quizContent.appendChild(
      createElement("h3", "quiz-question", question.question)
    );

    const optionsContainer = createElement("div", "quiz-options");
    let answered = false;

    question.options.forEach(function (option, index) {
      const optionButton = createElement("button", "quiz-option", option);
      optionButton.type = "button";

      optionButton.addEventListener("click", function () {
        if (answered) return;

        answered = true;
        const correct = index === question.answer;

        if (correct) score++;

        optionsContainer.querySelectorAll(".quiz-option").forEach(
          function (button, buttonIndex) {
            button.disabled = true;

            if (buttonIndex === question.answer) {
              button.classList.add("correct");
            } else if (buttonIndex === index) {
              button.classList.add("incorrect");
            }
          }
        );

        quizContent.appendChild(
          createElement(
            "p",
            "quiz-feedback",
            correct
              ? "Correct! Well done."
              : "Not quite. The correct answer is: " +
                question.options[question.answer]
          )
        );

        quizContent.appendChild(
          createElement("p", "quiz-explanation", question.explanation)
        );

        const nextButton = createElement(
          "button",
          "primary-btn",
          currentQuestion === questions.length - 1
            ? "See Results"
            : "Next Question"
        );

        nextButton.type = "button";

        nextButton.addEventListener("click", function () {
          currentQuestion++;
          showQuestion();
        });

        quizContent.appendChild(nextButton);
      });

      optionsContainer.appendChild(optionButton);
    });

    quizContent.appendChild(optionsContainer);
  }

  function showResults() {
    quizContent.replaceChildren();

    const percentage = Math.round((score / questions.length) * 100);
    const quizHistory = loadData("studysphere_quiz_history", []);

const quizResult = {
  category: selectedCategory,
  score: score,
  total: questions.length,
  percentage: percentage,
  date: new Date().toLocaleString()
};

quizHistory.push(quizResult);

saveData("studysphere_quiz_history", quizHistory);

    let message;

    if (percentage >= 90) {
      message = "Excellent! You have a strong understanding of this subject.";
    } else if (percentage >= 75) {
      message = "Great job! Review a few concepts to strengthen your understanding.";
    } else if (percentage >= 50) {
      message = "Good effort! Review the explanations and try again.";
    } else {
      message = "Keep practicing! Review the explanations and give it another try.";
    }

    quizContent.appendChild(
      createElement("h3", "quiz-score", "Quiz Completed!")
    );

    quizContent.appendChild(
      createElement(
        "p",
        "quiz-score",
        "Your Score: " + score + " out of " + questions.length
      )
    );

    quizContent.appendChild(
      createElement("p", "quiz-percentage", "Percentage: " + percentage + "%")
    );

    quizContent.appendChild(
      createElement("p", "quiz-result-message", message)
    );
    const savedQuizHistory = loadData("studysphere_quiz_history", []);

const highestScore = Math.max(
  ...savedQuizHistory.map(function (result) {
    return result.percentage;
  }),
  0
);

quizContent.appendChild(
  createElement("h3", "quiz-score", "Your Quiz Progress")
);

quizContent.appendChild(
  createElement(
    "p",
    "quiz-score",
    "Quizzes Completed: " + savedQuizHistory.length
  )
);

quizContent.appendChild(
  createElement(
    "p",
    "quiz-score",
    "Highest Score: " + highestScore + "%"
  )
);

quizContent.appendChild(
  createElement("h4", "quiz-history-title", "Quiz History")
);

const historyList = createElement("div", "quiz-history-list");

savedQuizHistory.slice().reverse().forEach(function (result) {
  historyList.appendChild(
    createElement(
      "p",
      "quiz-history-item",
      result.category.toUpperCase() +
        " — " +
        result.score +
        "/" +
        result.total +
        " (" +
        result.percentage +
        "%) — " +
        result.date
    )
  );
});

quizContent.appendChild(historyList);

    const retryButton = createElement("button", "primary-btn", "Try Again");
    retryButton.type = "button";
    retryButton.addEventListener("click", startQuiz);

    quizContent.appendChild(retryButton);
  }
}

if (startQuizButton) {
  startQuizButton.addEventListener("click", startQuiz);
}

 
  // ---------- STUDY TIMER ----------
  const timerDisplay = getElement("timerDisplay");
  const timerStartButton = getElement("timerStart");
  const timerResetButton = getElement("timerReset");
  const timerMessage = getElement("timerMessage");
  const timerOptions = document.querySelectorAll(".timer-option");

  let selectedMinutes = 25;
  let secondsRemaining = selectedMinutes * 60;
  let timerInterval = null;
  let isRunning = false;

const focusStatus = document.getElementById("focusStatus");
const focusMessage = document.getElementById("focusMessage");

function setFocusMode(active) {
  document.body.classList.toggle("focus-mode-active", active);

  if (focusStatus) {
    focusStatus.classList.toggle("active", active);
    focusStatus.innerHTML =
      '<span class="focus-dot"></span>' +
      (active ? " Focus Mode is on" : " Focus Mode is off");
  }

  if (focusMessage) {
    focusMessage.textContent = active
      ? "Stay on your task. Your study session is in progress."
      : "Start your study timer to activate Focus Mode.";
  }
}

setFocusMode(false);

  function updateTimerDisplay() {
    if (!timerDisplay) return;

    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;

    timerDisplay.textContent =
      String(minutes).padStart(2, "0") + ":" +
      String(seconds).padStart(2, "0");
  }

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    isRunning = false;

    if (timerStartButton) {
      timerStartButton.textContent = "Start";
    }
  }

  function completeStudySession() {
    const studyLog = getStudyLog();
    const today = getTodayKey();

    if (!studyLog[today]) {
      studyLog[today] = {
        minutes: 0,
        sessions: 0
      };
    }

    studyLog[today].minutes += selectedMinutes;
    studyLog[today].sessions += 1;

    saveData(studyLogKey, studyLog);

    stopTimer();
    updateStudyGoals();

    showMessage(
      timerMessage,
      "Session complete! Your study time has been saved."
    );
  }

  timerOptions.forEach(function (button) {
    button.addEventListener("click", function () {
      stopTimer();

      selectedMinutes = Number(button.dataset.minutes) || 25;
      secondsRemaining = selectedMinutes * 60;

      timerOptions.forEach(function (option) {
        option.classList.toggle("selected", option === button);
      });

      showMessage(timerMessage, "Ready when you are!");
      updateTimerDisplay();
    });
  });

  if (timerStartButton) {
    timerStartButton.addEventListener("click", function () {
     
if (isRunning) {
  stopTimer();
  setFocusMode(false);
  showMessage(timerMessage, "Timer paused. Focus Mode is off.");
  return;
}


      if (secondsRemaining <= 0) {
        secondsRemaining = selectedMinutes * 60;
      }

      isRunning = true;
    
setFocusMode(true);
timerStartButton.textContent = "Pause";
showMessage(timerMessage, "Stay focused. You've got this!");

      timerStartButton.textContent = "Pause";

      showMessage(timerMessage, "Stay focused. You've got this!");

      timerInterval = setInterval(function () {
        if (secondsRemaining > 0) {
          secondsRemaining--;
        }

        updateTimerDisplay();

        if (secondsRemaining <= 0) {
          completeStudySession();
        }
      }, 1000);
    });
  }

  if (timerResetButton) {
    timerResetButton.addEventListener("click", function () {
      stopTimer();

      secondsRemaining = selectedMinutes * 60;

      showMessage(timerMessage, "Timer reset.");
      updateTimerDisplay();
    });
  }

  updateTimerDisplay();


 

  // ---------- PROGRESS TRACKING ----------

  function updateProgress() {
    const completed = tasks.filter(function (task) {
      return task.completed;
    }).length;

    const total = tasks.length;
    const pending = total - completed;

    const percentage = total === 0
      ? 0
      : Math.round((completed / total) * 100);

    const totalTasks = getElement("totalTasks");
    const completedTasks = getElement("completedTasks");
    const pendingTasks = getElement("pendingTasks");

    const progressBar = getElement("progressBar");
    const progressText = getElement("progressText");

    const progressCompleted = getElement("progressCompleted");
    const progressPending = getElement("progressPending");
    const progressTotal = getElement("progressTotal");

    if (totalTasks) totalTasks.textContent = total;
    if (completedTasks) completedTasks.textContent = completed;
    if (pendingTasks) pendingTasks.textContent = pending;

    if (progressBar) {
      progressBar.style.width = percentage + "%";
      progressBar.setAttribute("aria-valuenow", String(percentage));
    }

    if (progressText) {
      progressText.textContent = percentage + "% completed";
    }

    if (progressCompleted) {
      progressCompleted.textContent = completed;
    }

    if (progressPending) {
      progressPending.textContent = pending;
    }

    if (progressTotal) {
      progressTotal.textContent = total;
    }
  }

  // ---------- REFRESH DASHBOARD ----------

 function renderAll() {
    renderTasks();
    updateProgress();
    renderDeadlineReminders();
}

  renderAll();
  renderSchedules();
  renderFlashcards();
  updateTimerDisplay();
  // ===============================
// DIGITAL NOTES
// ===============================

const notesForm = document.getElementById("notesForm");
const noteTitle = document.getElementById("noteTitle");
const noteContent = document.getElementById("noteContent");
const notesList = document.getElementById("notesList");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let notes = loadData("studysphere_notes");
let editingNoteId = null;

function renderNotes() {
    if (!notesList) return;

    notesList.replaceChildren();

    if (notes.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No notes yet. Create your first study note!";
        notesList.appendChild(emptyMessage);
        return;
    }

    notes.forEach(function (note) {
        const noteCard = document.createElement("div");
        noteCard.className = "note-card";

        const title = document.createElement("h3");
        title.textContent = note.title;

        const content = document.createElement("p");
        content.textContent = note.content;
        content.style.whiteSpace = "pre-wrap";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "✏️ Edit";

        editButton.addEventListener("click", function () {
            noteTitle.value = note.title;
            noteContent.value = note.content;
            editingNoteId = note.id;

            saveNoteBtn.textContent = "Update Note";
            cancelEditBtn.hidden = false;

            noteTitle.focus();
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "🗑️ Delete";

        deleteButton.addEventListener("click", function () {
            const confirmed = confirm("Are you sure you want to delete this note?");

            if (!confirmed) return;

            notes = notes.filter(function (item) {
                return item.id !== note.id;
            });

            saveData("studysphere_notes", notes);

            if (editingNoteId === note.id) {
                resetNoteForm();
            }

            renderNotes();
        });

        noteCard.appendChild(title);
        noteCard.appendChild(content);
        noteCard.appendChild(editButton);
        noteCard.appendChild(deleteButton);

        notesList.appendChild(noteCard);
    });
}

function resetNoteForm() {
    if (!notesForm) return;

    notesForm.reset();
    editingNoteId = null;
    saveNoteBtn.textContent = "Save Note";
    cancelEditBtn.hidden = true;
}

if (notesForm && noteTitle && noteContent && notesList) {
    notesForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const title = noteTitle.value.trim();
        const content = noteContent.value.trim();

        if (!title || !content) {
            alert("Please enter both a title and note content.");
            return;
        }

        if (editingNoteId !== null) {
            notes = notes.map(function (note) {
                if (note.id === editingNoteId) {
                    return {
                        ...note,
                        title: title,
                        content: content
                    };
                }

                return note;
            });
        } else {
            notes.push({
                id: makeId(),
                title: title,
                content: content,
                createdAt: new Date().toISOString()
            });
        }

        saveData("studysphere_notes", notes);

        resetNoteForm();
        renderNotes();

        alert("Your note has been saved!");
    });

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", resetNoteForm);
    }

    renderNotes();
}

  console.log("StudySphere is ready!");
});

/* ---------- LIGHT / DARK MODE ---------- */

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.classList.toggle("dark-mode", isDark);

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  if (themeIcon) {
    themeIcon.textContent = isDark ? "🌙" : "☀️";
  }

  if (themeLabel) {
    themeLabel.textContent = isDark ? "Dark Mode" : "Light Mode";
  }

  try {
    localStorage.setItem("studysphere_theme", theme);
  } catch (error) {
    console.warn("Unable to save theme preference.");
  }
}

let savedTheme = "light";

try {
  savedTheme = localStorage.getItem("studysphere_theme") || "light";
} catch (error) {
  savedTheme = "light";
}

applyTheme(savedTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", function () {
    const isDark = document.body.classList.contains("dark-mode");
    applyTheme(isDark ? "light" : "dark");
  });
}

/* ---------- GLOBAL SEARCH FUNCTIONALITY ---------- */

(function initializeGlobalSearch() {
  const searchInput = document.getElementById("globalSearchInput");
  const clearButton = document.getElementById("clearSearchBtn");
  const resultsBox = document.getElementById("globalSearchResults");

  if (!searchInput || !clearButton || !resultsBox) {
    console.warn("StudySphere search elements were not found.");
    return;
  }

  const searchSections = [
    {
      name: "Assignments",
      pageId: "assignments",
      listId: "taskList"
    },
    {
      name: "Digital Notes",
      pageId: "notes",
      listId: "notesList"
    },
    {
      name: "Flashcards",
      pageId: "flashcards",
      listId: "flashcardList"
    }
  ];

  function searchStudyMaterials(query) {
    resultsBox.replaceChildren();

    if (!query.trim()) {
      resultsBox.classList.remove("visible");
      return;
    }

    const matches = [];
    const normalizedQuery = query.trim().toLowerCase();

    searchSections.forEach(function (section) {
      const list = document.getElementById(section.listId);

      if (!list) return;

      Array.from(list.children).forEach(function (item) {
        const text = item.textContent.trim();

        if (
          text &&
          !item.classList.contains("empty-message") &&
          text.toLowerCase().includes(normalizedQuery)
        ) {
          matches.push({
            section: section,
            element: item,
            text: text
          });
        }
      });
    });

    resultsBox.classList.add("visible");

    if (matches.length === 0) {
      const message = document.createElement("p");
      message.textContent = "No matching assignments, notes, or flashcards found.";
      message.style.padding = "10px";
      resultsBox.appendChild(message);
      return;
    }

    matches.slice(0, 15).forEach(function (match) {
      const resultButton = document.createElement("button");
      resultButton.type = "button";
      resultButton.className = "global-search-result";

      const title = document.createElement("strong");
      title.textContent = match.text.replace(/\s+/g, " ").slice(0, 100);

      const category = document.createElement("small");
      category.textContent = match.section.name;

      resultButton.appendChild(title);
      resultButton.appendChild(category);

      resultButton.addEventListener("click", function () {
        const page = document.getElementById(match.section.pageId);

        if (page) {
          const navButton = document.querySelector(
            '.nav-btn[data-page="' + match.section.pageId + '"]'
          );

          if (navButton) {
            navButton.click();
          } else {
            document.querySelectorAll(".page").forEach(function (section) {
              section.classList.remove("active-page");
            });
            page.classList.add("active-page");
          }

          setTimeout(function () {
            match.element.scrollIntoView({
              behavior: "smooth",
              block: "center"
            });
          }, 100);
        }

        resultsBox.classList.remove("visible");
        searchInput.value = "";
      });

      resultsBox.appendChild(resultButton);
    });
  }

  searchInput.addEventListener("input", function () {
    searchStudyMaterials(searchInput.value);
  });

  clearButton.addEventListener("click", function () {
    searchInput.value = "";
    resultsBox.replaceChildren();
    resultsBox.classList.remove("visible");
    searchInput.focus();
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".global-search")) {
      resultsBox.classList.remove("visible");
    }
  });
})();

