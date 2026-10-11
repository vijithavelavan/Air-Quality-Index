"""
preprocessing.py
Data loading, cleaning, validation, feature engineering, and preparation pipeline.
Works with Kaggle India air quality dataset (city_day.csv, station_day.csv) or uploaded user datasets.
"""

import os
import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List, Optional
from backend.cpcb_aqi import calculate_official_cpcb_aqi

REQUIRED_FEATURES = ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3']

# Realistic ambient physical limits for cleaning extreme sensor noise or corrupt telemetry
VALID_RANGES = {
    'PM2.5': (0.0, 1000.0),
    'PM10': (0.0, 1500.0),
    'NO2': (0.0, 600.0),
    'SO2': (0.0, 1000.0),
    'CO': (0.0, 100.0),
    'O3': (0.0, 800.0),
    'NH3': (0.0, 1000.0),
    'AQI': (0.0, 1000.0)
}

def clean_air_quality_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans raw air quality data:
    1. Standardizes column names (case-insensitive mapping)
    2. Drops pure duplicates
    3. Trims physically impossible negatives and sensor spikes
    4. Handles missing values using rolling / median imputation
    5. Computes official CPCB AQI if AQI is missing but pollutants are present
    """
    df = df.copy()
    
    # Standardize column headers
    col_map = {}
    for col in df.columns:
        norm = col.strip()
        for ref in REQUIRED_FEATURES + ['AQI', 'Date', 'City', 'AQI_Bucket']:
            if norm.lower() == ref.lower():
                col_map[col] = ref
                break
    df.rename(columns=col_map, inplace=True)
    
    # Remove obvious duplicates
    df.drop_duplicates(inplace=True)
    
    # Clean numeric pollutant columns
    for pol in REQUIRED_FEATURES + ['AQI']:
        if pol in df.columns:
            df[pol] = pd.to_numeric(df[pol], errors='coerce')
            if pol in VALID_RANGES:
                min_v, max_v = VALID_RANGES[pol]
                # Replace negative or extreme sensor glitch values with NaN
                df.loc[(df[pol] < min_v) | (df[pol] > max_v), pol] = np.nan

    # If AQI is missing in row, try calculating via official CPCB sub-index logic
    if 'AQI' not in df.columns:
        df['AQI'] = np.nan
        
    missing_aqi_mask = df['AQI'].isna()
    if missing_aqi_mask.any():
        for idx in df[missing_aqi_mask].index:
            p_dict = {pol: df.at[idx, pol] for pol in REQUIRED_FEATURES if pol in df.columns}
            res = calculate_official_cpcb_aqi(p_dict)
            if res.get('aqi') is not None:
                df.at[idx, 'AQI'] = res['aqi']
                
    return df


def prepare_training_data(
    df: pd.DataFrame, 
    impute_strategy: str = 'median'
) -> Tuple[pd.DataFrame, pd.Series, Dict[str, float]]:
    """
    Prepares X and y for AQI prediction model.
    Returns (X, y, feature_medians_dict)
    """
    df_clean = clean_air_quality_data(df)
    
    # Must have non-null target AQI
    df_clean = df_clean.dropna(subset=['AQI'])
    
    # Filter rows that have at least 3 pollutants present
    existing_pols = [p for p in REQUIRED_FEATURES if p in df_clean.columns]
    df_clean['present_count'] = df_clean[existing_pols].notna().sum(axis=1)
    df_clean = df_clean[df_clean['present_count'] >= 3].copy()
    
    # Impute missing feature values with city-grouped median or global median
    medians = {}
    for p in REQUIRED_FEATURES:
        if p in df_clean.columns:
            med = float(df_clean[p].median()) if not np.isnan(df_clean[p].median()) else 20.0
            medians[p] = med
            df_clean[p] = df_clean[p].fillna(med)
        else:
            medians[p] = 20.0
            df_clean[p] = 20.0
            
    X = df_clean[REQUIRED_FEATURES]
    y = df_clean['AQI']
    
    return X, y, medians


def inspect_dataset_summary(df: pd.DataFrame) -> Dict[str, Any]:
    """Generates detailed metadata statistics for the dataset management page."""
    cleaned = clean_air_quality_data(df)
    
    total_rows = len(df)
    valid_records = len(cleaned.dropna(subset=['AQI']))
    
    pollutant_stats = {}
    missing_counts = {}
    
    for pol in REQUIRED_FEATURES + ['AQI']:
        if pol in cleaned.columns:
            missing_counts[pol] = int(df[pol].isna().sum()) if pol in df.columns else total_rows
            valid_col = cleaned[pol].dropna()
            if len(valid_col) > 0:
                pollutant_stats[pol] = {
                    "count": int(len(valid_col)),
                    "mean": round(float(valid_col.mean()), 2),
                    "std": round(float(valid_col.std()), 2),
                    "min": round(float(valid_col.min()), 2),
                    "max": round(float(valid_col.max()), 2),
                    "median": round(float(valid_col.median()), 2)
                }
            else:
                pollutant_stats[pol] = None
        else:
            missing_counts[pol] = total_rows
            pollutant_stats[pol] = None
            
    # Sample rows preview
    preview_df = df.head(10).replace({np.nan: None})
    preview_rows = preview_df.to_dict(orient='records')
    
    cities = []
    if 'City' in cleaned.columns:
        cities = sorted([str(c) for c in cleaned['City'].dropna().unique()])
        
    date_range = None
    if 'Date' in cleaned.columns:
        cleaned['Date_dt'] = pd.to_datetime(cleaned['Date'], errors='coerce')
        valid_dates = cleaned['Date_dt'].dropna()
        if len(valid_dates) > 0:
            date_range = {
                "start": valid_dates.min().strftime('%Y-%m-%d'),
                "end": valid_dates.max().strftime('%Y-%m-%d')
            }
            
    return {
        "total_rows": total_rows,
        "valid_aqi_records": valid_records,
        "columns": list(df.columns),
        "required_columns_present": [p for p in REQUIRED_FEATURES if p in df.columns],
        "missing_counts": missing_counts,
        "pollutant_stats": pollutant_stats,
        "preview_rows": preview_rows,
        "cities": cities,
        "date_range": date_range
    }
