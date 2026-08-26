/* =========================================================
   SMARTSCHED
   Intelligent School Scheduling System
   Offline HTML/CSS/JavaScript Prototype
   ========================================================= */


/* =========================================================
   DATABASE
   ========================================================= */

let db = JSON.parse(localStorage.getItem("smartschedDB")) || {

    teachers: [],
    subjects: [],
    sections: [],
    rooms: [],
    assignments: [],
    schedule: [],

    /*
     Scheduling Objectives — stored as 0–1 weights so they persist
     across reloads and actually drive generateSchedule() instead
     of just sitting on the sliders as decoration.
    */
    objectives: {
        workloadBalance: 0.85,
        roomEfficiency: 0.75,
        morningPreference: 0.60,
        teacherFreePeriods: 0.80
    },

    /*
     AUTO REPAIR — when on, the Conflicts page regenerates the
     schedule by itself the moment it finds a conflict or an
     unplaced assignment, instead of waiting for someone to click
     "Apply Automatic Repair".
    */
    autoRepair: false,

    timeslots: [
        { id: 1, time: "7:30–8:30", type: "class" },
        { id: 2, time: "8:30–9:30", type: "class" },
        { id: 3, time: "9:30–10:00", type: "break" },
        { id: 4, time: "10:00–11:00", type: "class" },
        { id: 5, time: "11:00–12:00", type: "class" },
        { id: 6, time: "12:00–1:00", type: "break" },
        { id: 7, time: "1:00–2:00", type: "class" },
        { id: 8, time: "2:00–3:00", type: "class" },
        { id: 9, time: "3:00–4:00", type: "class" },
        { id: 10, time: "4:00–5:00", type: "class" }
    ]

};

/*
 Backfill for anyone with existing saved data from before the
 Scheduling Objectives sliders were wired up — without this,
 users who already have a smartschedDB in localStorage would hit
 "Cannot read properties of undefined" the first time
 generateSchedule() reads db.objectives.
*/
if (!db.objectives) {

    db.objectives = {
        workloadBalance: 0.85,
        roomEfficiency: 0.75,
        morningPreference: 0.60,
        teacherFreePeriods: 0.80
    };

}

/*
 Backfill for anyone with existing saved data from before Auto
 Repair existed.
*/
if (typeof db.autoRepair !== "boolean") {

    db.autoRepair = false;

}



/* =========================================================
   DAYS
   ========================================================= */

const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday"
];


/* =========================================================
   SAVE DATABASE
   ========================================================= */

function saveDB() {

    localStorage.setItem(
        "smartschedDB",
        JSON.stringify(db)
    );

}


/* =========================================================
   SCHEDULING OBJECTIVES
   The four sliders on the Generate page. Values are read live
   from the DOM (so whatever the user has dragged them to right
   before clicking Generate is what's used), persisted to
   db.objectives so they survive a refresh, and restored onto
   the sliders on load.
   ========================================================= */

let objectiveWeights = db.objectives;

function readObjectiveWeights() {

    const pct = id => {

        const el = document.getElementById(id);

        return el ? Number(el.value) / 100 : null;

    };

    const workloadBalance = pct("objWorkloadBalance");
    const roomEfficiency = pct("objRoomEfficiency");
    const morningPreference = pct("objMorningPreference");
    const teacherFreePeriods = pct("objTeacherFreePeriods");

    return {

        workloadBalance:
            workloadBalance === null
                ? db.objectives.workloadBalance
                : workloadBalance,

        roomEfficiency:
            roomEfficiency === null
                ? db.objectives.roomEfficiency
                : roomEfficiency,

        morningPreference:
            morningPreference === null
                ? db.objectives.morningPreference
                : morningPreference,

        teacherFreePeriods:
            teacherFreePeriods === null
                ? db.objectives.teacherFreePeriods
                : teacherFreePeriods

    };

}

function updateObjectiveDisplay(id) {

    const el = document.getElementById(id);
    const valueEl = document.getElementById(id + "Value");

    if (valueEl) {
        valueEl.textContent = el.value + "%";
    }

    /*
     Persist immediately on drag, not just at Generate time, so
     the preference survives a refresh even if the user never
     clicks Generate this session.
    */

    objectiveWeights = readObjectiveWeights();
    db.objectives = objectiveWeights;

    saveDB();

}

function initObjectiveSliders() {

    const stored = db.objectives;

    const map = {
        objWorkloadBalance: stored.workloadBalance,
        objRoomEfficiency: stored.roomEfficiency,
        objMorningPreference: stored.morningPreference,
        objTeacherFreePeriods: stored.teacherFreePeriods
    };

    Object.entries(map).forEach(([id, weight]) => {

        const el = document.getElementById(id);
        const valueEl = document.getElementById(id + "Value");

        if (!el || weight === undefined) return;

        el.value = Math.round(weight * 100);

        if (valueEl) {
            valueEl.textContent = el.value + "%";
        }

    });

    objectiveWeights = stored;

}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

document.querySelectorAll(".nav-item").forEach(button => {

    button.addEventListener("click", () => {

        const page = button.dataset.page;

        showPage(page);

    });

});


function showPage(page) {

    document.querySelectorAll(".page").forEach(p => {
        p.classList.remove("active");
    });

    const selected = document.getElementById(page);

    if (selected) {
        selected.classList.add("active");
    }

    document.querySelectorAll(".nav-item").forEach(item => {

        item.classList.remove("active");

        if (item.dataset.page === page) {
            item.classList.add("active");
        }

    });

    const title =
        page.charAt(0).toUpperCase() +
        page.slice(1).replace("-", " ");

    document.getElementById("pageTitle").textContent = title;

    renderAll();

}


/* =========================================================
   MOBILE MENU
   ========================================================= */

document.getElementById("mobileMenu").addEventListener(
    "click",
    () => {

        document.getElementById("sidebar")
            .classList.toggle("open");

    }
);


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

    document.getElementById("teacherCount").textContent =
        db.teachers.length;

    document.getElementById("sectionCount").textContent =
        db.sections.length;

    document.getElementById("subjectCount").textContent =
        db.subjects.length;

    document.getElementById("roomCount").textContent =
        db.rooms.length;

    document.getElementById("scheduledCount").textContent =
        db.schedule.length;

    const conflicts = detectConflicts();

    const unplacedCount =
        (db.unplaced || []).length;

    document.getElementById("teacherConflicts").textContent =
        conflicts.teacher;

    document.getElementById("roomConflicts").textContent =
        conflicts.room;

    document.getElementById("sectionConflicts").textContent =
        conflicts.section;

    document.getElementById("sidebarConflict").textContent =
        conflicts.total + unplacedCount;

    const health = calculateHealth();

    document.getElementById("healthScore").textContent =
        health;

    document.getElementById("healthBig").textContent =
        health;

    document.getElementById("healthTeacherConflict").textContent =
        conflicts.teacher;

    document.getElementById("healthRoomConflict").textContent =
        conflicts.room;

}


/* =========================================================
   TEACHERS
   ========================================================= */

function renderTeachers() {

    const table =
        document.getElementById("teacherTable");

    if (!table) return;

    const search =
        document.getElementById("teacherSearch")?.value
        ?.toLowerCase() || "";

    table.innerHTML = "";

    db.teachers
        .filter(t =>
            t.name.toLowerCase().includes(search)
        )
        .forEach(t => {

            const assigned =
                db.assignments
                    .filter(a => a.teacherId === t.id)
                    .reduce((sum, a) => sum + Number(a.hours), 0);

            const utilization =
                t.maxHours
                    ? Math.round((assigned / t.maxHours) * 100)
                    : 0;

            const room =
                db.rooms.find(r => r.id === t.roomId);

            const advisory =
                t.isAdviser
                    ? db.sections.find(s => s.id === t.advisorySectionId)
                    : null;

            const row = document.createElement("tr");

            row.innerHTML = `

                <td>
                    <strong>${t.name}</strong><br>
                    <small>${t.employeeId || ""}</small>
                </td>

                <td>${t.department || "General"}</td>

                <td>${room ? room.name : "<em>Auto-assign</em>"}</td>

                <td>
                    ${advisory
                        ? `<span class="table-status">Adviser · ${advisory.grade} ${advisory.name}</span>`
                        : `<span class="table-status muted">Non-Adviser</span>`}
                </td>

                <td>${t.maxHours} hrs</td>

                <td>${assigned} hrs</td>

                <td>
                    <span class="table-status">
                        ${utilization > 100 ? "Overloaded" : "Active"}
                    </span>
                </td>

                <td>
                    <button class="action-btn"
                        onclick="deleteTeacher(${t.id})">
                        Delete
                    </button>
                </td>

            `;

            table.appendChild(row);

        });

}


function openTeacherModal() {

    const roomOptions =
        db.rooms.map(r =>
            `<option value="${r.id}">
                ${r.name} (${r.type})
            </option>`
        ).join("");

    const sectionOptions =
        db.sections.map(s =>
            `<option value="${s.id}">
                ${s.grade} - ${s.name}
            </option>`
        ).join("");

    openModal(
        "Add Teacher",
        `
        <form onsubmit="addTeacher(event)">

            <label>Teacher Name</label>

            <input id="teacherName"
                required
                placeholder="e.g. Juan Santos">

            <label>Employee ID</label>

            <input id="employeeId"
                placeholder="EMP-001">

            <label>Department</label>

            <input id="teacherDepartment"
                placeholder="Mathematics">

            <label>Maximum Weekly Hours</label>

            <input id="teacherHours"
                type="number"
                value="30"
                min="1">

            <label>Designated Classroom</label>

            <select id="teacherRoom">
                <option value="">— Auto-assign a classroom —</option>
                ${roomOptions}
            </select>
            <small class="form-hint">
                The section rotates to this teacher's room for every period.
                (Not used for PE — PE always meets in the Gym.)
            </small>

            <label>Class Adviser Of</label>

            <select id="teacherAdvisory">
                <option value="">— Not a Class Adviser —</option>
                ${sectionOptions}
            </select>

            <button class="primary-btn modal-submit">
                Add Teacher
            </button>

        </form>
        `
    );

}


function addTeacher(event) {

    event.preventDefault();

    const roomValue =
        document.getElementById("teacherRoom").value;

    const advisoryValue =
        document.getElementById("teacherAdvisory").value;

    if (advisoryValue) {

        const existingAdviser =
            db.teachers.find(
                t => t.advisorySectionId === Number(advisoryValue)
            );

        if (existingAdviser) {

            toast(
                `Note: ${existingAdviser.name} is already the adviser of that section.`
            );

        }

    }

    db.teachers.push({

        id: Date.now(),

        name:
            document.getElementById("teacherName").value,

        employeeId:
            document.getElementById("employeeId").value,

        department:
            document.getElementById("teacherDepartment").value,

        maxHours:
            Number(
                document.getElementById("teacherHours").value
            ),

        roomId:
            roomValue ? Number(roomValue) : null,

        isAdviser:
            !!advisoryValue,

        advisorySectionId:
            advisoryValue ? Number(advisoryValue) : null

    });

    saveDB();

    closeModal();

    renderAll();

    toast("Teacher added successfully.");

}


function deleteTeacher(id) {

    if (!confirm("Delete this teacher?")) return;

    db.teachers =
        db.teachers.filter(t => t.id !== id);

    db.assignments =
        db.assignments.filter(a => a.teacherId !== id);

    saveDB();

    renderAll();

    toast("Teacher deleted.");

}


