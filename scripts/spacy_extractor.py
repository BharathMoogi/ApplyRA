import sys
import json

try:
    import spacy
    try:
        nlp = spacy.load('en_core_web_sm')
    except Exception:
        try:
            # Fallback if full model not downloaded
            nlp = spacy.blank('en')
        except Exception:
            nlp = None
except Exception:
    nlp = None

def extract_entities(text: str):
    if not nlp:
        return {'persons': [], 'orgs': [], 'dates': []}
    try:
        doc = nlp(text)
        persons = set()
        orgs = set()
        dates = set()
        for ent in getattr(doc, 'ents', []):
            if ent.label_ == 'PERSON':
                persons.add(ent.text.strip())
            elif ent.label_ == 'ORG':
                orgs.add(ent.text.strip())
            elif ent.label_ == 'DATE':
                dates.add(ent.text.strip())
        return {
            'persons': [p for p in persons if len(p) > 2],
            'orgs': [o for o in orgs if len(o) > 2],
            'dates': [d for d in dates if len(d) > 2]
        }
    except Exception:
        return {'persons': [], 'orgs': [], 'dates': []}

if __name__ == '__main__':
    try:
        input_text = sys.stdin.read()
        result = extract_entities(input_text)
        print(json.dumps(result))
    except Exception:
        print(json.dumps({'persons': [], 'orgs': [], 'dates': []}))
