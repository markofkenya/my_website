#!/usr/bin/env python3
"""Create tabs and seed the Google Sheets coverage ledger from confirmed KSAP taxonomy."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SHEET_ID = "1VqtHm2DaAsgxizS9EWxLSJNHPBNcodpH5qLpH1FqLMQ"
TAXONOMY_PATH = ROOT / "curriculum" / "ksap-concepts-v1.json"
CONFIG_PATH = ROOT / "curriculum" / "coverage-ledger-config.json"
GOOGLE_API = Path.home() / ".hermes" / "skills" / "productivity" / "google-workspace" / "scripts" / "google_api.py"


def load_google_api():
    spec = importlib.util.spec_from_file_location("hermes_google_api", GOOGLE_API)
    if not spec or not spec.loader:
        raise RuntimeError(f"Cannot load managed Google API client: {GOOGLE_API}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def flatten_concepts(data: dict) -> list[dict]:
    return [
        concept
        for main_topic in data["main_topics"]
        for subtopic in main_topic["subtopics"]
        for concept in subtopic["concepts"]
    ]


def main() -> None:
    data = json.loads(TAXONOMY_PATH.read_text())
    if data["status"] != "confirmed-taxonomy-ready-for-ledger-seeding":
        raise RuntimeError("The KSAP taxonomy is not confirmed and ready for ledger seeding.")
    concepts = flatten_concepts(data)
    if len(concepts) != data["counts"]["concepts"]:
        raise RuntimeError("Taxonomy concept count does not match flattened content.")

    google_api = load_google_api()
    service = google_api.build_service("sheets", "v4")
    spreadsheet = service.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    existing = {sheet["properties"]["title"] for sheet in spreadsheet["sheets"]}
    required = ["Concepts", "Attempts", "Cards", "GuidelineUpdates"]
    missing = [name for name in required if name not in existing]
    if missing:
        service.spreadsheets().batchUpdate(
            spreadsheetId=SHEET_ID,
            body={"requests": [{"addSheet": {"properties": {"title": name}}} for name in missing]},
        ).execute()

    concepts_header = [
        "concept_id", "main_topic", "subtopic", "concept_name", "source_type",
        "source_file_id", "source_title", "priority", "status", "first_delivered_at",
        "last_debrief_at", "next_due_at", "successful_recalls", "notes", "source_locator",
    ]
    concepts_rows = [concepts_header] + [
        [
            c["id"], c["primary_main_topic_id"], c["primary_subtopic_id"], c["name"],
            c["source_type"], "", "KSAP taxonomy in SCE tracker", c["priority"], c["status"],
            "", "", "", 0, "", c["source_locator"],
        ]
        for c in concepts
    ]
    headers = {
        "Attempts": [
            "attempt_id", "concept_id", "event_type", "telegram_topic", "telegram_message_id",
            "posted_at", "answered_at", "score_or_confidence", "outcome", "brief_feedback",
        ],
        "Cards": [
            "card_id", "concept_id", "card_type", "prompt", "accepted_answer", "source_citation",
            "created_from_attempt_id", "last_rating", "next_due_at", "lapse_count",
        ],
        "GuidelineUpdates": [
            "source", "title", "publication_or_update_date", "official_url_or_doi", "change_summary",
            "practical_implication", "exam_label", "related_concept_ids", "checked_at",
        ],
    }

    values = service.spreadsheets().values()
    values.update(
        spreadsheetId=SHEET_ID, range="Concepts!A1:O365", valueInputOption="RAW", body={"values": concepts_rows}
    ).execute()
    for name, header in headers.items():
        values.update(
            spreadsheetId=SHEET_ID, range=f"{name}!A1", valueInputOption="RAW", body={"values": [header]}
        ).execute()

    spreadsheet = service.spreadsheets().get(spreadsheetId=SHEET_ID).execute()
    sheet_ids = {sheet["properties"]["title"]: sheet["properties"]["sheetId"] for sheet in spreadsheet["sheets"]}
    formatting = []
    for name in required:
        formatting.append({
            "repeatCell": {
                "range": {"sheetId": sheet_ids[name], "startRowIndex": 0, "endRowIndex": 1},
                "cell": {"userEnteredFormat": {"textFormat": {"bold": True}, "backgroundColor": {"red": 0.85, "green": 0.91, "blue": 0.85}}},
                "fields": "userEnteredFormat(textFormat,backgroundColor)",
            }
        })
        formatting.append({"updateSheetProperties": {"properties": {"sheetId": sheet_ids[name], "gridProperties": {"frozenRowCount": 1}}, "fields": "gridProperties.frozenRowCount"}})
    service.spreadsheets().batchUpdate(spreadsheetId=SHEET_ID, body={"requests": formatting}).execute()

    config = {
        "schema_version": "1.0.0-draft",
        "spreadsheet_id": SHEET_ID,
        "spreadsheet_url": spreadsheet["spreadsheetUrl"],
        "title": spreadsheet["properties"]["title"],
        "tabs": required,
        "canonical_roles": {
            "qbank_progress_errors_overview": "existing Firebase SCE tracker",
            "concept_coverage_recall": "Nephrology Coverage Ledger",
        },
        "taxonomy_source": "curriculum/ksap-concepts-v1.json",
        "seeded_concepts": len(concepts),
    }
    CONFIG_PATH.write_text(json.dumps(config, indent=2) + "\n")
    print(json.dumps({"status": "seeded", **config}, indent=2))


if __name__ == "__main__":
    main()
