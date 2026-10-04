"""
Gives every API error the same shape, so the frontend handles all of them one way:

    {"detail": "Human readable message", "code": "optional_code", "errors": {"field": ["msg"]}}
"""

from rest_framework.views import exception_handler

GENERIC_VALIDATION_MESSAGE = "Please correct the errors below."


def _first_message(value):
    while isinstance(value, (list, tuple)) and value:
        value = value[0]
    if isinstance(value, dict):
        return _first_message(next(iter(value.values()), GENERIC_VALIDATION_MESSAGE))
    return str(value) if value else GENERIC_VALIDATION_MESSAGE


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is None:
        # Unhandled server error: let Django return a 500 and log it.
        return None

    data = response.data
    body = {"detail": GENERIC_VALIDATION_MESSAGE, "errors": {}}

    if isinstance(data, list):
        body["errors"] = {"non_field_errors": data}
        body["detail"] = _first_message(data)
    elif isinstance(data, dict):
        if "detail" in data:
            body["detail"] = str(data["detail"])
            if "code" in data:
                body["code"] = str(data["code"])
            body["errors"] = {
                key: value for key, value in data.items() if key not in ("detail", "code", "messages")
            }
        else:
            body["errors"] = data
            if "non_field_errors" in data:
                body["detail"] = _first_message(data["non_field_errors"])

    response.data = body
    return response
