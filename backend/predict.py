"""
predict.py
Loads trained Random Forest model and performs inference for input pollutants.
Combines machine learning regression with official Indian CPCB sub-index calculations.
Manages SQLite prediction history logging.
"""

import os
import json
import sqlite3
import joblib
import pandas as pd
from datetime import datetime
from typing import Dict, Any, Optional
from backend.cpcb_aqi import calculate_official_cpcb_aqi, get_category_info
from backend.preprocessing import REQUIRED_FEATURES

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "prediction_history.sqlite")

def init_db():
    """Initializes SQLite table for prediction history."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            pm25 REAL,
            pm10 REAL,
            no2 REAL,
            so2 REAL,
            co REAL,
            o3 REAL,
            nh3 REAL,
            predicted_aqi REAL NOT NULL,
            cpcb_aqi REAL,
            category TEXT NOT NULL,
            driving_pollutant TEXT
        )
    """)
    conn.commit()
    conn.close()


def load_model_and_artifacts():
    """Loads trained Random Forest model, metrics, and feature medians."""
    model_path = os.path.join(MODELS_DIR, "random_forest_aqi.joblib")
    metrics_path = os.path.join(MODELS_DIR, "model_metrics.json")
    medians_path = os.path.join(MODELS_DIR, "feature_medians.json")
    
    if not os.path.exists(model_path):
        # Auto-train if not yet trained
        from backend.train_model import train_aqi_regressor
        train_aqi_regressor()
        
    model = joblib.load(model_path)
    
    metrics = {}
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)
            
    medians = {}
    if os.path.exists(medians_path):
        with open(medians_path, 'r') as f:
            medians = json.load(f)
            
    return model, metrics, medians


def predict_aqi(pollutant_inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validates pollutant inputs, performs model inference, calculates official CPCB benchmark,
    records prediction into database, and returns structured result.
    """
    model, metrics, medians = load_model_and_artifacts()
    
    # Validation & Cleaning
    processed_inputs = {}
    validation_errors = []
    
    for pol in REQUIRED_FEATURES:
        val = pollutant_inputs.get(pol)
        if val is None or val == "":
            # Fill with training median
            processed_inputs[pol] = medians.get(pol, 25.0)
        else:
            try:
                num = float(val)
                if num < 0:
                    validation_errors.append(f"{pol} cannot be negative (received {num}).")
                elif num > 2500:
                    validation_errors.append(f"{pol} exceeds physically plausible limits (received {num}).")
                else:
                    processed_inputs[pol] = round(num, 2)
            except ValueError:
                validation_errors.append(f"{pol} must be a valid number.")

    if validation_errors:
        return {
            "success": False,
            "errors": validation_errors
        }

    # Model inference
    df_input = pd.DataFrame([processed_inputs])[REQUIRED_FEATURES]
    pred_val = float(model.predict(df_input)[0])
    pred_aqi = round(max(0.0, pred_val), 1)
    
    # Official CPCB calculation for comparison
    cpcb_res = calculate_official_cpcb_aqi(processed_inputs)
    
    # Category evaluation
    cat_info = get_category_info(pred_aqi)
    
    # Persist in history
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    try:
        init_db()
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO predictions (
                timestamp, pm25, pm10, no2, so2, co, o3, nh3, 
                predicted_aqi, cpcb_aqi, category, driving_pollutant
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            timestamp,
            processed_inputs.get('PM2.5'),
            processed_inputs.get('PM10'),
            processed_inputs.get('NO2'),
            processed_inputs.get('SO2'),
            processed_inputs.get('CO'),
            processed_inputs.get('O3'),
            processed_inputs.get('NH3'),
            pred_aqi,
            cpcb_res.get('aqi'),
            cat_info['category'],
            cpcb_res.get('driving_pollutant')
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving to history db: {e}")

    return {
        "success": True,
        "predicted_aqi": pred_aqi,
        "category": cat_info["category"],
        "color": cat_info["color"],
        "health_risk": cat_info["health_risk"],
        "precautions": cat_info["precautions"],
        "cpcb_official": {
            "calculated_aqi": cpcb_res.get("aqi"),
            "is_valid_standard": cpcb_res.get("official_valid"),
            "driving_pollutant": cpcb_res.get("driving_pollutant"),
            "sub_indices": cpcb_res.get("sub_indices")
        },
        "inputs_used": processed_inputs,
        "timestamp": timestamp
    }


def get_prediction_history(limit: int = 50) -> list:
    """Retrieves recent prediction records from SQLite."""
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM predictions ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    history = [dict(row) for row in rows]
    conn.close()
    return history
