from typing import Dict, Any, List
import difflib
from .models import University

def convert_score(raw_score, score_type: str) -> float:
    try:
        val = float(raw_score)
    except:
        return 0.0
    if score_type and score_type.strip().upper() == 'IB':
        return (val / 45.0) * 100.0
    return val

def normalize_grade_match(user_score: float, uni_min: float) -> float:
    if uni_min is None:
        return 70.0
    diff = user_score - uni_min
    if diff >= 0:
        return min(80.0 + diff * 0.5, 100.0)
    else:
        ratio = max(user_score / max(uni_min, 1.0), 0.0)
        return max(20.0, ratio * 80.0)

def budget_match(user_budget: float, uni_tuition: float) -> float:
    if not uni_tuition or uni_tuition <= 0:
        return 70.0
    ratio = user_budget / uni_tuition
    if ratio >= 1.0:
        return 100.0
    return max(30.0, ratio * 100.0)

def interest_match(user_interests: List[str], uni_majors: List[str]) -> float:
    if not uni_majors:
        return 50.0
    
    # Fuzzy matching logic
    match_found = False
    for ui in user_interests:
        ui_clean = ui.strip().lower()
        if not ui_clean:
            continue
        # Direct match check first
        if any(ui_clean in m.lower() for m in uni_majors):
            match_found = True
            break
        # Fuzzy check
        for major in uni_majors:
            # SequenceMatcher ratio > 0.6 implies decent similarity
            if difflib.SequenceMatcher(None, ui_clean, major.lower()).ratio() > 0.6:
                match_found = True
                break
        if match_found:
            break

    return 100.0 if match_found else 50.0

def country_match(user_countries: List[str], uni_country: str) -> float:
    if not uni_country:
        return 70.0
    if uni_country in user_countries:
        return 100.0
    return 70.0

def classify_university(user_score: float, uni_min: float) -> str:
    """Classifies the university as Reach, Target, or Safety."""
    if uni_min is None:
        return "Target" # Default if no score requirement
    
    diff = user_score - uni_min
    if diff >= 5.0:
        return "Safety"
    elif diff >= -2.0:
        return "Target"
    else:
        return "Reach"

def calculate_match(user_profile: Dict[str,Any], uni: University, weights: Dict[str,float]) -> Dict[str,Any]:
    total_w = sum(weights.values()) if weights else 1.0
    if total_w == 0:
        total_w = 1.0
    norm_w = {k: v/total_w for k,v in weights.items()}

    user_score = user_profile.get('score', 0.0)
    # Determine which min score to use based on profile, but here we normalized user score to 0-100 already.
    # We should normalize university score requirements to 0-100 for comparison if not already?
    # Actually, the user_score passed here is 'unified' (0-100).
    # The University mins are in their respective scales. We need to convert them or the user needs to provide raw.
    # WAIT: convert_score in app.py returns 0-100. 
    # The database has min_score_ib (45 max) and ossd (100 max).
    # We need to map the uni min score to the Unified scale (0-100) to compare fairly.
    
    # Simple heuristic: if IB is available, Convert IB to 100 scale. Else use OSSD.
    uni_min_unified = 0.0
    if uni.min_score_ib:
        uni_min_unified = (uni.min_score_ib / 45.0) * 100.0
    elif uni.min_score_ossd:
        uni_min_unified = uni.min_score_ossd
    else:
        uni_min_unified = 0.0 # Unknown

    grade = normalize_grade_match(user_score, uni_min_unified if uni_min_unified > 0 else None)
    bud = budget_match(user_profile.get('budget', 0.0), uni.tuition or 0.0)
    intr = interest_match(user_profile.get('interests', []), uni.get_majors_list())
    cnt = country_match(user_profile.get('countries', []), uni.country or '')

    total = (norm_w.get('grade',0)*grade + norm_w.get('budget',0)*bud +
             norm_w.get('interest',0)*intr + norm_w.get('country',0)*cnt)
    match_score = round(total, 2)

    classification = classify_university(user_score, uni_min_unified)

    return {
        'name': uni.name,
        'id': uni.id,
        'match_score': match_score,
        'components': {'grade': grade, 'budget': bud, 'interest': intr, 'country': cnt},
        'admission_rate': uni.admission_rate,
        'tuition': uni.tuition,
        'majors': uni.majors,
        'country': uni.country,
        'source_url': uni.source_url,
        'classification': classification
    }
