#!/usr/bin/env python3
"""
Prophet Forecasting Runner
Reads JSON from stdin, runs Prophet, outputs JSON to stdout
"""

import sys
import json
import pandas as pd
from prophet import Prophet
from datetime import datetime, timedelta

def main():
    try:
        horizon = int(sys.argv[1]) if len(sys.argv) > 1 else 30
        
        # Read input from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Convert to DataFrame (expected columns: date, y)
        df = pd.DataFrame(input_data)
        df.columns = ["ds", "y"]
        df["ds"] = pd.to_datetime(df["ds"])
        
        # Initialize and fit Prophet
        m = Prophet(
            daily_seasonality=True,
            weekly_seasonality=True,
            yearly_seasonality=False,
            interval_width=0.95,
            changepoint_prior_scale=0.05,
        )
        
        m.fit(df)
        
        # Generate future dataframe
        future = m.make_future_dataframe(periods=horizon, freq='D')
        
        # Make forecast
        forecast = m.predict(future)
        
        # Extract relevant columns and convert to JSON-serializable format
        result = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(horizon).copy()
        result["ds"] = result["ds"].astype(str)
        result["yhat"] = result["yhat"].round(2).astype(float)
        result["yhat_lower"] = result["yhat_lower"].round(2).astype(float)
        result["yhat_upper"] = result["yhat_upper"].round(2).astype(float)
        
        # Output as JSON
        output = result.to_dict("records")
        print(json.dumps(output))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