/* =========================================================
   SUBJECTS
   ========================================================= */

function renderSubjects() {

    const table =
        document.getElementById("subjectTable");

    if (!table) return;

    const search =
        document.getElementById("subjectSearch")?.value
        ?.toLowerCase() || "";

    table.innerHTML = "";

    db.subjects
        .filter(s =>
            s.name.toLowerCase().includes(search) ||
            s.code.toLowerCase().includes(search)
        )
        .forEach(s => {

            const row = document.createElement("tr");

            row.innerHTML = `

                <td><strong>${s.code}</strong></td>

                <td>${s.name}</td>

                <td>${s.hours} hours</td>

                <td>${s.minutes} minutes</td>

                <td>${s.roomType}</td>

                <td>
                    <button class="action-btn"
                        onclick="openEditSubjectModal(${s.id})">
                        Edit
                    </button>
                    <button class="action-btn"
                        onclick="deleteSubject(${s.id})">
                        Delete
                    </button>
                </td>

            `;

            table.appendChild(row);

        });

}


function openSubjectModal() {

    openModal(
        "Add Subject",
        `
        <form onsubmit="addSubject(event)">

            <label>Subject Code</label>

            <input id="subjectCode"
                required
                placeholder="GENMATH">

            <label>Subject Name</label>

            <input id="subjectName"
                required
                placeholder="General Mathematics">

            <label>Weekly Hours</label>

            <input id="subjectHours"
                type="number"
                min="1"
                value="4">

            <label>Minutes per Meeting</label>

            <input id="subjectMinutes"
                type="number"
                value="60">

            <label>Room Type</label>

            <select id="subjectRoom">

                <option>Regular Classroom</option>
                <option>Laboratory</option>
                <option>Computer Laboratory</option>
                <option>Gym</option>
                <option>Library</option>
                <option>Carpentry Laboratory</option>
                <option>EIM Laboratory</option>
                <option>Tailoring Laboratory (101)</option>
                <option>Events and Management Laboratory (105)</option>

            </select>

            <button class="primary-btn modal-submit">
                Add Subject
            </button>

        </form>
        `
    );

}


function addSubject(event) {

    event.preventDefault();

    db.subjects.push({

        id: Date.now(),

        code:
            document.getElementById("subjectCode").value,

        name:
            document.getElementById("subjectName").value,

        hours:
            Number(
                document.getElementById("subjectHours").value
            ),

        minutes:
            Number(
                document.getElementById("subjectMinutes").value
            ),

        roomType:
            document.getElementById("subjectRoom").value

    });

    saveDB();

    closeModal();

    renderAll();

    toast("Subject added successfully.");

}


function openEditSubjectModal(id) {

    const s =
        db.subjects.find(sub => sub.id === id);

    if (!s) return;

    const roomTypes =
        ["Regular Classroom", "Laboratory", "Computer Laboratory", "Gym", "Library",
         "Carpentry Laboratory", "EIM Laboratory", "Tailoring Laboratory (101)",
         "Events and Management Laboratory (105)"];

    const roomOptions =
        roomTypes.map(r =>
            `<option ${r === s.roomType ? "selected" : ""}>${r}</option>`
        ).join("");

    openModal(
        "Edit Subject",
        `
        <form onsubmit="saveSubjectEdit(event, ${s.id})">

            <label>Subject Code</label>

            <input id="editSubjectCode"
                required
                value="${s.code}">

            <label>Subject Name</label>

            <input id="editSubjectName"
                required
                value="${s.name}">

            <label>Weekly Hours</label>

            <input id="editSubjectHours"
                type="number"
                min="1"
                value="${s.hours}">

            <label>Minutes per Meeting</label>

            <input id="editSubjectMinutes"
                type="number"
                min="1"
                value="${s.minutes}">
            <small class="form-hint">
                Use this for subjects that meet in one straight block —
                e.g. 120 for a 2-hour block, 240 for a 4-hour block —
                instead of separate 60-minute periods.
            </small>

            <label>Room Type</label>

            <select id="editSubjectRoom">
                ${roomOptions}
            </select>

            <button class="primary-btn modal-submit">
                Save Changes
            </button>

        </form>
        `
    );

}


function saveSubjectEdit(event, id) {

    event.preventDefault();

    const s =
        db.subjects.find(sub => sub.id === id);

    if (!s) return;

    s.code =
        document.getElementById("editSubjectCode").value;

    s.name =
        document.getElementById("editSubjectName").value;

    s.hours =
        Number(
            document.getElementById("editSubjectHours").value
        );

    s.minutes =
        Number(
            document.getElementById("editSubjectMinutes").value
        );

    s.roomType =
        document.getElementById("editSubjectRoom").value;

    saveDB();

    closeModal();

    renderAll();

    toast("Subject updated successfully.");

}


function deleteSubject(id) {

    db.subjects =
        db.subjects.filter(s => s.id !== id);

    db.assignments =
        db.assignments.filter(a => a.subjectId !== id);

    saveDB();

    renderAll();

    toast("Subject deleted.");

}


/* =========================================================
   SECTIONS
   ========================================================= */

