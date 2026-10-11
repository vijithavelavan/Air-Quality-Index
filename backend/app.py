"""
app.py
Production Flask REST API for Air Quality Index (AQI) Machine Learning Prediction & Analytics.
Endpoints:
  GET  /api/health
  POST /api/predict
  GET  /api/history
  GET  /api/metrics
  POST /api/upload
  GET  /api/forecast
  GET  /api/dataset-summary
"""

import os
import io
import json
import pandas as pd
from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from werkzeug.utils import secure_filename

from backend.predict import predict_aqi, get_prediction_history, load_model_and_artifacts
from backend.forecast import train_and_forecast_city
from backend.preprocessing import inspect_dataset_summary, REQUIRED_FEATURES
from backend.train_model import train_aqi_regressor

app = Flask(__name__)
# Enable CORS for frontend Vite development server
CORS(app, resources={r"/api/*": {"origins": "*"}})

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'csv'}

def allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET'])
def root():
    """Redirect to the React frontend or provide API index."""
    if request.accept_mimetypes.accept_html:
        return redirect("http://localhost:3000/", code=302)
    return jsonify({
        "message": "AQI ML Prediction API is running",
        "frontend_url": "http://localhost:3000",
        "endpoints": {
            "health": "/api/health",
            "predict": "/api/predict",
            "forecast": "/api/forecast?city=Delhi",
            "metrics": "/api/metrics",
            "history": "/api/history",
            "dataset_summary": "/api/dataset-summary"
        }
    }), 200

