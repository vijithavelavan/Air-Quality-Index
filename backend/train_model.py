"""
train_model.py
Trains Random Forest Regressor on Air Quality Data.
Supports Kaggle India dataset or auto-generates representative synthetic dataset if absent.
Calculates MAE, RMSE, R2, saves model artifacts, feature importances, and evaluation metrics.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
for p in (PARENT_DIR, CURRENT_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.preprocessing import clean_air_quality_data, prepare_training_data, REQUIRED_FEATURES
    from backend.cpcb_aqi import calculate_official_cpcb_aqi
except ImportError:
    from preprocessing import clean_air_quality_data, prepare_training_data, REQUIRED_FEATURES
    from cpcb_aqi import calculate_official_cpcb_aqi

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

def create_synthetic_testing_dataset(filepath: str, n_samples: int = 1500) -> pd.DataFrame:
    """
    Creates a realistic synthetic Indian urban air quality dataset clearly labeled for software testing.
    Used as fallback when Kaggle dataset has not been placed in data/ yet.
    """
    np.random.seed(42)
    dates = pd.date_range(start='2021-01-01', periods=n_samples, freq='D')
    cities = np.random.choice(['Delhi', 'Bengaluru', 'Mumbai', 'Kolkata', 'Hyderabad', 'Chennai'], size=n_samples)
    
    # Base seasonal effect (higher pollution in winter Nov-Feb)
    day_of_year = dates.dayofyear
    seasonal_factor = 1.0 + 0.6 * np.cos(2 * np.pi * (day_of_year - 15) / 365)
    
    pm25 = np.clip(np.random.gamma(shape=3.0, scale=20.0, size=n_samples) * seasonal_factor, 5.0, 480.0)
    pm10 = np.clip(pm25 * np.random.uniform(1.4, 2.2, size=n_samples) + np.random.normal(0, 10, n_samples), 10.0, 600.0)
    no2 = np.clip(np.random.gamma(shape=2.5, scale=12.0, size=n_samples) * seasonal_factor, 2.0, 220.0)
    so2 = np.clip(np.random.gamma(shape=2.0, scale=6.0, size=n_samples), 1.0, 150.0)
    co = np.clip(np.random.gamma(shape=1.8, scale=0.8, size=n_samples), 0.1, 15.0)
    o3 = np.clip(np.random.gamma(shape=3.0, scale=10.0, size=n_samples), 3.0, 180.0)
    nh3 = np.clip(np.random.gamma(shape=2.0, scale=10.0, size=n_samples), 1.0, 250.0)
    
    df = pd.DataFrame({
        'Date': dates.strftime('%Y-%m-%d'),
        'City': cities,
        'PM2.5': np.round(pm25, 2),
        'PM10': np.round(pm10, 2),
        'NO2': np.round(no2, 2),
        'SO2': np.round(so2, 2),
        'CO': np.round(co, 2),
        'O3': np.round(o3, 2),
        'NH3': np.round(nh3, 2),
        'Is_Synthetic': True
    })
    
    # Calculate initial AQI using sub-index principles
    aqis = []
    for _, row in df.iterrows():
        p_dict = {p: row[p] for p in REQUIRED_FEATURES}
        res = calculate_official_cpcb_aqi(p_dict)
        aqis.append(res.get('aqi', 100))
    df['AQI'] = aqis
    
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    df.to_csv(filepath, index=False)
    print(f"Created fallback synthetic dataset at {filepath} ({n_samples} records).")
    return df


def load_dataset() -> Tuple[pd.DataFrame, bool]:
    """
    Checks for available datasets in order of priority:
    1. data/city_day.csv (Kaggle India Air Quality dataset)
    2. data/air_quality.csv
    3. Fallback: data/synthetic_city_day.csv
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    kaggle_path = os.path.join(DATA_DIR, "city_day.csv")
    general_path = os.path.join(DATA_DIR, "air_quality.csv")
    synth_path = os.path.join(DATA_DIR, "synthetic_city_day.csv")
    
    if os.path.exists(kaggle_path):
        print(f"Loading Kaggle dataset from {kaggle_path}")
        return pd.read_csv(kaggle_path), False
    elif os.path.exists(general_path):
        print(f"Loading dataset from {general_path}")
        return pd.read_csv(general_path), False
    else:
        print("Real dataset not found in data/. Generating software-testing synthetic dataset...")
        df = create_synthetic_testing_dataset(synth_path)
        return df, True


def train_aqi_regressor():
    """Executes full training pipeline, computes metrics, and saves model."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    df, is_synthetic = load_dataset()
    X, y, medians = prepare_training_data(df)
    
    print(f"Prepared dataset with {len(X)} samples across {len(REQUIRED_FEATURES)} features.")
    
    # Train / test split (80/20) with reproducible seed
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42
    )
    
    # Random Forest Regressor
    model = RandomForestRegressor(
        n_estimators=120,
        max_depth=16,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1
    )
    
    model.fit(X_train, y_train)
    
    # Predictions
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)
    
    # Evaluation Metrics
    mae = mean_absolute_error(y_test, y_pred_test)
    mse = mean_squared_error(y_test, y_pred_test)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred_test)
    
    train_mae = mean_absolute_error(y_train, y_pred_train)
    train_r2 = r2_score(y_train, y_pred_train)
    
    # Feature Importances
    importances = dict(zip(REQUIRED_FEATURES, [round(float(v), 4) for v in model.feature_importances_]))
    
    # Sample actual vs predicted points for frontend visualization
    comparison_samples = []
    test_indices = np.random.choice(len(y_test), size=min(60, len(y_test)), replace=False)
    y_test_arr = np.array(y_test)
    for idx in test_indices:
        comparison_samples.append({
            "sample_id": int(idx),
            "actual": round(float(y_test_arr[idx]), 1),
            "predicted": round(float(y_pred_test[idx]), 1),
            "error": round(float(abs(y_test_arr[idx] - y_pred_test[idx])), 1)
        })
    comparison_samples.sort(key=lambda x: x["actual"])

    # Artifact bundle
    model_path = os.path.join(MODELS_DIR, "random_forest_aqi.joblib")
    metrics_path = os.path.join(MODELS_DIR, "model_metrics.json")
    medians_path = os.path.join(MODELS_DIR, "feature_medians.json")
    
    joblib.dump(model, model_path)
    
    with open(medians_path, 'w') as f:
        json.dump(medians, f, indent=2)
        
    metrics = {
        "model_name": "Random Forest Regressor",
        "n_estimators": 120,
        "test_mae": round(float(mae), 3),
        "test_rmse": round(float(rmse), 3),
        "test_r2": round(float(r2), 4),
        "train_mae": round(float(train_mae), 3),
        "train_r2": round(float(train_r2), 4),
        "total_samples": int(len(X)),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "features": REQUIRED_FEATURES,
        "feature_importances": importances,
        "actual_vs_predicted": comparison_samples,
        "is_synthetic_dataset": is_synthetic,
        "dataset_note": "Trained on Synthetic Software-Testing Data" if is_synthetic else "Trained on Kaggle India Air Quality Dataset"
    }
    
    with open(metrics_path, 'w') as f:
        json.dump(metrics, f, indent=2)
        
    print(f"Model successfully saved to {model_path}")
    print(f"Metrics: MAE={mae:.2f}, RMSE={rmse:.2f}, R2={r2:.4f}")
    return metrics

if __name__ == "__main__":
    train_aqi_regressor()
