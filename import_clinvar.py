from pathlib import Path

from cyvcf2 import VCF
from pymongo import MongoClient, ASCENDING

VCF_FILE = Path("data/clinvar/clinvar.vcf.gz")
MAX_RECORDS = 1000

client = MongoClient("mongodb://localhost:27017/")
db = client["genomics_db"]
variants = db["variants"]

def get_info(record, key):
    value = record.INFO.get(key)
    if value is None:
        return None
    return str(value)

def split_values(value):
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]

def parse_variant(record):
    gene_info = get_info(record, "GENEINFO")
    if not gene_info:
        return None

    genes = []
    for item in gene_info.split("|"):
        if ":" in item:
            symbol, gene_id = item.split(":", 1)
            genes.append({
                "symbol": symbol,
                "gene_id": gene_id
            })

    if not genes:
        return None

    diseases = split_values(get_info(record, "CLNDN"))
    disease_ids = split_values(get_info(record, "CLNDISDB"))

    return {
        "chromosome": str(record.CHROM),
        "position": int(record.POS),
        "ref": record.REF,
        "alt": list(record.ALT),
        "clinvar_id": str(record.ID) if record.ID else None,
        "genes": genes,
        "gene": genes[0]["symbol"],
        "gene_ids": [item["gene_id"] for item in genes],
        "diseases": diseases,
        "disease": ", ".join(diseases) if diseases else "not specified",
        "disease_ids": disease_ids,
        "clinical_significance": get_info(record, "CLNSIG"),
        "review_status": get_info(record, "CLNREVSTAT"),
        "variant_type": get_info(record, "CLNVC"),
        "molecular_consequence": get_info(record, "MC"),
        "source": "NCBI ClinVar",
        "reference_assembly": "GRCh38",
    }

def main():
    if not VCF_FILE.exists():
        raise FileNotFoundError(f"VCF file not found: {VCF_FILE}")

    reader = VCF(str(VCF_FILE))
    documents = []

    try:
        for record in reader:
            document = parse_variant(record)

            if document is None:
                continue

            documents.append(document)

            if len(documents) >= MAX_RECORDS:
                break
    finally:
        reader.close()

    if not documents:
        print("No gene-annotated records found. Database unchanged.")
        return

    print(f"Prepared {len(documents)} ClinVar records.")

    # Replace the collection only after records have been prepared.
    variants.delete_many({})
    variants.insert_many(documents)

    variants.create_index([("gene", ASCENDING)])
    variants.create_index([("disease", ASCENDING)])
    variants.create_index([("genes.symbol", ASCENDING)])

    print("Import complete.")
    print(f"Documents in database: {variants.count_documents({})}")
    print("Indexes created for gene and disease searches.")

if __name__ == "__main__":
    main()
