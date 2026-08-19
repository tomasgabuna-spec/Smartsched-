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

    document.getElementById("teacherConflicts").textContent =
        conflicts.teacher;

    document.getElementById("roomConflicts").textContent =
        conflicts.room;

    document.getElementById("sectionConflicts").textContent =
        conflicts.section;

    document.getElementById("sidebarConflict").textContent =
        conflicts.total;

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


function deleteSubject(id) {

    db.subjects =
        db.subjects.filter(s => s.id !== id);

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

            <button class="primary-btn modal-submit">
                Add Section
            </button>

        </form>
        `
    );

}


function addSection(event) {

    event.preventDefault();

    db.sections.push({

        id: Date.now(),

        grade:
            document.getElementById("sectionGrade").value,

        name:
            document.getElementById("sectionName").value,

        students:
            Number(
                document.getElementById("sectionStudents").value
            )

    });

    saveDB();

    closeModal();

    renderAll();

    toast("Section added successfully.");

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

    const subjectOptions =
        db.subjects.map(s =>
            `<option value="${s.id}">
                ${s.name}
            </option>`
        ).join("");

    const sectionOptions =
        db.sections.map(s =>
            `<option value="${s.id}">
                ${s.grade} - ${s.name}
            </option>`
        ).join("");

    openModal(
        "Add Teaching Assignment",
        `
        <form onsubmit="addAssignment(event)">

            <label>Teacher</label>

            <select id="assignmentTeacher">
                ${teacherOptions}
            </select>

            <label>Subject</label>

            <select id="assignmentSubject">
                ${subjectOptions}
            </select>

            <label>Section</label>

            <select id="assignmentSection">
                ${sectionOptions}
            </select>

            <label>Weekly Hours</label>

            <input id="assignmentHours"
                type="number"
                value="4">

            <button class="primary-btn modal-submit">
                Add Assignment
            </button>

        </form>
        `
    );

}


function addAssignment(event) {

    event.preventDefault();

    db.assignments.push({

        id: Date.now(),

        teacherId:
            Number(
                document.getElementById("assignmentTeacher").value
            ),

        subjectId:
            Number(
                document.getElementById("assignmentSubject").value
            ),

        sectionId:
            Number(
                document.getElementById("assignmentSection").value
            ),

        hours:
            Number(
                document.getElementById("assignmentHours").value
            )

    });

    saveDB();

    closeModal();

    renderAll();

    toast("Teaching assignment added.");

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

        const classSlots =
            db.timeslots.filter(
                s => s.type === "class"
            );

        const unplaced = [];

        db.assignments.forEach((assignment, assignmentIndex) => {

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

            const requiredMeetings =
                Number(assignment.hours);

            if (requiredMeetings <= 0 || classSlots.length === 0) {
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

            let placed = false;

            /*
             PARALLEL SCHEDULING:
             try to find ONE period that is free across enough
             days of the week, so the subject always meets at
             the same period (e.g. Monday–Friday, Period 1).
            */

            for (
                let attempt = 0;
                attempt < classSlots.length && !placed;
                attempt++
            ) {

                const slot =
                    classSlots[
                        (assignmentIndex + attempt) %
                        classSlots.length
                    ];

                const availableDays = [];

                for (const day of days) {

                    const teacherBusy =
                        db.schedule.some(
                            x =>
                                x.teacherId === teacher.id &&
                                x.day === day &&
                                x.slotId === slot.id
                        );

                    if (teacherBusy) continue;

                    const sectionBusy =
                        db.schedule.some(
                            x =>
                                x.sectionId === section.id &&
                                x.day === day &&
                                x.slotId === slot.id
                        );

                    if (sectionBusy) continue;

                    let dayRoom = fixedRoom;

                    if (isPE) {

                        dayRoom =
                            findAvailableRoomOfType(
                                section,
                                "Gym",
                                day,
                                slot.id
                            );

                    } else {

                        const roomBusy =
                            db.schedule.some(
                                x =>
                                    x.roomId === fixedRoom.id &&
                                    x.day === day &&
                                    x.slotId === slot.id
                            );

                        if (roomBusy) dayRoom = null;

                    }

                    if (!dayRoom) continue;

                    availableDays.push({ day, room: dayRoom });

                }

                if (availableDays.length >= requiredMeetings) {

                    availableDays
                        .slice(0, requiredMeetings)
                        .forEach(({ day, room }) => {

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

                    placed = true;

                }

            }

            /*
             FALLBACK — some circumstances just can't follow the
             clean parallel pattern (e.g. not enough free days at
             any single period). Place meetings one at a time on
             a best-effort basis instead of dropping them.
            */

            if (!placed) {

                let remaining = requiredMeetings;
                let guard = 0;

                while (remaining > 0 && guard < 300) {

                    guard++;

                    const slot =
                        classSlots[
                            (assignmentIndex + guard) %
                            classSlots.length
                        ];

                    const day =
                        days[guard % days.length];

                    const teacherBusy =
                        db.schedule.some(
                            x =>
                                x.teacherId === teacher.id &&
                                x.day === day &&
                                x.slotId === slot.id
                        );

                    const sectionBusy =
                        db.schedule.some(
                            x =>
                                x.sectionId === section.id &&
                                x.day === day &&
                                x.slotId === slot.id
                        );

                    if (teacherBusy || sectionBusy) continue;

                    let room = null;

                    if (isPE) {

                        room =
                            findAvailableRoomOfType(
                                section,
                                "Gym",
                                day,
                                slot.id
                            );

                    } else {

                        const roomBusy =
                            db.schedule.some(
                                x =>
                                    x.roomId === fixedRoom.id &&
                                    x.day === day &&
                                    x.slotId === slot.id
                            );

                        room =
                            !roomBusy
                                ? fixedRoom
                                : findAvailableRoom(
                                    subject,
                                    section,
                                    day,
                                    slot.id
                                );

                    }

                    if (!room) continue;

                    db.schedule.push({

                        id: Date.now() + Math.random(),
                        day: day,
                        slotId: slot.id,
                        teacherId: teacher.id,
                        subjectId: subject.id,
                        sectionId: section.id,
                        roomId: room.id

                    });

                    remaining--;

                }

                if (remaining > 0) {

                    unplaced.push(
                        `${teacher.name} – ${subject.name} (${section.grade} ${section.name}): ${remaining} of ${requiredMeetings} periods could not be placed`
                    );

                    console.warn(
                        "Could not fully place assignment:",
                        assignment
                    );

                }

            }

        });

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

    const autoRoom =
        db.rooms.find(room =>
            room.type !== "Gym" &&
            room.capacity >= Number(section.students)
        ) || null;

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

    return db.rooms.find(room => {

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

    }) || null;

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

                cell += `

                    <div class="schedule-item">

                        <strong>
                            ${subject?.code || "Subject"}
                        </strong>

                        <span>
                            ${subject?.name || ""}
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

    container.innerHTML = "";

    if (conflicts.total === 0) {

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
        }

    ];


    db.schedule = [];

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
   RENDER ALL
   ========================================================= */

function renderAll() {

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