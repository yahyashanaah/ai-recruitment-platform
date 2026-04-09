from __future__ import annotations

from app.main import create_app


def resolve_schema(openapi: dict, schema: dict) -> dict:
    """Resolve local OpenAPI component references."""
    current = schema
    while "$ref" in current:
        ref = current["$ref"]
        parts = ref.lstrip("#/").split("/")
        resolved = openapi
        for part in parts:
            resolved = resolved[part]
        current = resolved
    return current


def main() -> None:
    app = create_app()
    openapi = app.openapi()

    required_paths = {
        "/health",
        "/api/v1/documents/upload",
        "/api/v1/chat/ask",
        "/api/v1/match-jd",
        "/api/v1/jd/generate",
        "/api/v1/candidates",
        "/api/v1/candidates/{candidate_id}",
        "/api/v1/dashboard/summary",
        "/api/v1/documents/file/{file_name}",
    }
    actual_paths = set(openapi["paths"].keys())
    missing_paths = sorted(required_paths - actual_paths)
    if missing_paths:
        raise AssertionError(f"Missing required API paths: {missing_paths}")

    upload_operation = openapi["paths"]["/api/v1/documents/upload"]["post"]
    upload_schema = resolve_schema(
        openapi,
        upload_operation["requestBody"]["content"]["multipart/form-data"]["schema"],
    )
    files_property = upload_schema["properties"]["files"]
    if files_property.get("type") != "array":
        raise AssertionError("Upload 'files' field must be an array.")

    file_item_schema = resolve_schema(openapi, files_property["items"])
    if file_item_schema.get("format") != "binary":
        raise AssertionError("Upload 'files' items must be binary for Swagger file inputs.")

    chat_operation = openapi["paths"]["/api/v1/chat/ask"]["post"]
    chat_media_types = set(chat_operation["responses"]["200"]["content"].keys())
    if "text/event-stream" not in chat_media_types:
        raise AssertionError("Chat endpoint must expose text/event-stream.")

    print("Backend contract validation passed.")


if __name__ == "__main__":
    main()
