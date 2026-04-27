import json


def extract_json(text: str):
    """
    Extract the first valid JSON object or array from a given string.

    This function scans through the input text and attempts to decode
    a JSON object (`{...}`) or array (`[...]`) starting from each character.
    It returns the first successfully decoded JSON structure.

    Args:
        text (str): The input string that may contain embedded JSON.

    Returns:
        dict | list | None:
            - A Python dictionary if a JSON object is found.
            - A Python list if a JSON array is found.
            - None if no valid JSON structure is detected.

    Notes:
        - Uses `json.JSONDecoder().raw_decode` for partial parsing.
        - Stops at the first valid JSON match.
        - Ignores malformed JSON segments and continues searching.
    """
    decoder = json.JSONDecoder()
    i = 0
    while i < len(text):
        if text[i] in ["{", "["]:
            try:
                obj, _ = decoder.raw_decode(text[i:])
                return obj
            except json.JSONDecodeError:
                pass
        i += 1
    return None
