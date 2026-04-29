import {
  d3,
  loadCourseData,
  ratingColor,
  getCourseLevel,
  getRmpUrl,
} from "./data.js";

const svg = d3.select("#heatmap-svg"); //select the heatmap element in the html

//create a new div that appears when hovering over a block in the heatmap (defaults as invisible)
const tip = d3.select("body")
  .append("div")
  .style("position", "fixed")
  .style("pointer-events", "none")
  .style("z-index", 50)
  .style("background", "white")
  .style("border", "1px solid #e5e7eb")
  .style("border-radius", "10px")
  .style("box-shadow", "0 8px 20px rgba(0,0,0,.12)")
  .style("padding", "10px 12px")
  .style("font-size", "12px")
  .style("opacity", 0);

//loadCourseData function from data.js
loadCourseData().then(unique => { //load coursedata function from data.js
  let level = null; //default to all levels

  drawHeatmap(unique, level); // build the heatmap with default selection

  document.querySelectorAll(".level-btn").forEach(btn => { //everytime a level button is clicked
    btn.addEventListener("click", () => {
      const selectedLevel = btn.value; //get the level value from the html button elements

      // Convert the selected button value into an int value (null for all)
      if (selectedLevel == "all") {
        level = null; // null is the default for all courses
      } else {
        level = Number(selectedLevel); // convert string from html element to an integer
      }

      // changing the slected button to red and the rest to white/grey styling
      document.querySelectorAll(".level-btn").forEach(b => { // loop for all buttons
        b.classList.remove("bg-[#9D2235]", "text-white", "border-[#9D2235]"); // take away the red and add unselected white/grey style from all buttons
        b.classList.add("bg-white", "text-gray-600", "border-gray-300");
      });

      btn.classList.add("bg-[#9D2235]", "text-white", "border-[#9D2235]"); // add the red only to the selected
      btn.classList.remove("bg-white", "text-gray-600", "border-gray-300"); //take away the white style from the selected

      drawHeatmap(unique, level); //redraw the heatmap with the new level selection.
    });
  });
});

//helper function to get the rating that should be displayed
//try to use the course-specific rating first, and if that is not available use the professor average rating
function getDisplayRating(record) {
  return record.courseRating ?? record.profRating ?? 0;
}

//helper function to get the difficulty that should be displayed
//try to use the course-specific difficulty first, and if that is not available use the professor average difficulty
function getDisplayDifficulty(record) {
  return record.courseDifficulty ?? record.profDifficulty ?? null;
}

