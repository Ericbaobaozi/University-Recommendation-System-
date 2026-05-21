
from recommender.db_utils import get_all_universities, ensure_db_and_load_csv, DB_PATH
from recommender.algorithm import calculate_match
import os

print(f"DB Path: {DB_PATH}")
if DB_PATH.exists():
    print("DB file exists.")
    print(f"DB size: {os.path.getsize(DB_PATH)} bytes")
else:
    print("DB file does NOT exist.")

try:
    ensure_db_and_load_csv()
    unis = get_all_universities()
    print(f"Total universities found: {len(unis)}")
    
    # Mock user profile
    user_profile = {
        'score': 85.0, # normalized
        'budget': 50000.0,
        'interests': ['Computer Science'],
        'countries': ['Canada']
    }
    weights = {'grade': 0.4, 'budget': 0.3, 'interest': 0.2, 'country': 0.1}
    
    results = [calculate_match(user_profile, u, weights) for u in unis]
    print(f"Total results calculated: {len(results)}")
    
    results.sort(key=lambda x: x['match_score'], reverse=True)
    top_results = results[:10]
    
    for r in top_results:
        print(f"Match: {r['name']} - Score: {r['match_score']}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
