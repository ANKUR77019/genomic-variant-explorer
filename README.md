# Genomic Variant Explorer

**Live application:** [Open Genomic Variant Explorer](https://genomic-variant-explorer-frontend.vercel.app)  
**Backend API:** [Render API](https://genomic-variant-explorer.onrender.com)  
**AWS EC2 instance:** [http://3.25.190.83](http://3.25.190.83)  
**Source code:** [GitHub repository](https://github.com/ANKUR77019/genomic-variant-explorer)

## Overview

Genomic Variant Explorer is a web application I built to make genomic variant records easier to search and inspect. Users can search by gene or disease, use autocomplete suggestions to narrow a query, and browse the matching records returned by the database.

The project brings together a browser-based interface, a Flask API, and a MongoDB collection. I separated the frontend from the backend for deployment: the static interface is hosted on Vercel, while the Flask service runs on Render and connects to MongoDB Atlas. I also used Docker while setting up and testing the application on a local Ubuntu environment and an AWS EC2 Linux instance.

The database currently contains **1,000 variant documents** in the `genomics_db.variants` collection.

## Application

The deployed application is available here:

**[https://genomic-variant-explorer-frontend.vercel.app](https://genomic-variant-explorer-frontend.vercel.app)**

The backend health endpoint can be checked at [Render `/health`](https://genomic-variant-explorer.onrender.com/health).

## What it does

- **Gene search:** search variant records using a gene symbol, for example `OR4F5`.
- **Disease search:** query records using a disease term supported by the dataset.
- **Autocomplete:** request gene or disease suggestions as a query is entered.
- **Search results:** retrieve matching records from MongoDB through the Flask API.
- **Pagination:** browse results without needing to load every matching record at once.
- **Health check:** verify that the API is running and can connect to the database.

## How the application is connected

```text
User's browser
      |
      v
HTML / CSS / JavaScript frontend
Hosted on Vercel
      |
      | HTTPS requests to /search and /suggestions
      v
Flask API
Hosted on Render
      |
      v
MongoDB Atlas
Database: genomics_db
Collection: variants
```

The browser sends search requests to the API. Flask validates and processes the query, retrieves matching documents from MongoDB, and returns JSON for the frontend to display. CORS is configured to allow requests from the deployed Vercel frontend.

## Technology stack

| Area | Tools |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Python, Flask, Flask-CORS |
| Database | MongoDB, PyMongo, MongoDB Atlas |
| Containerization | Docker, Docker Compose |
| Deployment | Vercel, Render, AWS EC2 |
| Development environment | Ubuntu, Python virtual environment |
| Version control | Git, GitHub |

## API endpoints

Base URL: `https://genomic-variant-explorer.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Checks API availability and MongoDB connectivity |
| `GET` | `/test-db` | Checks database connectivity and reports the record count |
| `GET` | `/suggestions?type=gene&q=OR4` | Returns gene suggestions matching the query |
| `GET` | `/suggestions?type=disease&q=<term>` | Returns disease suggestions matching the query |
| `GET` | `/search?gene=OR4F5` | Searches for records matching the supplied gene |

The search endpoint also supports the filters and pagination implemented in the frontend.

### Example request

```bash
curl "https://genomic-variant-explorer.onrender.com/suggestions?type=gene&q=OR4"
```

Example response:

```json
{
  "suggestions": ["OR4F5"]
}
```

Health check:

```bash
curl "https://genomic-variant-explorer.onrender.com/health"
```

Example response:

```json
{
  "database": "connected",
  "status": "ok"
}
```

## Project structure

```text
genomic-variant-explorer/
├── app.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── templates/
│   └── index.html
├── static/
│   ├── app.js
│   └── style.css
└── README.md
```

`app.py` contains the Flask application and API routes. `frontend/` contains the standalone static site deployed on Vercel. `templates/` and `static/` contain the frontend assets used when the application is served directly by Flask. The Docker configuration is used to package and run the backend.

## Running locally

### Requirements

- Python 3.10 or later
- Git
- A MongoDB instance or MongoDB Atlas database
- Docker, if running the containerized setup

### Install and start

```bash
git clone https://github.com/ANKUR77019/genomic-variant-explorer.git
cd genomic-variant-explorer

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
```

Set `MONGO_URI` to a MongoDB connection string you control, then start the application:

```bash
export MONGO_URI="your-mongodb-connection-string"
python app.py
```

Open `http://127.0.0.1:5000` in a browser.

The application uses the `genomics_db` database and the `variants` collection. Database credentials belong in environment variables, not in source files or frontend JavaScript.

## Deployment

The frontend and API are deployed separately:

- **Vercel:** serves the static HTML, CSS, and JavaScript interface.
- **Render:** runs the Flask API with Gunicorn in a Docker-based deployment.
- **MongoDB Atlas:** stores the variant records accessed by the API.
- **AWS EC2:** used for Linux server access and Docker-based deployment/testing during setup.

The frontend's API base URL points to the Render service. The backend reads its MongoDB connection string from the `MONGO_URI` environment variable. The CORS policy allows the deployed frontend origin so that browser requests can reach the API.

## Screenshots

The screenshots section can show the actual application interface and search behaviour. The most useful views are the home page, a successful gene search, and the autocomplete dropdown.

## Author

**Ankur Vats**

- [GitHub](https://github.com/ANKUR77019)
- [LinkedIn](https://www.linkedin.com/in/ankur-vats-936a9924b)
