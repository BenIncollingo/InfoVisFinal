import {
  d3,
  loadCourseData,
  diffColor,
} from "./data.js";

const picked = {}; //empty object for the selected courses

//helper function to get the difficulty that should be displayed
//try to use the course-specific difficulty first, and if that is not available use the professor average difficulty
function getDisplayDifficulty(record) {
  return record.courseDifficulty ?? record.profDifficulty ?? 0;
}

loadCourseData().then(unique => { //loads the data set from data.js
  const grouped = d3.rollup(
    unique.filter(r => getDisplayDifficulty(r) > 0), //only keep rows with difficulty scores
    v => ({
      courseTitle: v[0].courseTitle,
      professors: v.map(r => ({
        name: r.prof,
        difficulty: getDisplayDifficulty(r), //use course difficulty first, then fall back to professor average difficulty
      })),
      avg: d3.mean(v, r => getDisplayDifficulty(r)), //average difficulty for this course
    }),
    r => r.courseId //group rows by course ID
  );

  const courses = Array.from(grouped, ([courseId, value]) => ({
    courseId,
    ...value,
  })).sort((a, b) => a.courseId.localeCompare(b.courseId));

  updateList(courses); //initialize the list of all courses on the course list
  updateGauge(courses); //initialize the difficulty guage
});

//function to update the course list 
function updateList(courses) {
  const list = document.getElementById("course-list");

  // Clear the course list before rebuilding it
  list.innerHTML = "";

  // Loop through every course and create a button for it
  courses.forEach(course => {
    const btn = document.createElement("button");

    // Check if this course is currently selected
    const selected = course.courseId in picked;

    // Style the button differently if it is selected
    btn.className = `w-full text-left px-2 py-1 rounded flex items-center gap-2 text-xs ${
      selected
        ? "bg-red-50 border border-red-200"
        : "hover:bg-gray-50"
    }`;

    // Put the course info inside the button
    btn.innerHTML = `
      <span class="w-3 h-3 rounded inline-block border border-gray-300" style="background:${diffColor(course.avg)}"></span>
      <span class="font-bold w-20 inline-block">${course.courseId}</span>
      <span class="flex-1 truncate text-gray-600 inline-block">${course.courseTitle}</span>
      <span class="text-gray-400 ml-auto">${course.avg.toFixed(1)}</span>
    `;

    // When clicked, add/remove the course from picked
    btn.addEventListener("click", () => {
      if (selected) {
        delete picked[course.courseId];
      } else {
        picked[course.courseId] = course.professors[0]?.name ?? null;;
      }

      // Rebuild the course list, selected course area, and gauge
      updateList(courses);
      updateSelected(courses);
      updateGauge(courses);
    });

    // Add the button to the course list
    list.appendChild(btn);
  });
}


//writes out the proffesor options buttons for the course
function drawProfessorOptions(container, course, courses) {
  container.html(""); // clear the old professor buttons before redrawing

  // get the professor that is currently selected for this course (should default to the first in the list or null)
  const selectedProfessor = picked[course.courseId];

  // loop through every professor for this course and make a button/card for each one
  const cards = container
    .selectAll("button")
    .data(course.professors)
    .join("button")
    .attr("class", professor => {
      const selected = selectedProfessor == professor.name; //check to see if its already selected and set this to true of false

      // if selected is true for this proffesor, make it red, otherwise normal grey styling
      return `
        w-full text-left px-3 py-2 rounded-lg border text-xs transition
        ${selected
          ? "bg-[#9D2235]/10 border-[#9D2235] text-[#9D2235]"
          : "bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700"}
      `;
    })
    .on("click", (_, professor) => {
      // if this professor is already selected, unselect them, otherwise save this professor as the selected professor for this course
      picked[course.courseId] = selectedProfessor == professor.name ? null : professor.name;

      // update the selected course area and the gauge after changing professor
      updateSelected(courses);
      updateGauge(courses);
    });

  // add the professor name inside the professor button
  cards.append("div")
    .attr("class", "font-semibold truncate")
    .text(professor => professor.name);

  // add the difficulty number inside the professor button
  cards.append("div")
    .attr("class", "mt-1 flex items-center justify-between text-[11px]")
    .html(professor => `
      <span class="text-gray-500">Difficulty</span>
      <span class="font-bold px-2 py-0.5 rounded" style="background:${diffColor(professor.difficulty)}; color:white;">
        ${professor.difficulty.toFixed(1)}
      </span>
    `);
}

