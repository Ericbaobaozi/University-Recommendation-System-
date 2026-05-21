from flask import Flask, render_template, request, send_file, make_response
from recommender.db_utils import ensure_db_and_load_csv, get_all_universities
from recommender.algorithm import convert_score, calculate_match
import io, time, csv, logging, os

app = Flask(__name__)

# Ensure DB exists and CSV imported
ensure_db_and_load_csv()

# basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/results', methods=['POST'])
def results():
    score_type = request.form.get('score_type','OSSD')
    raw_score_raw = request.form.get('raw_score','')
    # validate raw score server-side depending on score type
    try:
        raw_score_val = float(raw_score_raw)
    except (ValueError, TypeError):
        err = 'Please enter a valid numeric score.'
        return render_template('index.html', error=err,
                               w_grade=request.form.get('w_grade'), w_budget=request.form.get('w_budget'),
                               w_interest=request.form.get('w_interest'), w_country=request.form.get('w_country'),
                               interests=request.form.getlist('interests'), countries=request.form.getlist('countries'))
    max_allowed = 45.0 if (score_type or '').strip().upper() == 'IB' else 100.0
    if raw_score_val < 0 or raw_score_val > max_allowed:
        err = f'Score out of range: {score_type} allows 0 to {int(max_allowed)}.'
        return render_template('index.html', error=err,
                               w_grade=request.form.get('w_grade'), w_budget=request.form.get('w_budget'),
                               w_interest=request.form.get('w_interest'), w_country=request.form.get('w_country'),
                               interests=request.form.getlist('interests'), countries=request.form.getlist('countries'))
    # parse budget defensively
    budget_raw = request.form.get('budget') or '0'
    try:
        budget = float(budget_raw)
    except (ValueError, TypeError):
        logger.warning("Invalid budget value received: %r; defaulting to 0.0", budget_raw)
        budget = 0.0
    # support multiple hidden inputs named 'interests'/'countries' or fallback to comma-split
    interests = request.form.getlist('interests') or [s.strip() for s in request.form.get('interests','').split(',') if s.strip()]
    countries = request.form.getlist('countries') or [s.strip() for s in request.form.get('countries','').split(',') if s.strip()]

    # read numeric slider weights (0-100) and validate
    try:
        w_grade = float(request.form.get('w_grade', 40))
        w_budget = float(request.form.get('w_budget', 30))
        w_interest = float(request.form.get('w_interest', 20))
        w_country = float(request.form.get('w_country', 10))
    except (ValueError, TypeError):
        err = 'Invalid weight values: ensure all sliders have numeric values.'
        return render_template('index.html', error=err, w_grade=request.form.get('w_grade'), w_budget=request.form.get('w_budget'), w_interest=request.form.get('w_interest'), w_country=request.form.get('w_country'))

    weights_raw = {'grade': w_grade, 'budget': w_budget, 'interest': w_interest, 'country': w_country}
    total_w = sum(weights_raw.values())
    if total_w <= 0:
        err = 'Sum of weights must be greater than 0.'
        return render_template('index.html', error=err, w_grade=w_grade, w_budget=w_budget, w_interest=w_interest, w_country=w_country)
    # normalize to sum 1.0
    weights = {k: (v / total_w) for k, v in weights_raw.items()}

    try:
        unified = convert_score(raw_score_val, score_type)
        user_profile = {'score': unified, 'budget': budget, 'interests': interests, 'countries': countries}

        unis = get_all_universities()
        results = [calculate_match(user_profile, u, weights) for u in unis]
        results.sort(key=lambda x: x['match_score'], reverse=True)

        # Create CSV text for optional export using csv module (safer escaping)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["name","match_score","admission_rate","tuition","majors","country","source_url"])

        def _safe_cell(val):
            s = '' if val is None else str(val)
            # protect against common CSV injection vectors (cells starting with = + - @)
            if s and s[0] in ('=', '+', '-', '@'):
                s = "'" + s
            return s

        for r in results[:10]:  # CSV exports top 10 only
            writer.writerow([
                _safe_cell(r.get('name')),
                _safe_cell(r.get('match_score')),
                _safe_cell(r.get('admission_rate') or ''),
                _safe_cell(r.get('tuition') or ''),
                _safe_cell(r.get('majors') or ''),
                _safe_cell(r.get('country') or ''),
                _safe_cell(r.get('source_url') or '')
            ])
        csv_text = output.getvalue()
        timestamp = int(time.time())
        return render_template('results.html', results=results, csv_text=csv_text, timestamp=timestamp)
    except Exception:
        logger.exception('Error while processing /results')
        # return a simple error response; templates can be improved to show friendly messages
        return make_response('Internal server error', 500)

@app.route('/export', methods=['POST'])
def export_csv():
    try:
        csv_text = request.form.get('csv_text','') or ''
        buf = io.BytesIO()
        buf.write(csv_text.encode('utf-8', errors='replace'))
        buf.seek(0)
        return send_file(buf, as_attachment=True, download_name='recommendations.csv', mimetype='text/csv')
    except Exception:
        logger.exception('Error while exporting CSV')
        return make_response('Failed to export CSV', 500)

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(debug=debug_mode)
