"""
cpcb_aqi.py
Official Indian Central Pollution Control Board (CPCB) National Air Quality Index (NAQI) calculation standards.
Calculates sub-indices for PM2.5, PM10, NO2, SO2, CO, O3, NH3 and official overall AQI.
"""

from typing import Dict, Any, Optional

# CPCB Sub-index Breakpoints
# Each tuple: (B_Lo, B_Hi, I_Lo, I_Hi)
CPCB_BREAKPOINTS = {
    'PM2.5': [
        (0.0, 30.0, 0, 50),
        (30.1, 60.0, 51, 100),
        (60.1, 90.0, 101, 200),
        (90.1, 120.0, 201, 300),
        (120.1, 250.0, 301, 400),
        (250.1, 500.0, 401, 500),
    ],
    'PM10': [
        (0.0, 50.0, 0, 50),
        (50.1, 100.0, 51, 100),
        (100.1, 250.0, 101, 200),
        (250.1, 350.0, 201, 300),
        (350.1, 430.0, 301, 400),
        (430.1, 600.0, 401, 500),
    ],
    'NO2': [
        (0.0, 40.0, 0, 50),
        (40.1, 80.0, 51, 100),
        (80.1, 180.0, 101, 200),
        (180.1, 280.0, 201, 300),
        (280.1, 400.0, 301, 400),
        (400.1, 600.0, 401, 500),
    ],
    'SO2': [
        (0.0, 40.0, 0, 50),
        (40.1, 80.0, 51, 100),
        (80.1, 380.0, 101, 200),
        (380.1, 800.0, 201, 300),
        (800.1, 1600.0, 301, 400),
        (1600.1, 2000.0, 401, 500),
    ],
    'CO': [
        (0.0, 1.0, 0, 50),
        (1.01, 2.0, 51, 100),
        (2.01, 10.0, 101, 200),
        (10.01, 17.0, 201, 300),
        (17.01, 34.0, 301, 400),
        (34.01, 50.0, 401, 500),
    ],
    'O3': [
        (0.0, 50.0, 0, 50),
        (50.1, 100.0, 51, 100),
        (100.1, 168.0, 101, 200),
        (168.1, 208.0, 201, 300),
        (208.1, 748.0, 301, 400),
        (748.1, 1000.0, 401, 500),
    ],
    'NH3': [
        (0.0, 200.0, 0, 50),
        (200.1, 400.0, 51, 100),
        (400.1, 800.0, 101, 200),
        (800.1, 1200.0, 201, 300),
        (1200.1, 1800.0, 301, 400),
        (1800.1, 2200.0, 401, 500),
    ]
}

CATEGORIES = [
    (0, 50, "Good", "#10b981", "Minimal impact. Clean air ideal for all outdoor activities.", "No precautions needed. Enjoy the fresh air!"),
    (51, 100, "Satisfactory", "#84cc16", "Minor breathing discomfort to sensitive people.", "Sensitive individuals with respiratory conditions should monitor symptoms."),
    (101, 200, "Moderately Polluted", "#eab308", "Breathing discomfort to people with lungs, asthma, and heart diseases.", "Children and older adults should reduce prolonged or heavy outdoor exertion."),
    (201, 300, "Poor", "#f97316", "Breathing discomfort to most people on prolonged exposure.", "Everyone should reduce outdoor physical exertion; wear an N95 mask if outdoors."),
    (301, 400, "Very Poor", "#ef4444", "Respiratory illness on prolonged exposure. Significant distress for asthmatics.", "Avoid outdoor exertion. Keep windows closed, run air purifiers indoors, wear masks outside."),
    (401, 500, "Severe", "#881337", "Affects healthy people and seriously impacts those with existing diseases.", "Emergency conditions. Stay strictly indoors, use HEPA filtration, avoid all outdoor physical activity.")
]