function renderSections() {

    const table =
        document.getElementById("sectionTable");

    if (!table) return;

    table.innerHTML = "";

    db.sections.forEach(s => {

        const adviser =
            db.teachers.find(
                t => t.isAdviser && t.advisorySectionId === s.id
            );

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${s.grade}</td>

            <td><strong>${s.name}</strong></td>

            <td>${s.students}</td>

            <td>
                ${adviser
                    ? `<span class="table-status">${adviser.name}</span>`
                    : `<span class="table-status muted">Unassigned</span>`}
                <button class="action-btn" style="margin-left:6px;"
                    onclick="openAdviserModal(${s.id})">
                    ${adviser ? "Change" : "Assign"}
                </button>
            </td>

            <td>
                <span class="table-status">
                    Active
                </span>
            </td>

            <td>

                <button class="action-btn"
                    onclick="deleteSection(${s.id})">
                    Delete
                </button>

            </td>

        `;

        table.appendChild(row);

    });

}


function openSectionModal() {

    const teacherOptions =
        db.teachers.map(t => {

            const busy =
                t.isAdviser && t.advisorySectionId;

            return `<option value="${t.id}">
                ${t.name}${busy ? " (already advising another section)" : ""}
            </option>`;

        }).join("");

    openModal(
        "Add Section",
        `
        <form onsubmit="addSection(event)">

            <label>Grade Level</label>

            <input id="sectionGrade"
                required
                placeholder="Grade 11">

            <label>Section Name</label>

            <input id="sectionName"
                required
                placeholder="Rizal">

            <label>Number of Students</label>

            <input id="sectionStudents"
                type="number"
                value="40"
                min="1">

            <label>Class Adviser</label>

            <select id="sectionAdviser">
                <option value="">— No Adviser Assigned —</option>
                ${teacherOptions}
            </select>
            <small class="form-hint">
                Picking a teacher who already advises another section
                will move them to this one.
            </small>

            <button class="primary-btn modal-submit">
                Add Section
            </button>

        </form>
        `
    );

}


function addSection(event) {

    event.preventDefault();

    const adviserValue =
        document.getElementById("sectionAdviser").value;

    const newSection = {

        id: Date.now(),

        grade:
            document.getElementById("sectionGrade").value,

        name:
            document.getElementById("sectionName").value,

        students:
            Number(
                document.getElementById("sectionStudents").value
            )

    };

    db.sections.push(newSection);

    if (adviserValue) {
        assignAdviser(newSection.id, Number(adviserValue), false);
    }

    saveDB();

    closeModal();

    renderAll();

    toast("Section added successfully.");

}


function openAdviserModal(sectionId) {

    const section =
        db.sections.find(s => s.id === sectionId);

    if (!section) return;

    const currentAdviser =
        db.teachers.find(
            t => t.isAdviser && t.advisorySectionId === sectionId
        );

    const teacherOptions =
        db.teachers.map(t => {

            const busy =
                t.isAdviser &&
                t.advisorySectionId &&
                t.advisorySectionId !== sectionId;

            return `<option value="${t.id}"
                ${currentAdviser && currentAdviser.id === t.id ? "selected" : ""}>
                ${t.name}${busy ? " (already advising another section)" : ""}
            </option>`;

        }).join("");

    openModal(
        `Class Adviser — ${section.grade} ${section.name}`,
        `
        <form onsubmit="saveAdviser(event, ${sectionId})">

            <label>Class Adviser</label>

            <select id="adviserSelect">
                <option value="">— No Adviser Assigned —</option>
                ${teacherOptions}
            </select>

            <button class="primary-btn modal-submit">
                Save
            </button>

        </form>
        `
    );

}


function saveAdviser(event, sectionId) {

    event.preventDefault();

    const value =
        document.getElementById("adviserSelect").value;

    assignAdviser(sectionId, value ? Number(value) : null, true);

    saveDB();

    closeModal();

    renderAll();

    toast("Class adviser updated.");

}


function assignAdviser(sectionId, teacherId, showConflictToast) {

    /*
     Clear anyone currently advising this section.
    */

    db.teachers.forEach(t => {

        if (t.advisorySectionId === sectionId) {
            t.isAdviser = false;
            t.advisorySectionId = null;
        }

    });

    if (!teacherId) return;

    const teacher =
        db.teachers.find(t => t.id === teacherId);

    if (!teacher) return;

    if (teacher.isAdviser && teacher.advisorySectionId && showConflictToast) {

        toast(
            `${teacher.name} was moved from their previous advisory section.`
        );

    }

    teacher.isAdviser = true;
    teacher.advisorySectionId = sectionId;

}


function deleteSection(id) {

    db.sections =
        db.sections.filter(s => s.id !== id);

    /*
     Any teacher advising this section
     is no longer an adviser of anything.
    */

    db.teachers.forEach(t => {

        if (t.advisorySectionId === id) {
            t.isAdviser = false;
            t.advisorySectionId = null;
        }

    });

    db.assignments =
        db.assignments.filter(a => a.sectionId !== id);

    saveDB();

    renderAll();

}


/* =========================================================
   ROOMS
   ========================================================= */

function renderRooms() {

    const grid =
        document.getElementById("roomGrid");

    if (!grid) return;

    grid.innerHTML = "";

    db.rooms.forEach(room => {

        const utilization =
            getRoomUtilization(room.id);

        const card = document.createElement("div");

        card.className = "room-card";

        card.innerHTML = `

            <div class="room-top">

                <div class="room-icon">
                    🏫
                </div>

                <span class="table-status">
                    Available
                </span>

            </div>

            <h3>${room.name}</h3>

            <p>
                ${room.type} ·
                Capacity: ${room.capacity}
            </p>

            <div class="utilization">

                <div class="utilization-head">

                    <span>Utilization</span>

                    <strong>${utilization}%</strong>

                </div>

                <div class="progress">

                    <span style="width:${utilization}%"></span>

                </div>

            </div>

            <br>

            <button class="action-btn"
                onclick="deleteRoom(${room.id})">

                Delete

            </button>

        `;

        grid.appendChild(card);

    });

}


function openRoomModal() {

    openModal(
        "Add Classroom",
        `
        <form onsubmit="addRoom(event)">

            <label>Room Name</label>

            <input id="roomName"
                required
                placeholder="Room 101">

            <label>Room Type</label>

            <select id="roomType">

                <option>Regular Classroom</option>
                <option>Laboratory</option>
                <option>Computer Laboratory</option>
                <option>Gym</option>
                <option>Library</option>
                <option>Carpentry Laboratory</option>
                <option>EIM Laboratory</option>
                <option>Tailoring Laboratory (101)</option>
                <option>Events and Management Laboratory (105)</option>

            </select>

            <label>Capacity</label>

            <input id="roomCapacity"
                type="number"
                value="40">

            <button class="primary-btn modal-submit">
                Add Classroom
            </button>

        </form>
        `
    );

}


function addRoom(event) {

    event.preventDefault();

    db.rooms.push({

        id: Date.now(),

        name:
            document.getElementById("roomName").value,

        type:
            document.getElementById("roomType").value,

        capacity:
            Number(
                document.getElementById("roomCapacity").value
            )

    });

    saveDB();

    closeModal();

    renderAll();

    toast("Classroom added.");

}


function deleteRoom(id) {

    db.rooms =
        db.rooms.filter(r => r.id !== id);

    /*
     Teachers whose designated classroom was
     deleted fall back to auto-assignment.
    */

    db.teachers.forEach(t => {

        if (t.roomId === id) {
            t.roomId = null;
        }

    });

    saveDB();

    renderAll();

}


/* =========================================================
   TIME SLOTS
   ========================================================= */

function renderTimeSlots() {

    const grid =
        document.getElementById("timeGrid");

    if (!grid) return;

    grid.innerHTML = "";

    days.forEach((day, dayIndex) => {

        const column =
            document.createElement("div");

        column.className = "day-column";

        let html =
            `<div class="day-header">${day}</div>`;

        db.timeslots.forEach(slot => {

            const isFirstDay = dayIndex === 0;

            html += `

                <div class="time-slot
                    ${slot.type === "break" ? "break" : ""}">

                    <span>
                        ${slot.time}
                        ${slot.type === "break" ? " · BREAK" : ""}
                    </span>

                    ${isFirstDay ? `
                        <span class="slot-actions">
                            <button class="slot-action-btn"
                                title="Edit"
                                onclick="editTimeSlot(${slot.id})">✎</button>
                            <button class="slot-action-btn"
                                title="Delete"
                                onclick="deleteTimeSlot(${slot.id})">✕</button>
                        </span>
                    ` : ""}

                </div>

            `;

        });

        column.innerHTML = html;

        grid.appendChild(column);

    });

}


function addTimeSlot() {

    const time =
        prompt("Enter time slot:", "5:00–6:00");

    if (!time) return;

    const isBreak =
        confirm("Is this a break period? Click OK for Break, Cancel for Class.");

    db.timeslots.push({

        id: Date.now(),

        time: time,

        type: isBreak ? "break" : "class"

    });

    saveDB();

    renderTimeSlots();

    toast("Time slot added.");

}


function editTimeSlot(id) {

    const slot =
        db.timeslots.find(s => s.id === id);

    if (!slot) return;

    const time =
        prompt("Edit time slot:", slot.time);

    if (!time) return;

    slot.time = time;

    const isBreak =
        confirm("Is this a break period? Click OK for Break, Cancel for Class.");

    slot.type = isBreak ? "break" : "class";

    saveDB();

    renderTimeSlots();

    toast("Time slot updated.");

}


function deleteTimeSlot(id) {

    if (!confirm("Delete this time slot for all days?")) return;

    db.timeslots =
        db.timeslots.filter(s => s.id !== id);

    saveDB();

    renderTimeSlots();

    toast("Time slot deleted.");

}


/* =========================================================
   ASSIGNMENTS
   ========================================================= */

function renderAssignments() {

    const table =
        document.getElementById("assignmentTable");

    if (!table) return;

    /*
     Drop any assignment left pointing at a teacher, subject,
     or section that no longer exists (e.g. deleted before this
     cleanup was added), instead of showing it as "Unknown".
    */

    const validCount = db.assignments.length;

    db.assignments =
        db.assignments.filter(a =>
            db.teachers.some(t => t.id === a.teacherId) &&
            db.subjects.some(s => s.id === a.subjectId) &&
            db.sections.some(s => s.id === a.sectionId)
        );

    if (db.assignments.length !== validCount) {
        saveDB();
    }

    table.innerHTML = "";

    db.assignments.forEach(a => {

        const teacher =
            db.teachers.find(t => t.id === a.teacherId);

        const subject =
            db.subjects.find(s => s.id === a.subjectId);

        const section =
            db.sections.find(s => s.id === a.sectionId);

        const row = document.createElement("tr");

        row.innerHTML = `

            <td>${teacher?.name || "Unknown"}</td>

            <td>${subject?.name || "Unknown"}</td>

            <td>
                ${section?.grade || ""} -
                ${section?.name || ""}
            </td>

            <td>${a.hours}</td>

            <td>
                <span class="table-status">
                    Ready
                </span>
            </td>

            <td>

                <button class="action-btn"
                    onclick="deleteAssignment(${a.id})">

                    Delete

                </button>

            </td>

        `;

        table.appendChild(row);

    });

}


function openAssignmentModal() {

    const teacherOptions =
        db.teachers.map(t =>
            `<option value="${t.id}">
                ${t.name}
            </option>`
        ).join("");

    const sectionCheckOptions =
        db.sections.map(sec => sec) || [];

    const subjectRows =
        db.subjects.map(s => {

            const sectionChecks =
                sectionCheckOptions.map(sec => `
                    <label class="section-check-pill">
                        <input type="checkbox"
                            id="assignSubjSectionCheck_${s.id}_${sec.id}"
                            onchange="updateSectionDropdownLabel(${s.id})">
                        <span>${sec.grade} - ${sec.name}</span>
                    </label>
                `).join("") ||
                `<div class="subject-row-empty">No sections yet.</div>`;

            return `
            <div class="subject-item">

                <div class="subject-row">

                    <label class="subject-row-check">
                        <input type="checkbox"
                            id="assignSubjCheck_${s.id}"
                            onchange="updateSubjectDropdownLabel()">
                        <span>${s.name}</span>
                    </label>

                    <button type="button"
                        class="section-dropdown-toggle"
                        id="sectionDropdownLabel_${s.id}"
                        onclick="toggleSectionDropdown(${s.id})">

                        <span>Select sections</span>
                        <span class="subject-dropdown-arrow">&#9662;</span>

                    </button>

                    <input id="assignSubjHours_${s.id}"
                        type="number"
                        min="1"
                        value="${s.hours || 4}">

                </div>

                <div class="section-dropdown-panel" id="sectionDropdownPanel_${s.id}">
                    ${sectionChecks}
                </div>

            </div>
        `;
        }).join("") ||
        `<div class="subject-row-empty">No subjects yet.</div>`;

    openModal(
        "Add Teaching Assignment",
        `
        <form onsubmit="addAssignment(event)">

            <label>Teacher</label>

            <select id="assignmentTeacher">
                ${teacherOptions}
            </select>

            <label>Subject, Section &amp; Weekly Hours</label>

            <div class="subject-multiselect">

                <button type="button"
                    class="subject-dropdown-toggle"
                    id="subjectDropdownLabel"
                    onclick="toggleSubjectDropdown()">

                    <span>Select subjects</span>
                    <span class="subject-dropdown-arrow">&#9662;</span>

                </button>

                <div class="subject-dropdown-panel" id="subjectDropdownPanel">

                    <div class="subject-row subject-row-head">
                        <span>Subject</span>
                        <span>Section</span>
                        <span>Weekly Hours</span>
                    </div>

                    ${subjectRows}

                </div>

            </div>

            <p class="form-hint">
                Check every subject this teacher will handle, then pick one
                or more matching sections and the weekly hours for each.
            </p>

            <button class="primary-btn modal-submit">
                Add Assignment
            </button>

        </form>
        `
    );

}


function toggleSubjectDropdown() {

    document.getElementById("subjectDropdownPanel")
        .classList.toggle("show");

    document.getElementById("subjectDropdownLabel")
        .classList.toggle("open");

}


function updateSubjectDropdownLabel() {

    const count =
        db.subjects.filter(s =>
            document.getElementById(`assignSubjCheck_${s.id}`)?.checked
        ).length;

    const label =
        document.querySelector("#subjectDropdownLabel span");

    label.textContent =
        count === 0
            ? "Select subjects"
            : `${count} subject${count > 1 ? "s" : ""} selected`;

}


function toggleSectionDropdown(subjectId) {

    document.getElementById(`sectionDropdownPanel_${subjectId}`)
        .classList.toggle("show");

    document.getElementById(`sectionDropdownLabel_${subjectId}`)
        .classList.toggle("open");

}


function updateSectionDropdownLabel(subjectId) {

    const count =
        db.sections.filter(sec =>
            document.getElementById(
                `assignSubjSectionCheck_${subjectId}_${sec.id}`
            )?.checked
        ).length;

    const label =
        document.querySelector(
            `#sectionDropdownLabel_${subjectId} span`
        );

    label.textContent =
        count === 0
            ? "Select sections"
            : `${count} section${count > 1 ? "s" : ""} selected`;

}


function addAssignment(event) {

    event.preventDefault();

    const teacherId =
        Number(
            document.getElementById("assignmentTeacher").value
        );

    const selectedSubjects =
        db.subjects.filter(s =>
            document.getElementById(`assignSubjCheck_${s.id}`)?.checked
        );

    if (selectedSubjects.length === 0) {

        toast("Select at least one subject.");

        return;

    }

    const missingSection =
        selectedSubjects.find(s =>
            !db.sections.some(sec =>
                document.getElementById(
                    `assignSubjSectionCheck_${s.id}_${sec.id}`
                )?.checked
            )
        );

    if (missingSection) {

        toast(`Select at least one section for ${missingSection.name}.`);

        return;

    }

    let created = 0;

    selectedSubjects.forEach(s => {

        const hours =
            Number(
                document.getElementById(`assignSubjHours_${s.id}`).value
            );

        const selectedSections =
            db.sections.filter(sec =>
                document.getElementById(
                    `assignSubjSectionCheck_${s.id}_${sec.id}`
                )?.checked
            );

        selectedSections.forEach(sec => {

            db.assignments.push({

                id: Date.now() + created,

                teacherId,

                subjectId: s.id,

                sectionId: sec.id,

                hours

            });

            created++;

        });

    });

    saveDB();

    closeModal();

    renderAll();

    toast(
        created === 1
            ? "Teaching assignment added."
            : `${created} teaching assignments added.`
    );

}


function deleteAssignment(id) {

    db.assignments =
        db.assignments.filter(a => a.id !== id);

    saveDB();

    renderAll();

}


/* =========================================================
   SCHEDULE GENERATOR
   ========================================================= */

/* =========================================================
   OBJECTIVE-DRIVEN HELPERS
   These give the four Scheduling Objective sliders an actual
   effect on generateSchedule(), instead of doing nothing.
   ========================================================= */

/*
 ROOM EFFICIENCY — when more than one room could host a class,
 choosing the smallest room that still fits keeps larger rooms
 free for classes that actually need the space, instead of a
 30-seat section parking itself in a 50-seat room by coincidence
 of array order. Below the halfway mark on the slider, we keep
 the original "first available" behavior instead.
*/
function pickRoomByEfficiency(candidates) {

    if (!candidates || candidates.length === 0) return null;

    if (objectiveWeights.roomEfficiency >= 0.5) {

        return [...candidates].sort(
            (a, b) => a.capacity - b.capacity
        )[0];

    }

    return candidates[0];

}

/*
 TEACHER FREE PERIODS — scores how "back-to-back" a candidate
 window would be for a teacher on a given day, by checking
 whether the period immediately before or after the window is
 already one of their classes. Used to prefer options that leave
 an actual gap when this objective is prioritized.
*/
function teacherAdjacencyPenalty(teacherId, day, window) {

    const orderedSlots = db.timeslots;

    const firstIndex =
        orderedSlots.findIndex(s => s.id === window[0].id);

    const lastIndex =
        orderedSlots.findIndex(
            s => s.id === window[window.length - 1].id
        );

    const beforeSlot = orderedSlots[firstIndex - 1];
    const afterSlot = orderedSlots[lastIndex + 1];

    let penalty = 0;

    [beforeSlot, afterSlot].forEach(slot => {

        if (!slot || slot.type !== "class") return;

        const busy =
            db.schedule.some(
                x =>
                    x.teacherId === teacherId &&
                    x.day === day &&
                    x.slotId === slot.id
            );

        if (busy) penalty++;

    });

    return penalty;

}

/*
 MORNING SUBJECT PREFERENCE — a subject counts as "important"
 for this purpose if its weekly hours are at or above the median
 across all subjects (a proxy for core/major subjects, since the
 data model doesn't have an explicit importance flag). Windows
 from getConsecutivePeriodWindows() are already in chronological
 order, so biasing toward morning just means searching them in
 that natural order instead of the usual per-assignment rotation
 that spreads different assignments across different starting
 slots.
*/
function getMedianSubjectHours() {

    const hours =
        db.subjects
            .map(s => Number(s.hours) || 0)
            .sort((a, b) => a - b);

    if (hours.length === 0) return 0;

    return hours[Math.floor(hours.length / 2)];

}

function isCoreSubject(subject, medianHours) {

    return (Number(subject.hours) || 0) >= medianHours;

}

/*
 TEACHER WORKLOAD BALANCE — controls the ORDER assignments are
 attempted in, not which room/window each one ends up with. When
 a teacher's whole list of assignments is processed back-to-back
 (the raw array order), that teacher's classes get first pick of
 every contested window before the next teacher's turn even
 starts. Interleaving teachers round-robin means no single
 teacher's classes systematically win every contested slot.
 Below the halfway mark, the original array order is kept as-is.
*/
function buildAssignmentProcessingOrder() {

    const indexed =
        db.assignments.map((assignment, originalIndex) => (
            { assignment, originalIndex }
        ));

    if (objectiveWeights.workloadBalance < 0.5) {
        return indexed;
    }

    const byTeacher = {};

    indexed.forEach(item => {

        const key = item.assignment.teacherId;

        if (!byTeacher[key]) byTeacher[key] = [];

        byTeacher[key].push(item);

    });

    const queues = Object.values(byTeacher);
    const merged = [];

    let added = true;

    while (added) {

        added = false;

        queues.forEach(queue => {

            if (queue.length) {
                merged.push(queue.shift());
                added = true;
            }

        });

    }

    return merged;

}


/* =========================================================
   PRIORITY SCHEDULING RULES
   (adviser homeroom period + CSS11 fixed block +
   CSS12 afternoon-only placement)
   ========================================================= */

/*
 The morning's class periods are timeslot ids 1, 2, 4, 5 (in
 that chronological order — id 3 is the recess break). "2nd to
 3rd period in the morning" restricts CSS11 to the pair [2, 4] —
 it can use period 2, period 3, or both together, so an odd
 weekly-hours total (e.g. 9 hours) still lands exactly on 9
 periods instead of rounding up to a 10-period double-block
 pattern.
*/
const CSS11_ALLOWED_SLOT_IDS = [2, 4];

/*
 The afternoon's class periods are timeslot ids 7, 8, 9, 10
 (id 6 is the lunch break). CSS12 is only required to fall
 SOMEWHERE in this range (any afternoon period/block), not one
 fixed pair — unlike CSS11 it isn't pinned to an exact spot.
*/
const AFTERNOON_SLOT_IDS = [7, 8, 9, 10];

/*
 Matches a subject named/coded "CSS11" however it was typed in
 (e.g. "CSS11", "CSS 11", "css-11"). Falls back to matching a
 general "CSS" subject taught specifically to a Grade 11
 section, in case the two grade levels share one subject entry
 instead of separate CSS11 / CSS12 records.
*/
function isCSS11Subject(subject, section) {

    if (!subject) return false;

    const normalize = v =>
        (v || "").toString().toLowerCase().replace(/[\s_-]/g, "");

    const code = normalize(subject.code);
    const name = normalize(subject.name);

    if (code === "css11" || name === "css11") return true;
    if (code.includes("css11") || name.includes("css11")) return true;

    const isGeneralCSS =
        code === "css" || name.includes("computer systems servicing");

    return (
        isGeneralCSS &&
        !!section &&
        (section.grade || "").toString().includes("11")
    );

}

function isCSS12Subject(subject, section) {

    if (!subject) return false;

    const normalize = v =>
        (v || "").toString().toLowerCase().replace(/[\s_-]/g, "");

    const code = normalize(subject.code);
    const name = normalize(subject.name);

    if (code === "css12" || name === "css12") return true;
    if (code.includes("css12") || name.includes("css12")) return true;

    const isGeneralCSS =
        code === "css" || name.includes("computer systems servicing");

    return (
        isGeneralCSS &&
        !!section &&
        (section.grade || "").toString().includes("12")
    );

}

/*
 ADVISER HOMEROOM PINNING — every teacher who is a class
 adviser gets their FIRST class period of the day (the earliest
 class timeslot, chronologically) reserved for their own
 advisory section, every school day. Placed straight into
 db.schedule before anything else, so no other class can be
 assigned to that teacher, that section, or that room during
 period 1.
*/
function pinAdviserHomeroomPeriods(classSlots, unplaced) {

    const advisoryPeriod = classSlots[0];

    if (!advisoryPeriod) return;

    db.teachers
        .filter(t => t.isAdviser && t.advisorySectionId)
        .forEach(teacher => {

            const section =
                db.sections.find(
                    s => s.id === teacher.advisorySectionId
                );

            if (!section) return;

            let room =
                db.rooms.find(r => r.id === teacher.roomId);

            if (
                !room ||
                room.capacity < Number(section.students)
            ) {

                room =
                    db.rooms.find(
                        r => r.capacity >= Number(section.students)
                    ) || db.rooms[0];

            }

            if (!room) {

                unplaced.push(
                    `${teacher.name} – Advisory (${section.grade} ${section.name}): no room available for the advisory period`
                );

                return;

            }

            days.forEach(day => {

                db.schedule.push({

                    id: Date.now() + Math.random(),
                    day: day,
                    slotId: advisoryPeriod.id,
                    teacherId: teacher.id,
                    subjectId: null,
                    sectionId: section.id,
                    roomId: room.id,
                    isAdvisory: true

                });

            });

        });

}

/*
 WINDOWS WITHIN AN ALLOWED RANGE — normally a "window" must be
 physically back-to-back class periods (getConsecutivePeriodWindows
 already enforces that). When allowNonContiguous is true, this
 instead treats every period inside allowedSlotIds as eligible to
 combine into one sitting regardless of a break/recess sitting
 between them — used for CSS11, where "periods 2 & 3" are only
 adjacent by numbering, not by the clock (recess falls between
 them).
*/
function getWindowsInRange(
    classSlots, allowedSlotIds, length, allowNonContiguous
) {

    if (!allowNonContiguous) {

        return getConsecutivePeriodWindows(length)
            .filter(w =>
                w.every(slot => allowedSlotIds.includes(slot.id))
            );

    }

    const candidateSlots =
        classSlots.filter(s => allowedSlotIds.includes(s.id));

    const combos = [];

    function combine(start, chosen) {

        if (chosen.length === length) {
            combos.push(chosen.slice());
            return;
        }

        for (let i = start; i < candidateSlots.length; i++) {
            chosen.push(candidateSlots[i]);
            combine(i + 1, chosen);
            chosen.pop();
        }

    }

    combine(0, []);

    return combos;

}


/*
 FORCE-PLACE A SUBJECT SOMEWHERE WITHIN A RANGE OF PERIODS
 (e.g. "periods 2–3 in the morning" or "anywhere in the
 afternoon") — used for both CSS11 and CSS12. It respects the
 subject's own "Minutes per Meeting" setting to work out meeting
 length, splits the WEEK'S TOTAL HOURS (assignment.hours) into
 that many meetings the same way the general scheduler does
 (with a shorter final meeting if the hours don't divide evenly,
 e.g. 9 hours), and only searches for windows that fall entirely
 inside allowedSlotIds, on the allowed days. When
 allowNonContiguous is true, a "meeting" can combine periods in
 the range even across a recess/break (see getWindowsInRange).
*/
function forcePlaceInPeriodRange(
    assignment, subject, section, teacher,
    classSlots, allowedSlotIds, allowedDays, unplaced,
    allowNonContiguous
) {

    const isPE = isPESubject(subject);

    const fixedRoom =
        isPE ? null : resolveTeacherRoom(teacher, subject, section);

    if (!isPE && !fixedRoom) {

        unplaced.push(
            `${teacher.name} – ${subject.name} (${section.grade} ${section.name}): no suitable classroom available`
        );

        return;

    }

    const totalPeriods = Number(assignment.hours) || 0;

    if (totalPeriods <= 0) return;

    /*
     Same "split the week's hours into meeting blocks" logic as
     generateSchedule() uses generally, so a subject's configured
     meeting length (e.g. a 120-minute double period) is honored
     rather than assumed.
    */

    const periodsPerMeeting =
        Math.max(
            1,
            Math.round((Number(subject.minutes) || 60) / 60)
        );

    /*
     LONGEST BLOCK ACTUALLY AVAILABLE within this allowed range
     — e.g. the afternoon's 4 back-to-back periods can host up
     to a 4-period block. With allowNonContiguous, CSS11's
     "periods 2 & 3" range can host up to a 2-period block (the
     two of them together) even though recess splits them; the
     cap is simply how many periods the range contains. Used
     below to decide whether a leftover remainder hour can be
     folded into the last meeting instead of becoming its own
     separate short one.
    */

    const maxWindowLength =
        allowNonContiguous
            ? allowedSlotIds.length
            : (() => {

                for (
                    let len = allowedSlotIds.length;
                    len >= 1;
                    len--
                ) {

                    const fits =
                        getConsecutivePeriodWindows(len).some(w =>
                            w.every(slot => allowedSlotIds.includes(slot.id))
                        );

                    if (fits) return len;

                }

                return 1;

            })();

    const meetingLengths = [];

    const fullMeetings =
        Math.floor(totalPeriods / periodsPerMeeting);

    const remainder =
        totalPeriods % periodsPerMeeting;

    for (let i = 0; i < fullMeetings; i++) {
        meetingLengths.push(periodsPerMeeting);
    }

    if (remainder > 0) {

        /*
         Fold the leftover hour(s) into the LAST meeting instead
         of tacking on a separate short meeting, whenever the
         range can physically fit the bigger block — e.g. 9
         hours at 2-hour meetings becomes [2, 2, 2, 3] (4
         meeting days) rather than [2, 2, 2, 2, 1] (5 meeting
         days), as long as a 3-period window actually exists in
         this part of the day.
        */

        const canMergeIntoLast =
            meetingLengths.length > 0 &&
            (periodsPerMeeting + remainder) <= maxWindowLength;

        if (canMergeIntoLast) {
            meetingLengths[meetingLengths.length - 1] += remainder;
        } else {
            meetingLengths.push(remainder);
        }

    }

    const lengthGroups = {};

    meetingLengths.forEach(len => {
        lengthGroups[len] = (lengthGroups[len] || 0) + 1;
    });

    const sortedLengths =
        Object.keys(lengthGroups)
            .map(Number)
            .sort((a, b) => b - a);

    sortedLengths.forEach(length => {

        const count = lengthGroups[length];

        const windows =
            getWindowsInRange(
                classSlots, allowedSlotIds, length, allowNonContiguous
            );

        if (windows.length === 0) {

            unplaced.push(
                `${teacher.name} – ${subject.name} (${section.grade} ${section.name}): no ${length}-period window available in the required part of the day`
            );

            return;

        }

        let placed = 0;

        for (
            let attempt = 0;
            attempt < windows.length && placed < count;
            attempt++
        ) {

            const window = windows[attempt];

            for (const day of allowedDays) {

                if (placed >= count) break;

                const room =
                    resolveWindowRoom(
                        teacher, subject, section,
                        isPE, fixedRoom, day, window
                    );

                if (!room) continue;

                window.forEach(slot => {

                    db.schedule.push({

                        id: Date.now() + Math.random(),
                        day: day,
                        slotId: slot.id,
                        teacherId: teacher.id,
                        subjectId: subject.id,
                        sectionId: section.id,
                        roomId: room.id

                    });

                });

                placed++;

            }

        }

        if (placed < count) {

            unplaced.push(
                `${teacher.name} – ${subject.name} (${section.grade} ${section.name}): only ${placed} of ${count} ${length}-period meeting(s) could be placed in the required part of the day`
            );

        }

    });

}


function generateSchedule() {

    if (
        db.teachers.length === 0 ||
        db.subjects.length === 0 ||
        db.sections.length === 0 ||
        db.rooms.length === 0 ||
        db.assignments.length === 0
    ) {

        toast(
            "Please add teachers, subjects, sections, rooms, and assignments first."
        );

        return;

    }

    toast("Scheduling engine is generating...");

    setTimeout(() => {

        db.schedule = [];

        /*
         Read the four Scheduling Objective sliders live and store
         them globally so the room/window helper functions (which
         run deep inside this generation pass) can see them too.
        */

        objectiveWeights = readObjectiveWeights();
        db.objectives = objectiveWeights;

        const medianSubjectHours = getMedianSubjectHours();

        const classSlots =
            db.timeslots.filter(
                s => s.type === "class"
            );

        const unplaced = [];

        /*
         PRIORITY PLACEMENT PASS — runs before the general
         assignment loop so these three rules always win the
         slots they need, instead of competing for them:

           1. Every class adviser's FIRST period of the day is
              reserved for their own advisory section (homeroom),
              every day of the week.
           2. Any "CSS11" subject is locked into the 2nd–3rd
              periods of the morning (a back-to-back block),
              with the number of weekly meetings driven by its
              total weekly hours.
           3. Any "CSS12" subject is confined to the afternoon
              (any afternoon period/block, using the subject's
              own configured meeting length), on every day
              EXCEPT Monday, again driven by its total weekly
              hours.

         Both this pass and the pinned advisory entries write
         straight into db.schedule, so the normal teacher /
         section / room availability checks used later on
         (resolveWindowRoom, etc.) automatically treat these
         slots as already taken.
        */

        pinAdviserHomeroomPeriods(classSlots, unplaced);

        const handledAssignmentIds = new Set();

        db.assignments.forEach(assignment => {

            const subject =
                db.subjects.find(
                    s => s.id === assignment.subjectId
                );

            const section =
                db.sections.find(
                    s => s.id === assignment.sectionId
                );

            const teacher =
                db.teachers.find(
                    t => t.id === assignment.teacherId
                );

            if (!subject || !section || !teacher) return;

            if (isCSS11Subject(subject, section)) {

                forcePlaceInPeriodRange(
                    assignment, subject, section, teacher,
                    classSlots,
                    CSS11_ALLOWED_SLOT_IDS,
                    days,
                    unplaced,
                    true // allowNonContiguous — periods 2 & 3 can combine across the recess
                );

                handledAssignmentIds.add(assignment.id);

            } else if (isCSS12Subject(subject, section)) {

                forcePlaceInPeriodRange(
                    assignment, subject, section, teacher,
                    classSlots,
                    AFTERNOON_SLOT_IDS,
                    days.filter(d => d !== "Monday"),
                    unplaced,
                    false // afternoon periods are already back-to-back
                );

                handledAssignmentIds.add(assignment.id);

            }

        });

        const processingOrder =
            buildAssignmentProcessingOrder()
                .filter(
                    ({ assignment }) =>
                        !handledAssignmentIds.has(assignment.id)
                );

        processingOrder.forEach(({ assignment, originalIndex }) => {

            /*
             assignmentIndex keeps the SAME meaning as before
             (a stable identity used for window rotation) even
             though the order we now iterate in may differ —
             Teacher Workload Balance changes WHICH assignment
             goes first, not the rotation math each one uses.
            */
            const assignmentIndex = originalIndex;

            const subject =
                db.subjects.find(
                    s => s.id === assignment.subjectId
                );

            const section =
                db.sections.find(
                    s => s.id === assignment.sectionId
                );

            const teacher =
                db.teachers.find(
                    t => t.id === assignment.teacherId
                );

            if (!subject || !section || !teacher) {
                return;
            }

            const totalPeriods =
                Number(assignment.hours);

            if (totalPeriods <= 0 || classSlots.length === 0) {
                return;
            }

            const isPE = isPESubject(subject);

            /*
             SECTIONS ROTATE, TEACHERS DON'T.
             Every non-PE class this teacher gives happens in
             their one designated classroom. PE always happens
             in the Gym instead, since the gym is a shared,
             fixed venue rather than any single teacher's room.
            */

            const fixedRoom =
                isPE
                    ? null
                    : resolveTeacherRoom(teacher, subject, section);

            if (!isPE && !fixedRoom) {

                unplaced.push(
                    `${teacher.name} – ${subject.name} (${section.grade} ${section.name}): no suitable classroom available`
                );

                return;

            }

            /*
             MEETING LENGTH — a subject's "Minutes per Meeting"
             controls how many consecutive periods make up one
             sitting (e.g. 120 minutes = a straight double period).
             Periods are assumed to be ~60 minutes each, matching
             how Weekly Hours already maps 1:1 to period count.
            */

            const periodsPerMeeting =
                Math.max(
                    1,
                    Math.round((Number(subject.minutes) || 60) / 60)
                );

            /*
             Break the week's total periods into meeting blocks of
             that length (the last one may be shorter if it doesn't
             divide evenly).

             SPECIAL CASE — a regular (non-CSS11/CSS12) subject
             carrying 7 hours/week always meets as four blocks of
             2, 2, 2, and 1 hour(s), spread across the 5-day week,
             regardless of its configured "Minutes per Meeting".
             (CSS11/CSS12 are handled separately by
             forcePlaceInPeriodRange and keep the normal
             remainder-merging behavior, e.g. 2, 2, 2, 3.)
            */

            const meetingLengths =
                totalPeriods === 7
                    ? [2, 2, 2, 1]
                    : (() => {

                        const lengths = [];

                        let remainingPeriods = totalPeriods;

                        while (remainingPeriods > 0) {

                            const len =
                                Math.min(periodsPerMeeting, remainingPeriods);

                            lengths.push(len);

                            remainingPeriods -= len;

                        }

                        return lengths;

                    })();

            /*
             Group meetings by length so equal-length meetings can
             still share the clean "same period every day" pattern.
             Longer blocks are placed first since they're the most
             constrained (fewer free consecutive-period windows).
            */

            const lengthGroups = {};

            meetingLengths.forEach(len => {
                lengthGroups[len] = (lengthGroups[len] || 0) + 1;
            });

            const sortedLengths =
                Object.keys(lengthGroups)
                    .map(Number)
                    .sort((a, b) => b - a);

            /*
             MORNING SUBJECT PREFERENCE:
             windows from getConsecutivePeriodWindows() are
             already in chronological (morning-first) order. The
             normal rotation offset (assignmentIndex) exists to
             spread different assignments across different
             starting windows so they don't all pile onto period
             1. For a core subject, when this objective is
             prioritized, we shrink that offset toward zero so
             the search starts from the earliest window first —
             at 100% it always starts at window 0.
            */

            const isCore =
                isCoreSubject(subject, medianSubjectHours);

            const rotationOffset =
                (isCore && objectiveWeights.morningPreference >= 0.5)
                    ? Math.round(
                        assignmentIndex *
                        (1 - objectiveWeights.morningPreference)
                    )
                    : assignmentIndex;

            sortedLengths.forEach(length => {

                const count = lengthGroups[length];

                const windows =
                    getConsecutivePeriodWindows(length);

                if (windows.length === 0) {

                    unplaced.push(
                        `${teacher.name} – ${subject.name} (${section.grade} ${section.name}): no run of ${length} consecutive period(s) available for this meeting length`
                    );

                    return;

                }

                let placedCount = 0;

                /*
                 PARALLEL SCHEDULING:
                 try to find ONE window of consecutive periods that
                 is free across enough days of the week, so the
                 subject always meets at the same block (e.g.
                 Monday & Wednesday, Periods 1–2).
                */

                for (
                    let attempt = 0;
                    attempt < windows.length && placedCount < count;
                    attempt++
                ) {

                    const window =
                        windows[
                            (rotationOffset + attempt) %
                            windows.length
                        ];

                    const availableDays = [];

                    for (const day of days) {

                        const dayRoom =
                            resolveWindowRoom(
                                teacher, subject, section,
                                isPE, fixedRoom, day, window
                            );

                        if (!dayRoom) continue;

                        availableDays.push({ day, room: dayRoom });

                    }

                    /*
                     TEACHER FREE PERIODS: when prioritized, try
                     the day options that leave this teacher an
                     actual gap first, instead of always taking
                     whichever days happened to come first.
                    */

                    if (objectiveWeights.teacherFreePeriods >= 0.5) {

                        availableDays.sort((a, b) =>
                            teacherAdjacencyPenalty(
                                teacher.id, a.day, window
                            ) -
                            teacherAdjacencyPenalty(
                                teacher.id, b.day, window
                            )
                        );

                    }

                    const stillNeeded = count - placedCount;

                    if (availableDays.length >= stillNeeded) {

                        availableDays
                            .slice(0, stillNeeded)
                            .forEach(({ day, room }) => {

                                window.forEach(slot => {

                                    db.schedule.push({

                                        id: Date.now() + Math.random(),
                                        day: day,
                                        slotId: slot.id,
                                        teacherId: teacher.id,
                                        subjectId: subject.id,
                                        sectionId: section.id,
                                        roomId: room.id

                                    });

                                });

                            });

                        placedCount = count;

                    }

                }

                /*
                 FALLBACK — some circumstances just can't follow the
                 clean parallel pattern. Place meeting blocks one at
                 a time on a best-effort basis instead of dropping
                 them.

                 BUGFIX: this used to advance both the window index
                 and the day index off the SAME incrementing guard
                 counter (`windows[(rotationOffset+guard) %
                 windows.length]` paired with `days[guard %
                 days.length]`). Since windows.length and days.length
                 are usually equal (5 meeting windows, 5 weekdays),
                 incrementing both together only ever walks a single
                 diagonal of the day×window grid — repeating the
                 same 5 combinations forever instead of trying all
                 25 — so a genuinely free slot elsewhere in the grid
                 could be missed entirely and the meeting reported as
                 unplaceable even though room existed. Nested loops
                 below try every window against every day at least
                 once before giving up.
                */

                if (placedCount < count) {

                    let remaining = count - placedCount;

                    outerFallback:
                    for (
                        let wOffset = 0;
                        wOffset < windows.length;
                        wOffset++
                    ) {

                        const window =
                            windows[
                                (rotationOffset + wOffset) %
                                windows.length
                            ];

                        for (
                            let dOffset = 0;
                            dOffset < days.length;
                            dOffset++
                        ) {

                            if (remaining <= 0) break outerFallback;

                            const day = days[dOffset];

                            const room =
                                resolveWindowRoom(
                                    teacher, subject, section,
                                    isPE, fixedRoom, day, window
                                );

                            if (!room) continue;

                            window.forEach(slot => {

                                db.schedule.push({

                                    id: Date.now() + Math.random(),
                                    day: day,
                                    slotId: slot.id,
                                    teacherId: teacher.id,
                                    subjectId: subject.id,
                                    sectionId: section.id,
                                    roomId: room.id

                                });

                            });

                            remaining--;

                        }

                    }

                    if (remaining > 0) {

                        unplaced.push(
                            `${teacher.name} – ${subject.name} (${section.grade} ${section.name}): ${remaining} of ${count} meeting(s) (${length}-period block) could not be placed`
                        );

                        console.warn(
                            "Could not fully place assignment:",
                            assignment
                        );

                    }

                }

            });

        });

        db.unplaced = unplaced;

        saveDB();

        renderAll();

        showPage("schedule");

        if (unplaced.length > 0) {

            console.warn("Unplaced assignments:", unplaced);

            toast(
                `Schedule generated with ${unplaced.length} assignment(s) needing manual review — see console/Conflicts.`
            );

        } else {

            toast("Schedule generated successfully.");

        }

    }, 700);

}


/* =========================================================
   PE / GYM HELPER
   ========================================================= */

function isPESubject(subject) {

    return !!subject && subject.roomType === "Gym";

}


/* =========================================================
   CONSECUTIVE-PERIOD WINDOWS
   Groups class slots into "runs" of back-to-back periods
   (a break in db.timeslots splits a run), then returns every
   possible sliding window of `length` consecutive periods.
   The same time-slot list applies to every day, so a window
   found here is valid on any day of the week.
   ========================================================= */

function getConsecutivePeriodWindows(length) {

    const runs = [];
    let current = [];

    db.timeslots.forEach(slot => {

        if (slot.type === "class") {

            current.push(slot);

        } else if (current.length) {

            runs.push(current);
            current = [];

        }

    });

    if (current.length) runs.push(current);

    const windows = [];

    runs.forEach(run => {

        for (
            let i = 0;
            i + length <= run.length;
            i++
        ) {

            windows.push(run.slice(i, i + length));

        }

    });

    return windows;

}


/* =========================================================
   RESOLVE THE ROOM FOR A WHOLE MEETING WINDOW ON ONE DAY
   Checks teacher, section, and room availability across
   EVERY period in the window (not just one), since a
   multi-period meeting only works if the block is free
   start to finish. Returns the room to use, or null if the
   window doesn't work on this day.
   ========================================================= */

function resolveWindowRoom(
    teacher, subject, section,
    isPE, fixedRoom, day, window
) {

    const teacherBusy =
        window.some(slot =>
            db.schedule.some(
                x =>
                    x.teacherId === teacher.id &&
                    x.day === day &&
                    x.slotId === slot.id
            )
        );

    if (teacherBusy) return null;

    const sectionBusy =
        window.some(slot =>
            db.schedule.some(
                x =>
                    x.sectionId === section.id &&
                    x.day === day &&
                    x.slotId === slot.id
            )
        );

    if (sectionBusy) return null;

    if (isPE) {

        const room =
            findAvailableRoomOfType(
                section, "Gym", day, window[0].id
            );

        if (!room) return null;

        const roomFreeAllPeriods =
            window.every(slot =>
                !db.schedule.some(
                    x =>
                        x.roomId === room.id &&
                        x.day === day &&
                        x.slotId === slot.id
                )
            );

        return roomFreeAllPeriods ? room : null;

    }

    const fixedRoomBusy =
        window.some(slot =>
            db.schedule.some(
                x =>
                    x.roomId === fixedRoom.id &&
                    x.day === day &&
                    x.slotId === slot.id
            )
        );

    if (!fixedRoomBusy) return fixedRoom;

    /*
     Fixed room isn't free for the whole block — look for any
     other suitable room that's free across every period.
    */

    const alternativeCandidates =
        db.rooms.filter(room => {

            if (room.id === fixedRoom.id) return false;

            if (room.capacity < Number(section.students)) {
                return false;
            }

            if (
                subject.roomType &&
                subject.roomType !== "Regular Classroom" &&
                room.type !== subject.roomType
            ) {
                return false;
            }

            return window.every(slot =>
                !db.schedule.some(
                    x =>
                        x.roomId === room.id &&
                        x.day === day &&
                        x.slotId === slot.id
                )
            );

        });

    /*
     ROOM EFFICIENCY: among rooms that all work, pickRoomByEfficiency
     favors the tightest capacity fit instead of just the first one
     found in db.rooms order.
    */

    return pickRoomByEfficiency(alternativeCandidates);

}


/* =========================================================
   RESOLVE A TEACHER'S DESIGNATED CLASSROOM
   ========================================================= */

function resolveTeacherRoom(teacher, subject, section) {

    /*
     A subject needs a "special" room (Laboratory, Computer
     Laboratory, etc.) when its roomType isn't just a regular
     classroom. In that circumstance the teacher's normal
     designated classroom can't be used — the class must go
     to the specialized room instead, even though the teacher
     otherwise stays put in their own room for everything else.
    */

    const requiresSpecialRoom =
        subject.roomType &&
        subject.roomType !== "Regular Classroom" &&
        subject.roomType !== "Gym";

    const hadDesignatedRoom = !!teacher.roomId;

    if (teacher.roomId) {

        const designated =
            db.rooms.find(r => r.id === teacher.roomId);

        if (
            designated &&
            designated.capacity >= Number(section.students) &&
            (!requiresSpecialRoom || designated.type === subject.roomType)
        ) {
            return designated;
        }

    }

    if (requiresSpecialRoom) {

        return db.rooms.find(room =>
            room.type === subject.roomType &&
            room.capacity >= Number(section.students)
        ) || null;

    }

    /*
     Fall back to any fitting regular room. If the teacher
     already had a designated classroom on record, this is
     just a one-off substitute for an oversized section — we
     don't overwrite their permanent room assignment. Only a
     teacher with NO designated classroom yet gets this room
     saved as their new permanent one, so they consistently
     keep the same room going forward.
    */

    const autoCandidates =
        db.rooms.filter(room =>
            room.type !== "Gym" &&
            room.capacity >= Number(section.students)
        );

    const autoRoom = pickRoomByEfficiency(autoCandidates);

    if (autoRoom && !hadDesignatedRoom) {
        teacher.roomId = autoRoom.id;
    }

    return autoRoom;

}


/* =========================================================
   FIND AVAILABLE ROOM (generic fallback)
   ========================================================= */

function findAvailableRoom(
    subject,
    section,
    day,
    slotId
) {

    return db.rooms.find(room => {

        const roomBusy =
            db.schedule.some(
                x =>
                    x.roomId === room.id &&
                    x.day === day &&
                    x.slotId === slotId
            );

        if (roomBusy) return false;

        if (
            room.capacity <
            Number(section.students)
        ) {
            return false;
        }

        if (
            subject.roomType &&
            subject.roomType !==
            "Regular Classroom" &&
            room.type !== subject.roomType
        ) {
            return false;
        }

        return true;

    });

}


/* =========================================================
   FIND AVAILABLE ROOM OF A SPECIFIC TYPE (e.g. Gym)
   ========================================================= */

function findAvailableRoomOfType(
    section,
    type,
    day,
    slotId
) {

    const candidates =
        db.rooms.filter(room => {

            if (room.type !== type) return false;

            if (room.capacity < Number(section.students)) {
                return false;
            }

            const roomBusy =
                db.schedule.some(
                    x =>
                        x.roomId === room.id &&
                        x.day === day &&
                        x.slotId === slotId
                );

            return !roomBusy;

        });

    return pickRoomByEfficiency(candidates);

}


/* =========================================================
   SCHEDULE RENDER
   ========================================================= */

function renderSchedule() {

    const table =
        document.getElementById("masterSchedule");

    if (!table) return;

    const sectionFilter =
        document.getElementById("sectionFilter")?.value ||
        "all";

    const teacherFilter =
        document.getElementById("teacherFilter")?.value ||
        "all";

    table.innerHTML = "";

    const classSlots =
        db.timeslots.filter(
            s => s.type === "class"
        );

    classSlots.forEach(slot => {

        const row =
            document.createElement("tr");

        let html =
            `<td class="time-label">
                ${slot.time}
             </td>`;

        days.forEach(day => {

            let items =
                db.schedule.filter(
                    x =>
                        x.day === day &&
                        x.slotId === slot.id
                );

            if (sectionFilter !== "all") {

                items =
                    items.filter(
                        x =>
                            String(x.sectionId) ===
                            sectionFilter
                    );

            }

            if (teacherFilter !== "all") {

                items =
                    items.filter(
                        x =>
                            String(x.teacherId) ===
                            teacherFilter
                    );

            }

            if (items.length === 0) {

                html += "<td></td>";

                return;

            }

            let cell = "";

            items.forEach(item => {

                const subject =
                    db.subjects.find(
                        s => s.id === item.subjectId
                    );

                const teacher =
                    db.teachers.find(
                        t => t.id === item.teacherId
                    );

                const section =
                    db.sections.find(
                        s => s.id === item.sectionId
                    );

                const room =
                    db.rooms.find(
                        r => r.id === item.roomId
                    );

                const itemClass =
                    item.isAdvisory
                        ? "schedule-item schedule-item-advisory"
                        : "schedule-item";

                cell += `

                    <div class="${itemClass}">

                        <strong>
                            ${item.isAdvisory ? "ADVISORY" : (subject?.code || "Subject")}
                        </strong>

                        <span>
                            ${item.isAdvisory ? "Homeroom / Advisory" : (subject?.name || "")}
                        </span>

                        <span>
                            ${section?.grade || ""}
                            ${section?.name || ""}
                        </span>

                        <span>
                            ${teacher?.name || ""}
                        </span>

                        <span>
                            ${room?.name || ""}
                        </span>

                    </div>

                `;

            });

            html += `<td>${cell}</td>`;

        });

        row.innerHTML = html;

        table.appendChild(row);

    });

}


/* =========================================================
   FILTER DROPDOWNS
   ========================================================= */

function updateScheduleFilters() {

    const sectionFilter =
        document.getElementById("sectionFilter");

    const teacherFilter =
        document.getElementById("teacherFilter");

    if (!sectionFilter || !teacherFilter)
        return;

    const oldSection =
        sectionFilter.value;

    const oldTeacher =
        teacherFilter.value;

    sectionFilter.innerHTML =
        `<option value="all">All Sections</option>` +
        db.sections.map(
            s =>
                `<option value="${s.id}">
                    ${s.grade} - ${s.name}
                 </option>`
        ).join("");

    teacherFilter.innerHTML =
        `<option value="all">All Teachers</option>` +
        db.teachers.map(
            t =>
                `<option value="${t.id}">
                    ${t.name}
                 </option>`
        ).join("");

    sectionFilter.value =
        oldSection;

    teacherFilter.value =
        oldTeacher;

}


/* =========================================================
   CONFLICT DETECTION
   ========================================================= */

function detectConflicts() {

    let teacher = 0;
    let room = 0;
    let section = 0;

    for (
        let i = 0;
        i < db.schedule.length;
        i++
    ) {

        for (
            let j = i + 1;
            j < db.schedule.length;
            j++
        ) {

            const a = db.schedule[i];
            const b = db.schedule[j];

            if (
                a.day === b.day &&
                a.slotId === b.slotId
            ) {

                if (
                    a.teacherId === b.teacherId
                ) {
                    teacher++;
                }

                if (
                    a.roomId === b.roomId
                ) {
                    room++;
                }

                if (
                    a.sectionId === b.sectionId
                ) {
                    section++;
                }

            }

        }

    }

    return {

        teacher,
        room,
        section,

        total:
            teacher +
            room +
            section

    };

}


/* =========================================================
   HEALTH SCORE
   ========================================================= */

function calculateHealth() {

    if (db.schedule.length === 0)
        return 0;

    const conflicts =
        detectConflicts();

    const penalty =
        conflicts.total * 10;

    return Math.max(
        0,
        Math.min(
            100,
            100 - penalty
        )
    );

}


/* =========================================================
   WORKLOAD
   ========================================================= */

function renderWorkload() {

    const table =
        document.getElementById("workloadTable");

    if (!table) return;

    table.innerHTML = "";

    db.teachers.forEach(teacher => {

        const assigned =
            db.assignments
                .filter(
                    a =>
                        a.teacherId === teacher.id
                )
                .reduce(
                    (sum, a) =>
                        sum + Number(a.hours),
                    0
                );

        const utilization =
            teacher.maxHours
                ? Math.round(
                    (assigned /
                    teacher.maxHours) *
                    100
                )
                : 0;

        let status = "Balanced";

        if (utilization > 100)
            status = "Overloaded";

        if (utilization < 60)
            status = "Light";

        const row =
            document.createElement("tr");

        row.innerHTML = `

            <td>
                <strong>${teacher.name}</strong>
            </td>

            <td>${assigned} hrs</td>

            <td>${teacher.maxHours} hrs</td>

            <td>

                <div style="min-width:120px">

                    <div class="progress">
                        <span
                            style="width:
                            ${Math.min(utilization,100)}%">
                        </span>
                    </div>

                    <small>${utilization}%</small>

                </div>

            </td>

            <td>
                ${Math.max(
                    0,
                    teacher.maxHours -
                    assigned
                )}
            </td>

            <td>
                <span class="table-status">
                    ${status}
                </span>
            </td>

        `;

        table.appendChild(row);

    });

}


/* =========================================================
   ROOM UTILIZATION
   ========================================================= */

function getRoomUtilization(roomId) {

    const totalClassSlots =
        db.timeslots.filter(
            s => s.type === "class"
        ).length *
        days.length;

    if (!totalClassSlots)
        return 0;

    const used =
        db.schedule.filter(
            s => s.roomId === roomId
        ).length;

    return Math.round(
        (used / totalClassSlots) * 100
    );

}


function renderUtilization() {

    const grid =
        document.getElementById("utilizationGrid");

    if (!grid) return;

    grid.innerHTML = "";

    db.rooms.forEach(room => {

        const utilization =
            getRoomUtilization(room.id);

        const card =
            document.createElement("div");

        card.className = "room-card";

        card.innerHTML = `

            <div class="room-top">

                <div class="room-icon">
                    🏫
                </div>

                <strong>
                    ${utilization}%
                </strong>

            </div>

            <h3>${room.name}</h3>

            <p>${room.type}</p>

            <div class="utilization">

                <div class="progress">

                    <span
                        style="width:
                        ${Math.min(utilization,100)}%">
                    </span>

                </div>

            </div>

        `;

        grid.appendChild(card);

    });

}


/* =========================================================
   HEALTH DETAILS
   ========================================================= */

function renderHealthDetails() {

    const conflicts =
        detectConflicts();

    const health =
        calculateHealth();

    const teacherBalance =
        calculateTeacherBalance();

    const roomBalance =
        calculateRoomBalance();

    document.getElementById("teacherBalance")
        .textContent =
        teacherBalance + "%";

    document.getElementById("teacherBalanceBar")
        .style.width =
        teacherBalance + "%";

    document.getElementById("roomBalance")
        .textContent =
        roomBalance + "%";

    document.getElementById("roomBalanceBar")
        .style.width =
        roomBalance + "%";

}


function calculateTeacherBalance() {

    if (!db.teachers.length)
        return 0;

    const workloads =
        db.teachers.map(t => {

            return db.assignments
                .filter(a => a.teacherId === t.id)
                .reduce(
                    (sum, a) =>
                        sum + Number(a.hours),
                    0
                );

        });

    if (!workloads.length)
        return 0;

    const max =
        Math.max(...workloads);

    const min =
        Math.min(...workloads);

    if (max === 0)
        return 100;

    return Math.round(
        (1 - (max - min) / max) * 100
    );

}


function calculateRoomBalance() {

    if (!db.rooms.length)
        return 0;

    const values =
        db.rooms.map(
            r => getRoomUtilization(r.id)
        );

    const average =
        values.reduce(
            (a,b) => a+b,
            0
        ) / values.length;

    return Math.round(
        Math.min(100, average)
    );

}


/* =========================================================
   CONFLICT PAGE
   ========================================================= */

function renderConflicts() {

    const container =
        document.getElementById("conflictList");

    if (!container) return;

    const conflicts =
        detectConflicts();

    const unplaced =
        db.unplaced || [];

    /*
     AUTO REPAIR — see the block above saveSettings() for the
     full explanation. Only fires when the inputs feeding the
     generator have actually changed since the last automatic
     attempt, so it can't loop forever against an unfixable
     shortage (e.g. genuinely no free Computer Lab slot left).
    */

    if (
        db.autoRepair &&
        (conflicts.total > 0 || unplaced.length > 0)
    ) {

        const signature =
            getSchedulingInputsSignature();

        if (signature !== lastAutoRepairSignature) {

            lastAutoRepairSignature = signature;

            container.innerHTML = `

                <div class="card empty-state">

                    <div>⏳</div>

                    <h3>Auto Repair running…</h3>

                    <p>
                        SMARTSCHED found a conflict and is
                        regenerating the schedule automatically.
                    </p>

                </div>

            `;

            generateSchedule();

            return;

        }

    }

    container.innerHTML = "";

    if (conflicts.total === 0 && unplaced.length === 0) {

        container.innerHTML = `

            <div class="card empty-state">

                <div>✓</div>

                <h3>No scheduling conflicts</h3>

                <p>
                    SMARTSCHED has detected no
                    current conflicts.
                </p>

            </div>

        `;

        return;

    }

    if (conflicts.teacher > 0) {

        addConflictCard(
            container,
            "Teacher Conflict",
            `${conflicts.teacher} teacher conflict(s) detected.`,
            "HIGH"
        );

    }

    if (conflicts.room > 0) {

        addConflictCard(
            container,
            "Room Conflict",
            `${conflicts.room} classroom conflict(s) detected.`,
            "HIGH"
        );

    }

    if (conflicts.section > 0) {

        addConflictCard(
            container,
            "Section Conflict",
            `${conflicts.section} section conflict(s) detected.`,
            "HIGH"
        );

    }

    /*
     SHORTAGE WARNINGS — classes the generator couldn't place at
     all (e.g. no free Computer Laboratory slot left for CSS/
     Empowerment Technologies) used to just vanish silently.
     These surface each one individually so it's clear which
     assignment needs a fix (add a room, free a slot, etc.)
     rather than a swallowed failure.
    */

    unplaced.forEach(reason => {

        addConflictCard(
            container,
            "Unscheduled Class",
            reason,
            "HIGH"
        );

    });

}


function addConflictCard(
    container,
    title,
    description,
    priority
) {

    const card =
        document.createElement("div");

    card.className = "conflict";

    card.innerHTML = `

        <div class="conflict-head">

            <h3>⚠ ${title}</h3>

            <span class="status-pill">
                ${priority}
            </span>

        </div>

        <p>${description}</p>

        <button class="action-btn"
            onclick="generateSchedule()">

            Apply Automatic Repair

        </button>

    `;

    container.appendChild(card);

}


/* =========================================================
   WHAT-IF SIMULATOR
   ========================================================= */

function runSimulation() {

    const type =
        document.getElementById(
            "scenarioType"
        ).value;

    const result =
        document.getElementById(
            "simulationResult"
        );

    let title = "";
    let message = "";
    let health = calculateHealth();

    switch (type) {

        case "teacher":

            title = "Teacher Removed";

            message =
                "Removing a teacher may affect several teaching assignments. SMARTSCHED would redistribute affected classes to qualified teachers.";

            health =
                Math.max(
                    0,
                    health - 7
                );

            break;

        case "room":

            title = "Classroom Removed";

            message =
                "Removing a classroom may require classes to move to available rooms or alternative time slots.";

            health =
                Math.max(
                    0,
                    health - 5
                );

            break;

        case "section":

            title = "New Section Added";

            message =
                "Adding a section increases scheduling demand and may require additional teacher or classroom capacity.";

            health =
                Math.max(
                    0,
                    health - 8
                );

            break;

        case "hours":

            title = "Subject Hours Increased";

            message =
                "Increasing subject hours creates additional scheduling requirements.";

            health =
                Math.max(
                    0,
                    health - 4
                );

            break;

    }

    result.innerHTML = `

        <div class="simulation-icon">
            🧪
        </div>

        <h2>${title}</h2>

        <p>${message}</p>

        <div style="
            font-size:40px;
            font-weight:800;
            color:var(--primary);
            margin:20px 0">

            ${health}/100

        </div>

        <span class="muted">
            Estimated Schedule Health
        </span>

    `;

}


/* =========================================================
   DEMO DATA
   ========================================================= */

function loadDemoData() {

    db.teachers = [

        {
            id: 1,
            name: "Juan Santos",
            employeeId: "T-001",
            department: "Mathematics",
            maxHours: 30,
            roomId: 1,
            isAdviser: true,
            advisorySectionId: 1
        },

        {
            id: 2,
            name: "Maria Cruz",
            employeeId: "T-002",
            department: "English",
            maxHours: 30,
            roomId: 2,
            isAdviser: true,
            advisorySectionId: 2
        },

        {
            id: 3,
            name: "Pedro Reyes",
            employeeId: "T-003",
            department: "Science",
            maxHours: 30,
            roomId: 4,
            isAdviser: true,
            advisorySectionId: 3
        },

        {
            id: 4,
            name: "Ana Garcia",
            employeeId: "T-004",
            department: "Filipino",
            maxHours: 30,
            roomId: 3,
            isAdviser: false,
            advisorySectionId: null
        },

        {
            id: 5,
            name: "Mark Dela Cruz",
            employeeId: "T-005",
            department: "PE",
            maxHours: 30,
            roomId: 6,
            isAdviser: false,
            advisorySectionId: null
        },

        {
            id: 6,
            name: "Liza Fernandez",
            employeeId: "T-006",
            department: "ICT",
            maxHours: 30,
            roomId: 5,
            isAdviser: false,
            advisorySectionId: null
        }

    ];


    db.subjects = [

        {
            id: 1,
            code: "GENMATH",
            name: "General Mathematics",
            hours: 4,
            minutes: 60,
            roomType: "Regular Classroom"
        },

        {
            id: 2,
            code: "ENG",
            name: "English",
            hours: 4,
            minutes: 60,
            roomType: "Regular Classroom"
        },

        {
            id: 3,
            code: "SCI",
            name: "Science",
            hours: 4,
            minutes: 60,
            roomType: "Laboratory"
        },

        {
            id: 4,
            code: "FIL",
            name: "Filipino",
            hours: 4,
            minutes: 60,
            roomType: "Regular Classroom"
        },

        {
            id: 5,
            code: "PE",
            name: "Physical Education",
            hours: 2,
            minutes: 60,
            roomType: "Gym"
        },

        {
            id: 6,
            code: "PR",
            name: "Practical Research",
            hours: 3,
            minutes: 60,
            roomType: "Regular Classroom"
        },

        {
            id: 7,
            code: "EMPTECH",
            name: "Empowerment Technologies",
            hours: 3,
            minutes: 60,
            roomType: "Computer Laboratory"
        },

        {
            id: 8,
            code: "CSS",
            name: "Computer Systems Servicing",
            hours: 4,
            minutes: 60,
            roomType: "Computer Laboratory"
        }

    ];


    db.sections = [

        {
            id: 1,
            grade: "Grade 11",
            name: "Rizal",
            students: 40
        },

        {
            id: 2,
            grade: "Grade 11",
            name: "Bonifacio",
            students: 38
        },

        {
            id: 3,
            grade: "Grade 11",
            name: "Mabini",
            students: 42
        }

    ];


    db.rooms = [

        {
            id: 1,
            name: "Room 101",
            type: "Regular Classroom",
            capacity: 45
        },

        {
            id: 2,
            name: "Room 102",
            type: "Regular Classroom",
            capacity: 45
        },

        {
            id: 3,
            name: "Room 103",
            type: "Regular Classroom",
            capacity: 45
        },

        {
            id: 4,
            name: "Science Lab",
            type: "Laboratory",
            capacity: 45
        },

        {
            id: 5,
            name: "Computer Lab",
            type: "Computer Laboratory",
            capacity: 40
        },

        {
            id: 6,
            name: "Gym",
            type: "Gym",
            capacity: 100
        }

    ];


    db.assignments = [

        {
            id: 1,
            teacherId: 1,
            subjectId: 1,
            sectionId: 1,
            hours: 4
        },

        {
            id: 2,
            teacherId: 1,
            subjectId: 1,
            sectionId: 2,
            hours: 4
        },

        {
            id: 3,
            teacherId: 1,
            subjectId: 1,
            sectionId: 3,
            hours: 4
        },

        {
            id: 4,
            teacherId: 2,
            subjectId: 2,
            sectionId: 1,
            hours: 4
        },

        {
            id: 5,
            teacherId: 2,
            subjectId: 2,
            sectionId: 2,
            hours: 4
        },

        {
            id: 6,
            teacherId: 2,
            subjectId: 2,
            sectionId: 3,
            hours: 4
        },

        {
            id: 7,
            teacherId: 3,
            subjectId: 3,
            sectionId: 1,
            hours: 4
        },

        {
            id: 8,
            teacherId: 3,
            subjectId: 3,
            sectionId: 2,
            hours: 4
        },

        {
            id: 9,
            teacherId: 3,
            subjectId: 3,
            sectionId: 3,
            hours: 4
        },

        {
            id: 10,
            teacherId: 4,
            subjectId: 4,
            sectionId: 1,
            hours: 4
        },

        {
            id: 11,
            teacherId: 4,
            subjectId: 4,
            sectionId: 2,
            hours: 4
        },

        {
            id: 12,
            teacherId: 4,
            subjectId: 4,
            sectionId: 3,
            hours: 4
        },

        {
            id: 13,
            teacherId: 5,
            subjectId: 5,
            sectionId: 1,
            hours: 2
        },

        {
            id: 14,
            teacherId: 5,
            subjectId: 5,
            sectionId: 2,
            hours: 2
        },

        {
            id: 15,
            teacherId: 5,
            subjectId: 5,
            sectionId: 3,
            hours: 2
        },

        {
            id: 16,
            teacherId: 6,
            subjectId: 7,
            sectionId: 1,
            hours: 3
        },

        {
            id: 17,
            teacherId: 6,
            subjectId: 8,
            sectionId: 2,
            hours: 4
        }

    ];


    db.schedule = [];
    db.unplaced = [];

    saveDB();

    renderAll();

    toast(
        "Demo school data loaded successfully."
    );

}


/* =========================================================
   MODAL
   ========================================================= */

function openModal(title, content) {

    document.getElementById("modalTitle")
        .textContent = title;

    document.getElementById("modalBody")
        .innerHTML = content;

    document.getElementById("modalOverlay")
        .classList.add("show");

}


function closeModal() {

    document.getElementById("modalOverlay")
        .classList.remove("show");

}


/* =========================================================
   TOAST
   ========================================================= */

function toast(message) {

    const element =
        document.getElementById("toast");

    element.textContent = message;

    element.classList.add("show");

    setTimeout(() => {

        element.classList.remove("show");

    }, 2500);

}


/* =========================================================
   PRINT
   ========================================================= */

function printSchedule() {

    window.print();

}


/* =========================================================
   EXPORT DATA
   ========================================================= */

function exportData() {

    const data =
        JSON.stringify(
            db,
            null,
            2
        );

    const blob =
        new Blob(
            [data],
            {
                type: "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        "smartsched-backup.json";

    link.click();

    URL.revokeObjectURL(url);

    toast("Database exported.");

}


/* =========================================================
   IMPORT DATA
   ========================================================= */

function triggerImport() {

    document.getElementById(
        "importFileInput"
    ).click();

}

function importData(event) {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {

        let parsed;

        try {

            parsed = JSON.parse(e.target.result);

        } catch (err) {

            toast("Import failed: not a valid JSON file.");
            event.target.value = "";
            return;

        }

        /*
         Sanity-check the shape before trusting it — a backup
         from this app should have these arrays. This won't
         catch every malformed file, but it stops obviously
         wrong ones (e.g. a random JSON file) from wiping the
         current database.
        */
        const requiredArrays = [
            "teachers",
            "subjects",
            "sections",
            "rooms",
            "assignments",
            "schedule"
        ];

        const looksValid =
            parsed &&
            typeof parsed === "object" &&
            requiredArrays.every(
                key => Array.isArray(parsed[key])
            );

        if (!looksValid) {

            toast(
                "Import failed: file doesn't look like a SMARTSCHED backup."
            );

            event.target.value = "";
            return;

        }

        if (
            !confirm(
                "Import this file? It will replace all current SMARTSCHED data."
            )
        ) {

            event.target.value = "";
            return;

        }

        /*
         Backfill anything an older or hand-edited export might
         be missing, same as the startup backfill above, so a
         partial file doesn't crash renderAll().
        */
        if (!Array.isArray(parsed.timeslots) || parsed.timeslots.length === 0) {

            parsed.timeslots = db.timeslots;

        }

        if (!parsed.objectives) {

            parsed.objectives = {
                workloadBalance: 0.85,
                roomEfficiency: 0.75,
                morningPreference: 0.60,
                teacherFreePeriods: 0.80
            };

        }

        db = parsed;

        saveDB();
        renderAll();

        toast("Database imported.");

        event.target.value = "";

    };

    reader.onerror = () => {

        toast("Import failed: couldn't read the file.");
        event.target.value = "";

    };

    reader.readAsText(file);

}


/* =========================================================
   CLEAR DATA
   ========================================================= */

function clearData() {

    if (
        !confirm(
            "Delete all SMARTSCHED data?"
        )
    ) return;

    localStorage.removeItem(
        "smartschedDB"
    );

    location.reload();

}


/* =========================================================
   SETTINGS
   ========================================================= */

function saveSettings() {

    const name =
        document.getElementById(
            "schoolName"
        ).value;

    localStorage.setItem(
        "smartschedSchoolName",
        name
    );

    toast("Settings saved.");

}


/* =========================================================
   AUTO REPAIR
   When db.autoRepair is on, renderConflicts() (below) fires
   generateSchedule() by itself the instant it finds a conflict
   or an unplaced assignment — no click needed.

   Regenerating is deterministic given the same inputs, so
   re-running it against data that hasn't changed would just
   reproduce the exact same conflicts forever. lastAutoRepairSignature
   guards against that: it's a snapshot of everything that feeds
   the generator (teachers, subjects, sections, rooms,
   assignments, objective weights), and auto repair only fires
   again once that snapshot actually changes — e.g. after you add
   a room or delete a bad assignment — instead of looping.
*/

let lastAutoRepairSignature = null;

function getSchedulingInputsSignature() {

    return JSON.stringify({
        teachers: db.teachers,
        subjects: db.subjects,
        sections: db.sections,
        rooms: db.rooms,
        assignments: db.assignments,
        objectives: db.objectives
    });

}

function toggleAutoRepair() {

    const el =
        document.getElementById("autoRepairToggle");

    if (!el) return;

    db.autoRepair = el.checked;

    saveDB();

    toast(
        db.autoRepair
            ? "Auto Repair turned on."
            : "Auto Repair turned off."
    );

    /*
     If it was just switched on and there are conflicts sitting
     on screen right now, don't make the user wait for the next
     data change to see it kick in.
    */

    if (db.autoRepair) {
        renderConflicts();
    }

}


/* =========================================================
   RENDER ALL
   ========================================================= */

function initSettingsControls() {

    const el =
        document.getElementById("autoRepairToggle");

    if (el) {
        el.checked = !!db.autoRepair;
    }

}

function renderAll() {

    initObjectiveSliders();

    initSettingsControls();

    updateDashboard();

    renderTeachers();

    renderSubjects();

    renderSections();

    renderRooms();

    renderTimeSlots();

    renderAssignments();

    updateScheduleFilters();

    renderSchedule();

    renderConflicts();

    renderWorkload();

    renderUtilization();

    renderHealthDetails();

}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderAll();

        /*
         Automatically load demo data
         on the first installation.
        */

        if (
            db.teachers.length === 0 &&
            db.subjects.length === 0
        ) {

            loadDemoData();

        }

    }
);