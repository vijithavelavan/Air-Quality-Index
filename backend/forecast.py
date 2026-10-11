"""
forecast.py
Historical date-based AQI time-series forecasting pipeline.
Avoids lookahead bias with chronological time-based train/test splits.
Features: rolling averages, lag features (t-1, t-2, t-3, t-7), seasonal signals.
Forecasts next 1 to 7 days for a selected city.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
for p in (PARENT_DIR, CURRENT_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.cpcb_aqi import get_category_info
    from backend.preprocessing import clean_air_quality_data
except ImportError:
    from cpcb_aqi import get_category_info
    from preprocessing import clean_air_quality_data

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")

def prepare_city_time_series(df: pd.DataFrame, city: str) -> Optional[pd.DataFrame]:
    """Prepares and resamples daily chronological AQI series for a given city."""
    if 'City' not in df.columns or 'Date' not in df.columns or 'AQI' not in df.columns:
        return None
        
    city_df = df[df['City'].str.strip().str.lower() == city.strip().lower()].copy()
    if len(city_df) < 30:
        return None
        
    city_df['Date'] = pd.to_datetime(city_df['Date'], errors='coerce')
    city_df = city_df.dropna(subset=['Date', 'AQI'])
    city_df = city_df.sort_values('Date')
    
    # Resample to complete daily series, interpolate short gaps (up to 3 days)
    city_df = city_df.set_index('Date')
    daily_series = city_df[['AQI']].resample('D').mean()
    daily_series['AQI'] = daily_series['AQI'].interpolate(method='time', limit=3)
    daily_series = daily_series.dropna()
    
    if len(daily_series) < 30:
        return None
        
    # Feature Engineering (Lags and rolling statistics)
    df_feat = daily_series.copy()
    df_feat['lag_1'] = df_feat['AQI'].shift(1)
    df_feat['lag_2'] = df_feat['AQI'].shift(2)
    df_feat['lag_3'] = df_feat['AQI'].shift(3)
    df_feat['lag_7'] = df_feat['AQI'].shift(7)
    df_feat['rolling_mean_7'] = df_feat['AQI'].shift(1).rolling(window=7).mean()
    df_feat['rolling_std_7'] = df_feat['AQI'].shift(1).rolling(window=7).std().fillna(0)
    
    # Calendar features
    df_feat['dayofweek'] = df_feat.index.dayofweek
    df_feat['month'] = df_feat.index.month
    df_feat['dayofyear'] = df_feat.index.dayofyear
    df_feat['sin_day'] = np.sin(2 * np.pi * df_feat['dayofyear'] / 365.25)
    df_feat['cos_day'] = np.cos(2 * np.pi * df_feat['dayofyear'] / 365.25)
    
    # Drop rows with NaN from lags
    df_feat = df_feat.dropna()
    return df_feat


def train_and_forecast_city(city: str, days_ahead: int = 7) -> Dict[str, Any]:
    """
    Chronological forecasting without data leakage.
    Trains on past observations, evaluates on held-out recent horizon, and forecasts next 7 days.
    """
    kaggle_path = os.path.join(DATA_DIR, "city_day.csv")
    synth_path = os.path.join(DATA_DIR, "synthetic_city_day.csv")
    general_path = os.path.join(DATA_DIR, "air_quality.csv")
    
    if os.path.exists(kaggle_path):
        df = pd.read_csv(kaggle_path)
    elif os.path.exists(general_path):
        df = pd.read_csv(general_path)
    elif os.path.exists(synth_path):
        df = pd.read_csv(synth_path)
    else:
        return {
            "success": False,
            "error": "No dataset found. Please upload or place city_day.csv in the data directory."
        }
        
    df = clean_air_quality_data(df)
    ts_data = prepare_city_time_series(df, city)
    if ts_data is None or len(ts_data) < 30:
        return {
            "success": False,
            "error": f"Insufficient historical records for '{city}' (minimum 30 continuous daily observations required)."
        }
        
    feature_cols = [
        'lag_1', 'lag_2', 'lag_3', 'lag_7',
        'rolling_mean_7', 'rolling_std_7',
        'dayofweek', 'month', 'sin_day', 'cos_day'
    ]
    
    # Strictly chronological split (last 14 days reserved for holdout validation)
    holdout_size = min(14, int(len(ts_data) * 0.15))
    train_data = ts_data.iloc[:-holdout_size]
    test_data = ts_data.iloc[-holdout_size:]
    
    X_train = train_data[feature_cols]
    y_train = train_data['AQI']
    X_test = test_data[feature_cols]
    y_test = test_data['AQI']
    
    model = RandomForestRegressor(n_estimators=80, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    # Test metrics
    test_preds = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, test_preds))
    rmse = float(np.sqrt(mean_squared_error(y_test, test_preds)))
    
    # Retrain on full dataset up to last known day for forward forecasting
    full_model = RandomForestRegressor(n_estimators=80, max_depth=10, random_state=42, n_jobs=-1)
    full_model.fit(ts_data[feature_cols], ts_data['AQI'])
    
    # Multi-step recursive forecasting for 7 days
    last_known_date = ts_data.index[-1]
    history_series = list(ts_data['AQI'].values)
    
    forecasts = []
    current_date = last_known_date
    
    for day in range(1, days_ahead + 1):
        target_date = current_date + timedelta(days=day)
        
        # Build features from history
        l1 = history_series[-1]
        l2 = history_series[-2] if len(history_series) >= 2 else l1
        l3 = history_series[-3] if len(history_series) >= 3 else l2
        l7 = history_series[-7] if len(history_series) >= 7 else history_series[0]
        
        r_mean7 = float(np.mean(history_series[-7:]))
        r_std7 = float(np.std(history_series[-7:]))
        
        doy = target_date.timetuple().tm_yday
        sin_d = np.sin(2 * np.pi * doy / 365.25)
        cos_d = np.cos(2 * np.pi * doy / 365.25)
        
        step_feat = pd.DataFrame([{
            'lag_1': l1, 'lag_2': l2, 'lag_3': l3, 'lag_7': l7,
            'rolling_mean_7': r_mean7, 'rolling_std_7': r_std7,
            'dayofweek': target_date.weekday(),
            'month': target_date.month,
            'sin_day': sin_d,
            'cos_day': cos_d
        }])[feature_cols]
        
        pred_aqi = round(float(full_model.predict(step_feat)[0]), 1)
        history_series.append(pred_aqi)
        
        cat_info = get_category_info(pred_aqi)
        
        # Confidence interval approximation (based on model holdout RMSE)
        ci_lower = max(0.0, round(pred_aqi - 1.28 * rmse * (1.0 + 0.08 * day), 1))
        ci_upper = round(pred_aqi + 1.28 * rmse * (1.0 + 0.08 * day), 1)
        
        forecasts.append({
            "day": day,
            "date": target_date.strftime('%Y-%m-%d'),
            "predicted_aqi": pred_aqi,
            "ci_lower": ci_lower,
            "ci_upper": ci_upper,
            "category": cat_info["category"],
            "color": cat_info["color"],
            "health_risk": cat_info["health_risk"]
        })
        
    # Recent historical trend (last 21 days) for visual continuity
    recent_trend = []
    tail_df = ts_data.tail(21)
    for dt, row in tail_df.iterrows():
        recent_trend.append({
            "date": dt.strftime('%Y-%m-%d'),
            "aqi": round(float(row['AQI']), 1)
        })

    return {
        "success": True,
        "city": city,
        "last_observed_date": last_known_date.strftime('%Y-%m-%d'),
        "validation_mae": round(mae, 2),
        "validation_rmse": round(rmse, 2),
        "forecasts": forecasts,
        "recent_history": recent_trend,
        "limitations": "Forecast assumes standard seasonal meteorological continuity. Extreme episodic events (e.g. crop burning, sudden heavy rainfall) may cause deviations."
    }
