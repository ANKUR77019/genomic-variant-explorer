import os
import re

from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import PyMongoError

app = Flask(__name__)
CORS(app, resources={
    r"/search": {"origins": "*"},
    r"/suggestions": {"origins": "*"}
})

MONGO_URI = os.environ.get(
    "MONGO_URI", "mongodb://localhost:27017/"
)
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
db = client["genomics_db"]
variants = db["variants"]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/health")
def health():
    try:
        client.admin.command("ping")
        return jsonify({"status": "ok", "database": "connected"})
    except PyMongoError:
        return jsonify({"status": "error", "database": "unavailable"}), 503

@app.route("/test-db")
def test_db():
    try:
        return jsonify({
            "database": "connected",
            "records": variants.count_documents({})
        })
    except PyMongoError:
        app.logger.exception("Database check failed")
        return jsonify({"error": "Database unavailable"}), 503


@app.route("/suggestions")
def suggestions():
    kind = request.args.get("type", "").strip().lower()
    term = request.args.get("q", "").strip()

    if kind not in {"gene", "disease"}:
        return jsonify({"error": "Type must be gene or disease."}), 400

    if len(term) > 200:
        return jsonify({"error": "Search term is too long."}), 400

    try:
        if kind == "gene":
            values = set(variants.distinct("gene"))
            values.update(variants.distinct("genes.symbol"))
        else:
            values = set(variants.distinct("diseases"))
            # Include disease names from the display field as a fallback.
            for value in variants.distinct("disease"):
                if isinstance(value, str):
                    values.update(part.strip() for part in value.split(","))

        values = [
            value.strip() for value in values
            if isinstance(value, str)
            and value.strip()
            and value.strip().lower() not in {
                "not specified", "none", "null"
            }
        ]

        if term:
            needle = term.casefold()
            values = [value for value in values if needle in value.casefold()]

        values = sorted(set(values), key=str.casefold)[:12]
        return jsonify({"suggestions": values})

    except PyMongoError:
        app.logger.exception("Suggestion lookup failed")
        return jsonify({"error": "Could not load suggestions."}), 503

@app.route("/search")
def search_variants():
    gene = request.args.get("gene", "").strip()
    disease = request.args.get("disease", "").strip()

    if not gene and not disease:
        return jsonify({
            "error": "Enter a gene name or disease."
        }), 400

    if len(gene) > 100 or len(disease) > 200:
        return jsonify({
            "error": "Search terms are too long."
        }), 400

    try:
        page = int(request.args.get("page", "1"))
        per_page = int(request.args.get("per_page", "20"))
    except ValueError:
        return jsonify({
            "error": "Page and page size must be integers."
        }), 400

    if page < 1 or per_page < 1:
        return jsonify({
            "error": "Page and page size must be positive."
        }), 400

    per_page = min(per_page, 100)
    conditions = []

    if gene:
        pattern = re.escape(gene)
        conditions.append({
            "$or": [
                {"gene": {"$regex": pattern, "$options": "i"}},
                {"genes.symbol": {"$regex": pattern, "$options": "i"}}
            ]
        })

    if disease:
        conditions.append({
            "disease": {
                "$regex": re.escape(disease),
                "$options": "i"
            }
        })

    query = conditions[0] if len(conditions) == 1 else {
        "$and": conditions
    }

    try:
        total = variants.count_documents(query)
        cursor = (
            variants.find(query, {"_id": 0})
            .sort([
                ("chromosome", 1),
                ("position", 1)
            ])
            .skip((page - 1) * per_page)
            .limit(per_page)
        )

        results = []
        for item in cursor:
            item["alt"] = item.get("alt") or []
            item["genes"] = item.get("genes") or []
            item["clinical_significance"] = (
                item.get("clinical_significance") or "Not provided"
            )
            item["review_status"] = (
                item.get("review_status") or "Not provided"
            )
            results.append(item)

        return jsonify({
            "count": len(results),
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page,
            "results": results
        })

    except PyMongoError:
        app.logger.exception("Variant search failed")
        return jsonify({
            "error": "Database search failed. Please try again."
        }), 503

if __name__ == "__main__":
    app.run(
        host=os.environ.get("FLASK_HOST", "127.0.0.1"),
        port=5000,
        debug=False
    )
