import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

const t = d3.scaleLinear()
  .domain([1, 5])
  .range([0, 1])
  .clamp(true);


//gets the rating color based on the value 
export function ratingColor(value) {
  const scale = d3.scaleLinear()
    .domain([1, 3, 5])
    .range(["#dc2626", "#f59e0b", "#16a34a"]) // red → orange → green
    .clamp(true);

  return scale(value);
}


//exports the difficulty rating based off of the value
export function diffColor(value) {
  const scale = d3.scaleLinear() //creates a color scale for the difficulties for the color control
    .domain([1, 3, 5])
    .range(["#16a34a", "#f59e0b", "#dc2626"]) //opposite of ratingColor because difficulty higher is bad
    .clamp(true);

  return scale(value);
}

export function decodeHtml(str) {
  return (str || "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

//function used in heatmap.js to return the level of a specified course
//turns CIS 3755 into 3000
export function getCourseLevel(courseId) {
  const match = courseId.match(/CIS(\d)/);
  return match ? Number(match[1]) * 1000 : 0;
}

//function used in heatmap.js to return the RMP url
export function getRmpUrl(encodedId) {
  if (!encodedId) return "";

  try {
    const decoded = atob(encodedId);
    const match = decoded.match(/Teacher-(\d+)/);
    return match ? `https://www.ratemyprofessors.com/professor/${match[1]}` : "";
  } catch {
    return "";
  }
}


//main function that loads and organzes the data from the csv.
export function loadCourseData() {
  return d3.csv("./temple_rmp_fused.csv").then(data => {

    const rows = data.map(r => ({ //clean rows into JSON objects 
      courseId: r.course_id,
      courseTitle: decodeHtml(r.course_title),
      prof: r.professor_name,

      courseRating: +r.course_rating_from_ratings || null, // attempt to get prof rating by course
      profRating: +r.professor_rating || null, //get average prof rating

      courseDifficulty: +r.course_difficulty_from_ratings || null, //attempt to get difficulty rating per course
      profDifficulty: +r.professor_avg_difficulty || null, //get average difficulty rating 

      ratingCount: +r.course_rating_count || 0,
      teacherId: r.rmp_teacher_id || "",
    }))
    .filter(r => r.courseId && r.prof)
    .filter(r => {
      const courseLevel = getCourseLevel(r.courseId);
      return courseLevel > 0 && courseLevel < 5000;
    });

    return Array.from(
      d3.rollup(rows, v => v[0], r => `${r.courseId}|${r.prof}`).values()
    );
  });
}
export { d3 };