def calculate_sub_index(pollutant: str, concentration: Optional[float]) -> Optional[float]:
    """
    Calculate linear sub-index for a single pollutant based on CPCB formula:
    I = I_Lo + [(I_Hi - I_Lo) / (B_Hi - B_Lo)] * (C - B_Lo)
    """
    if concentration is None or concentration < 0:
        return None
    
    table = CPCB_BREAKPOINTS.get(pollutant)
    if not table:
        return None
        
    for b_lo, b_hi, i_lo, i_hi in table:
        if b_lo <= concentration <= b_hi:
            val = i_lo + ((i_hi - i_lo) / (b_hi - b_lo)) * (concentration - b_lo)
            return round(val, 2)
            
    # Handle concentrations above maximum table breakpoint
    max_b_lo, max_b_hi, max_i_lo, max_i_hi = table[-1]
    if concentration > max_b_hi:
        # Cap or extrapolate linearly
        val = max_i_hi + ((max_i_hi - max_i_lo) / (max_b_hi - max_b_lo)) * (concentration - max_b_hi)
        return round(val, 2)
        
    return None


def calculate_official_cpcb_aqi(pollutant_data: Dict[str, Optional[float]]) -> Dict[str, Any]:
    """
    Official CPCB AQI criteria:
    1. At least 3 pollutants must be monitored.
    2. At least one of PM2.5 or PM10 must be monitored.
    3. The overall AQI is the maximum of the sub-indices (the driving pollutant).
    """
    sub_indices = {}
    for pol in ['PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'O3', 'NH3']:
        val = pollutant_data.get(pol)
        if val is not None:
            sub = calculate_sub_index(pol, float(val))
            if sub is not None:
                sub_indices[pol] = sub

    has_particulate = ('PM2.5' in sub_indices) or ('PM10' in sub_indices)
    valid_count = len(sub_indices)
    
    if valid_count < 3 or not has_particulate:
        # Insufficient data according to official CPCB mandate
        # However, we can still report max sub-index as provisional
        driving_pol = max(sub_indices, key=sub_indices.get) if sub_indices else None
        overall_aqi = sub_indices[driving_pol] if driving_pol else None
        return {
            "official_valid": False,
            "reason": "CPCB requires at least 3 pollutants with at least PM2.5 or PM10.",
            "sub_indices": sub_indices,
            "aqi": overall_aqi,
            "driving_pollutant": driving_pol,
            "category_info": get_category_info(overall_aqi) if overall_aqi is not None else None
        }

    driving_pol = max(sub_indices, key=sub_indices.get)
    overall_aqi = round(sub_indices[driving_pol])
    
    return {
        "official_valid": True,
        "aqi": overall_aqi,
        "driving_pollutant": driving_pol,
        "sub_indices": sub_indices,
        "category_info": get_category_info(overall_aqi)
    }


def get_category_info(aqi_val: Optional[float]) -> Dict[str, Any]:
    """Return category name, color, health statement, and precaution."""
    if aqi_val is None:
        return {
            "category": "Unknown",
            "color": "#94a3b8",
            "health_risk": "Insufficient data to determine air quality index.",
            "precautions": "Monitor local environmental sensors or re-check readings."
        }

    if aqi_val < 0:
        return {
            "category": "Invalid",
            "color": "#64748b",
            "health_risk": "Negative values are invalid for AQI.",
            "precautions": "Check sensor calibration or entry values."
        }

    for lo, hi, cat, color, risk, precautions in CATEGORIES:
        if lo <= aqi_val <= hi:
            return {
                "category": cat,
                "color": color,
                "health_risk": risk,
                "precautions": precautions,
                "range": f"{lo}–{hi}"
            }
            
    # Greater than 500
    return {
        "category": "Hazardous / Beyond Scale",
        "color": "#4c0519",
        "health_risk": "Extremely hazardous conditions far exceeding national safety thresholds.",
        "precautions": "Strict lockdown conditions. Complete restriction on outdoor activity. Maximum indoor air filtration mandatory.",
        "range": "> 500"
    }