@app.errorhandler(404)
def not_found(e):
    """Handle 404 cleanly so users are redirected or guided properly."""
    if request.accept_mimetypes.accept_html:
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <title>AQI System - Navigation</title>
            <meta http-equiv="refresh" content="2; url=http://localhost:3000/">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; padding: 2rem; border-radius: 12px; border: 1px solid #334155; max-width: 480px; text-align: center; }
                h1 { color: #38bdf8; margin-top: 0; font-size: 1.5rem; }
                p { color: #94a3b8; line-height: 1.6; }
                a { display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; background: #0284c7; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; }
                a:hover { background: #0369a1; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>Air Quality Index Dashboard</h1>
                <p>The web application dashboard is running at <strong>http://localhost:3000</strong>.</p>
                <p>Redirecting you now...</p>
                <a href="http://localhost:3000">Open Dashboard (localhost:3000)</a>
            </div>
        </body>
        </html>
        """, 200
    return jsonify({"error": "Endpoint not found", "frontend_url": "http://localhost:3000"}), 404


@app.route('/api/health', methods=['GET'])
def health():
    """Health status check and model readiness."""
    model_loaded = False
    metrics = {}
    try:
        model, metrics, _ = load_model_and_artifacts()
        model_loaded = model is not None
    except Exception as e:
        model_loaded = False

    return jsonify({
        "status": "healthy",
        "service": "AQI Machine Learning Prediction Engine",
        "model_loaded": model_loaded,
        "model_type": "Random Forest Regressor",
        "supported_pollutants": REQUIRED_FEATURES,
        "is_synthetic_dataset": metrics.get("is_synthetic_dataset", False),
        "dataset_note": metrics.get("dataset_note", "Standard Pipeline")
    }), 200


@app.route('/api/predict', methods=['POST'])
def predict():
    """Predicts AQI given pollutant concentrations."""
    data = request.get_json()
    if not data or not isinstance(data, dict):
        return jsonify({
            "error": "Invalid request body. Expected a JSON object with pollutant values."
        }), 400

    result = predict_aqi(data)
    if not result.get("success"):
        return jsonify({
            "error": "Input validation failed",
            "details": result.get("errors", ["Invalid values provided"])
        }), 422

    return jsonify(result), 200


@app.route('/api/history', methods=['GET'])
def history():
    """Retrieves user prediction query logs from SQLite."""
    try:
        limit = int(request.args.get('limit', 30))
        limit = max(1, min(limit, 200))
        records = get_prediction_history(limit)
        return jsonify({
            "success": True,
            "count": len(records),
            "history": records
        }), 200
    except Exception as e:
        return jsonify({
            "error": "Failed to fetch prediction history",
            "message": str(e)
        }), 500


@app.route('/api/metrics', methods=['GET'])
def metrics():
    """Retrieves trained Random Forest evaluation metrics and feature importances."""
    try:
        _, m_dict, _ = load_model_and_artifacts()
        return jsonify({
            "success": True,
            "metrics": m_dict
        }), 200
    except Exception as e:
        return jsonify({
            "error": "Metrics unavailable",
            "message": str(e)
        }), 500


@app.route('/api/forecast', methods=['GET'])
def forecast():
    """Returns chronological multi-day AQI forecast for a specific city."""
    city = request.args.get('city', 'Delhi').strip()
    days = int(request.args.get('days', 7))
    days = max(1, min(days, 14))

    result = train_and_forecast_city(city=city, days_ahead=days)
    if not result.get("success"):
        return jsonify({
            "success": False,
            "error": result.get("error", "Forecasting failed")
        }), 400

    return jsonify(result), 200


@app.route('/api/dataset-summary', methods=['GET'])
def dataset_summary():
    """Returns preview and statistics of the currently loaded dataset."""
    kaggle_path = os.path.join(UPLOAD_FOLDER, "city_day.csv")
    general_path = os.path.join(UPLOAD_FOLDER, "air_quality.csv")
    synth_path = os.path.join(UPLOAD_FOLDER, "synthetic_city_day.csv")

    active_path = None
    source_type = "none"

    if os.path.exists(kaggle_path):
        active_path = kaggle_path
        source_type = "Kaggle India Air Quality Dataset (city_day.csv)"
    elif os.path.exists(general_path):
        active_path = general_path
        source_type = "Uploaded User Air Quality Dataset"
    elif os.path.exists(synth_path):
        active_path = synth_path
        source_type = "Software-Testing Synthetic Dataset"

    if not active_path:
        return jsonify({
            "success": False,
            "message": "No dataset currently found. Please upload a CSV file."
        }), 404

    try:
        df = pd.read_csv(active_path)
        summary = inspect_dataset_summary(df)
        summary["dataset_source"] = source_type
        summary["file_name"] = os.path.basename(active_path)
        return jsonify({
            "success": True,
            "summary": summary
        }), 200
    except Exception as e:
        return jsonify({
            "error": "Failed to analyze dataset",
            "message": str(e)
        }), 500


@app.route('/api/upload', methods=['POST'])
def upload_dataset():
    """Uploads, validates, and optionally triggers retraining on a new CSV dataset."""
    if 'file' not in request.files:
        return jsonify({"error": "No file field found in multipart form"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "Only CSV files (.csv) are accepted"}), 400

    try:
        content = file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        # Validation checks
        summary = inspect_dataset_summary(df)
        
        # Check required columns
        present_cols = [c.lower() for c in df.columns]
        essential_found = sum(1 for req in REQUIRED_FEATURES if req.lower() in present_cols)
        
        if essential_found < 2:
            return jsonify({
                "error": "Dataset validation rejected",
                "message": f"Dataset must contain at least 2 recognised pollutant columns from: {', '.join(REQUIRED_FEATURES)}",
                "found_columns": list(df.columns)
            }), 422

        # Save to data directory as user dataset without overwriting city_day.csv unless specified
        dest_filename = "air_quality.csv"
        dest_path = os.path.join(UPLOAD_FOLDER, dest_filename)
        with open(dest_path, 'wb') as f:
            f.write(content)

        # Trigger model retraining automatically on uploaded data
        new_metrics = train_aqi_regressor()

        return jsonify({
            "success": True,
            "message": "Dataset uploaded and model retrained successfully!",
            "summary": summary,
            "retrained_metrics": new_metrics
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Failed to process uploaded file",
            "message": str(e)
        }), 500


if __name__ == '__main__':
    # Initialize SQLite and model upon launch
    from backend.predict import init_db
    init_db()
    load_model_and_artifacts()
    app.run(host='127.0.0.1', port=5000, debug=False)
