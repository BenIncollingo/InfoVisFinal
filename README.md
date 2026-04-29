## Project Overview
This project is an interactive data visualization tool that helps students easily explore and understand Rate My Professor data for Temple University Computer Science professors. It includes a heatmap that shows which professors teach each course along with their ratings, making it easier to compare options. There is also a schedule builder that lets students pick classes and see an overall difficulty gauge, helping them balance their semester and avoid making their schedule harder than it needs to be.

## Installation / Setup
1. Clone the repository:
```
git clone https://github.com/BenIncollingo/InfoVisFinal.git
cd InfoVisFinal
```

2. Run the project on a local server:
```
python -m http.server 8000
```

3. Open localhost:8000 in a browser

## Lessons Learned
- Working with D3.js taught us how important it is to structure data correctly before building a visualization, since everything depends on how the data is organized.
- Separating D3 code into modular files made the project easier to manage and scale as more features were added.
- Keeping things simple in javascript/D3 files, and moving as many elements to html tags as possible made the project more organized.