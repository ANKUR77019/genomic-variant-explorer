# Genomic Variant Explorer

A Flask and MongoDB web application for searching annotated genomic variants by gene and disease.

## Features

- Search by gene, disease, or both.
- Case-insensitive partial matching.
- ClinVar annotation fields: gene, disease, chromosome, position, REF, ALT, clinical significance, review status, and ClinVar ID.
- Paginated results with a maximum of 100 records per API request.
- Basic input validation, database health endpoint, and error handling.
- Responsive HTML/CSS interface.

## Architecture

1. **Source data:** NCBI ClinVar VCF for GRCh38.
2. **Parsing:** `cyvcf2` extracts variant annotations.
3. **Storage:** MongoDB collection `genomics_db.variants`.
4. **Backend:** Flask provides the `/search`, `/health`, and `/test-db` endpoints.
5. **Frontend:** HTML, CSS, and JavaScript render search results.

## Requirements

- Python 3
- MongoDB
- Python packages: Flask, PyMongo, cyvcf2

## Run locally

Start the MongoDB container used by your local setup, then run:

```bash
source .venv/bin/activate
python app.py
```

Open http://127.0.0.1:5000.

## API examples

```text
/search?gene=OR4F5
/search?disease=Retinitis_pigmentosa
/search?gene=OR4F5&disease=Retinitis_pigmentosa
/search?gene=OR4F5&page=1&per_page=20
/health
/test-db
```

## Data and limitations

This is a demonstration application, not a clinical decision-support system. The imported records represent only the subset present in the local MongoDB collection; they are not the entire ClinVar archive. Search results depend on the annotations included in that subset.

Clinical significance and review status are reported as supplied in ClinVar and should not be interpreted as a diagnosis. ClinVar records can have uncertain or conflicting interpretations. Reference coordinates are associated with GRCh38.

Source: NCBI ClinVar, https://www.ncbi.nlm.nih.gov/clinvar/

## Suggested future work

- Automated tests for API validation and search behavior.
- Better handling of multi-gene and multi-disease annotations.
- A curated, reproducible demonstration dataset.
- Deployment configuration and database access controls.