function updateSelected(courses) {
  const ids = Object.keys(picked); //get all the picked courses from the picked object
  const box = d3.select("#selected"); //select the right hand side div

  box.html("");

  if (!ids.length) { //if there are no courses selected, display message to user
    box.append("div")
      .attr("class", "text-xs text-gray-400 text-center py-8")
      .text("Click courses on the left.");
    return;
  }

  ids.forEach(id => { //for each course currently selected
    const course = courses.find(c => c.courseId == id); //get the full course object from the list

    const div = box.append("div"); //create a div for the current selected course

    div.append("div") //add the courseID
      .attr("class", "text-xs font-bold")
      .text(course.courseId);

    div.append("div") //add the name of the course 
      .attr("class", "text-[11px] text-gray-500 truncate")
      .text(course.courseTitle);

    const options = div.append("div") //craete another div for the prof options
      .attr("class", "mt-2 space-y-1");

    drawProfessorOptions(options, course, courses); //call this function to create the buttons for each proffesor in the selected div
  });
}


//funcion to update the guage 
function updateGauge(courses) {
  
  const ids = Object.keys(picked); //gets all the courseIDs from the pcked object
  let avg = null; 
  let sum = 0;

  if (ids.length) { //if there are courses selected already, calculate the average diffuculty
    ids.forEach(id => { //get the sum of each course difficulty
      const course = courses.find(c => c.courseId == id); //get the ill course object based off of the courses selected


      let difficulty = course.avg; //default to aerage difficulty inc ase there isnt one per proffesor
      
      const professorName = picked[id]; //get the current proffesor selected from this course

      // if a professor is selected, try to use their difficulty instead
      if (professorName) {
        const prof = course.professors.find(p => p.name == professorName); //find proffesoir in course list

        if (prof) {
          difficulty = prof.difficulty; //use the proffesors difficulty score not the course difficulty
        }
      } 

      sum += difficulty;
    });

    avg = Math.round((sum / ids.length) * 10) / 10; //anoying way to do this just to get a 1 decimal point
  }

  const svg = d3.select("#gauge"); //select the guage element
  svg.selectAll("*").remove(); //clear it from the last update

  //object to draw the arc for the guage
  const arc = d3.arc()
    .innerRadius(71)
    .outerRadius(89)
    .startAngle(d => d.start)
    .endAngle(d => d.end);

  
  const g = svg.append("g")
    .attr("transform", "translate(100 100)");

  //daw out the 3 colors for easy, medium, hard diffuclty on the blank guage
  g.selectAll("path.segment")
    .data([
      { start: -Math.PI / 2, end: -Math.PI / 6, color: "#16a34a" },
      { start: -Math.PI / 6, end: Math.PI / 6, color: "#f59e0b" },
      { start: Math.PI / 6, end: Math.PI / 2, color: "#dc2626" },
    ])
    .join("path")
    .attr("class", "segment")
    .attr("d", arc)
    .attr("fill", d => d.color);

  
  //converts the difficulty value to an angle 
  const angleScale = d3.scaleLinear()
    .domain([1, 5])
    .range([-Math.PI / 2, Math.PI / 2])
    .clamp(true);

  
  //defines the angle of the needle
  const angle = avg !== null ? angleScale(avg) : -Math.PI / 2;
  const color = avg !== null ? diffColor(avg) : "#d1d5db"; //defines the color for the filled in part of the gauge

  //applies the fill to the gauge up to how far the angle is.
  /* if (avg !== null) {
    g.append("path")
      .attr("d", d3.arc()({
        innerRadius: 71,
        outerRadius: 89,
        startAngle: -Math.PI / 2,
        endAngle: angle,
      }))
      .attr("fill", color)
      .attr("opacity", 0.6);
  } */

  //this points the needle at the right angle
  g.append("line")
    .attr("x2", 0)
    .attr("y2", -72)
    .attr("stroke", color)
    .attr("stroke-width", 3)
    .attr("stroke-linecap", "round")
    .attr("transform", `rotate(${angle * 180 / Math.PI})`);

  g.append("circle")
    .attr("r", 7)
    .attr("fill", color);

  g.append("circle")
    .attr("r", 3)
    .attr("fill", "#fff");

  //writes easy, medium, hard under the needle in their corresponding colors 
  svg.selectAll("text.label")
    .data([
      { x: 20, text: "Easy", color: "#16a34a" },
      { x: 100, text: "Medium", color: "#ca8a04" },
      { x: 180, text: "Hard", color: "#dc2626" },
    ])
    .join("text")
    .attr("class", "label")
    .attr("x", d => d.x)
    .attr("y", 115)
    .attr("text-anchor", "middle")
    .attr("font-size", 10)
    .attr("fill", d => d.color)
    .text(d => d.text);

  //displays the average number 
  d3.select("#avg-number")
    .text(avg !== null ? avg.toFixed(1) : "—")
    .style("color", avg !== null ? diffColor(avg) : "#9ca3af");
}