// Draws the heatmap based on the currently selected course level
function drawHeatmap(unique, level) {

  // filter the unique data
  const filtered = unique
    .filter(r => getDisplayRating(r) > 0) //only add to filtered if the professor has a rating (course rating first, then average professor rating)
    .filter(r => {
      if (level !== null) { //only do this if the level is specified, when level is null it gets all courses so it can be skipped
        const courseLevel = getCourseLevel(r.courseId); //get the course level from the course ID (CIS3755 => 3000), function is in data.js

        return courseLevel == level; //if the course level matches the level selected, keep it
      }

      return true;
    });

  // gets an array of all the unique course IDs, this is used for the rows in the heatmap
  const courses = Array.from(new Set(filtered.map(r => r.courseId))).sort(); //gets all courses, the set makes them unique, and then it gets turned back into an array and sorted

  // gets an array of all the unique proffesor names, this is used for the columns in the heatmap
  const profs = Array.from(new Set(filtered.map(r => r.prof))) //gets a unique array of all the proffesor names, similar to the courseIDs
    .sort((a, b) => { //sorts professors by last name
      const lastA = a.split(" ").pop();
      const lastB = b.split(" ").pop();
      return lastA.localeCompare(lastB);
    });

  // Heatmap block size
  const block_size = 35;

  //craeats an margin object, margins of each side of the SVG
  const margins = { top: 100, left: 50, right: 10, bottom: 10 };

  // Calculate the full SVG width and height
  const width = margins.left + (profs.length * block_size) + margins.right;
  const height = margins.top + (courses.length * block_size) + margins.bottom;

  svg.selectAll("*").remove(); //need to remove the previous heatmap before generating a new one or they will overwrite
  svg.attr("width", width).attr("height", height); //redefine the new heatmap SVG element

  // Horizontal scale for columns
  const x = d3.scaleBand()
    .domain(profs)
    .range([0, profs.length * block_size])
    .padding(0.05);

  // Vertical scale for rows
  const y = d3.scaleBand()
    .domain(courses)
    .range([0, courses.length * block_size])
    .padding(0.05);

  // definition of the main heatpmap grid group
  const g = svg.append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Create every possible course/professor block
  const data = courses.flatMap(course => //loop through every course
    profs.map(prof => ({ // loop through each proffesor
      course,
      prof,
      record: filtered.find(r => r.courseId == course && r.prof == prof), //if the current course is taught by the current professor, add the record to the heatmap dataset
    }))
  );

  // Draw the heatmap blocks
  g.selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", d => x(d.prof))
    .attr("y", d => y(d.course))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 3)
    .attr("fill", d => {
      if (!d.record) return "#f3f4f6"; //default is grey if no professor+course record exists

      const rating = getDisplayRating(d.record); //use course rating first, then fall back to professor average rating
      return ratingColor(rating); //change color of rectangle based on the display rating
    })
    .style("cursor", d => d.record ? "pointer" : "default") //change the cursor style to pointer instead of default when hovering on a block with a record.
    .on("mousemove", (event, d) => {
      if (!d.record) return; //if there is no record for this block then return

      const rating = getDisplayRating(d.record); //use course rating first, then fall back to professor average rating
      const diff = getDisplayDifficulty(d.record); //use course difficulty first, then fall back to professor average difficulty

      tip //if this block has a record, then show the tip div while hovering over the block
        .style("left", event.clientX + 14 + "px")
        .style("top", event.clientY - 8 + "px")
        .style("opacity", 1)
        .html(`
          <b>${d.course}</b> — ${d.record.courseTitle}<br/>
          ${d.record.prof}<br/>
          Rating: <b style="color:${ratingColor(rating)}">${rating.toFixed(1)}</b> / 5
          ${diff !== null ? `<br/>Difficulty: <b style="color:#f97316">${diff.toFixed(1)}</b>` : ""}
        `); //html code for hover-popup
    })
    .on("mouseleave", () => tip.style("opacity", 0)) // Hide the tooltip when the mouse leaves the block
    .on("click", (_, d) => { // Open the profs Rate My Professor page when the block is clicked
      if (!d.record) return; //return if not a block with a prof+course record combo

      const url = getRmpUrl(d.record.teacherId); //function in data.js
      if (url) window.open(url, "_blank"); //if the url is valid, open the url in a new tab
    });

  // Add the rating number inside each filled block
  g.selectAll("text.value")
    .data(data.filter(d => d.record))
    .join("text")
    .attr("class", "value")
    .attr("x", d => x(d.prof) + x.bandwidth() / 2)
    .attr("y", d => y(d.course) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .attr("font-size", 10)
    .attr("font-weight", 700)
    .attr("pointer-events", "none")
    .attr("fill", "#fff")
    .text(d => getDisplayRating(d.record).toFixed(1)); //adds the text to the block and truncates to one decimal point

  // Add course labels on the left side
  const yAxis = svg.append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`)
    .call(d3.axisLeft(y).tickSize(0));

  yAxis.select(".domain").remove();
  yAxis.selectAll("text").attr("font-size", 10);

  // Add professor labels across the top
  const xAxis = svg.append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`)
    .call(d3.axisTop(x).tickSize(0));

  xAxis.select(".domain").remove();
  xAxis.selectAll("text")
    .attr("font-size", 10)
    .attr("text-anchor", "start")
    .attr("transform", "rotate(-55) translate(4,-2)"); //rotate them a bit clockwise make them more readable
}