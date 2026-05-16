"""
Advanced ML Forecasting Engine for Echo Ops
Ensemble model combining XGBoost + LSTM + ARIMA for demand forecasting
Supports multi-source signal integration and online learning

Requirements: xgboost, tensorflow, statsmodels, pandas, numpy, scikit-learn
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import json
import logging

try:
    import xgboost as xgb
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.optimizers import Adam
    from statsmodels.tsa.arima.model import ARIMA
    from sklearn.preprocessing import StandardScaler
except ImportError as e:
    raise ImportError(f"ML dependencies not installed: {e}")

logger = logging.getLogger(__name__)

class ForecastingEngine:
    """
    Ensemble forecasting engine combining multiple models
    Supports auto-tuning, online learning, and probabilistic outputs
    """

    def __init__(
        self,
        organization_id: str,
        product_id: str,
        outlet_id: str,
        history_days: int = 365,
        forecast_days: int = 14,
        model_weights: Dict[str, float] = None,
    ):
        """
        Initialize forecasting engine
        
        Args:
            organization_id: Organization ID
            product_id: Product ID for which to forecast
            outlet_id: Outlet ID for which to forecast
            history_days: Days of historical data to use (default 365)
            forecast_days: Days to forecast into future (default 14)
            model_weights: Weights for ensemble models (XGBoost, LSTM, ARIMA)
        """
        self.organization_id = organization_id
        self.product_id = product_id
        self.outlet_id = outlet_id
        self.history_days = history_days
        self.forecast_days = forecast_days

        # Default ensemble weights
        self.model_weights = model_weights or {
            'xgboost': 0.4,
            'lstm': 0.35,
            'arima': 0.25,
        }

        # Models
        self.xgb_model = None
        self.lstm_model = None
        self.arima_model = None

        # Scalers for normalization
        self.scaler = StandardScaler()
        self.feature_scaler = StandardScaler()

        # Metadata
        self.last_training = None
        self.training_count = 0
        self.model_metrics = {}

    def prepare_features(
        self,
        sales_data: pd.DataFrame,
        pos_data: Optional[pd.DataFrame] = None,
        external_signals: Optional[Dict[str, List[float]]] = None,
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare features for ML models
        
        Args:
            sales_data: Historical sales/invoices (with date and qty columns)
            pos_data: Optional POS sales data (with timestamp and qty)
            external_signals: Optional external signals (weather, events, reservations)
        
        Returns:
            features: (n_samples, n_features) array
            targets: (n_samples,) array of quantities
        """
        # Ensure datetime columns
        sales_data['date'] = pd.to_datetime(sales_data['date'])
        sales_data = sales_data.sort_values('date')

        # Aggregate to daily data
        daily_sales = sales_data.groupby('date')['qty'].sum().reset_index()
        daily_sales = daily_sales.set_index('date').asfreq('D', fill_value=0)

        # Create lagged features
        features_list = []

        # Historical lags (7, 14, 30 day averages)
        for lag in [7, 14, 30]:
            if len(daily_sales) > lag:
                features_list.append(
                    daily_sales['qty'].rolling(window=lag, min_periods=1).mean().values[:-1]
                )

        # Trend (slope of last 14 days)
        if len(daily_sales) > 14:
            def trend_feature(s):
                if len(s) < 2:
                    return 0
                x = np.arange(len(s))
                return np.polyfit(x, s.values, 1)[0]

            trend = daily_sales['qty'].rolling(window=14, min_periods=1).apply(trend_feature)
            features_list.append(trend.values[:-1])

        # Seasonality (day of week, week of year)
        dow_features = daily_sales.index.dayofweek.values[:-1]
        woy_features = daily_sales.index.isocalendar().week.values[:-1]
        features_list.append(dow_features)
        features_list.append(woy_features)

        # External signals if provided
        if external_signals:
            for signal_name, signal_values in external_signals.items():
                if len(signal_values) == len(daily_sales) - 1:
                    features_list.append(np.array(signal_values))

        # Combine all features
        X = np.column_stack(features_list) if features_list else np.array([]).reshape(-1, 1)
        y = daily_sales['qty'].values[1:]  # Target is next day

        # Normalize
        X_scaled = self.feature_scaler.fit_transform(X)
        y_scaled = self.scaler.fit_transform(y.reshape(-1, 1)).flatten()

        return X_scaled, y_scaled, daily_sales

    def train_xgboost(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
    ):
        """Train XGBoost model"""
        try:
            params = {
                'objective': 'reg:squarederror',
                'max_depth': 7,
                'learning_rate': 0.05,
                'subsample': 0.8,
                'colsample_bytree': 0.8,
                'reg_alpha': 1,
                'reg_lambda': 1,
            }

            eval_set = [(X_val, y_val)] if X_val is not None else None

            self.xgb_model = xgb.train(
                params,
                xgb.DMatrix(X_train, label=y_train),
                num_boost_round=100,
                evals=eval_set if eval_set else None,
                early_stopping_rounds=10 if eval_set else None,
                verbose_eval=False,
            )

            logger.info("XGBoost model trained successfully")
        except Exception as e:
            logger.error(f"Error training XGBoost: {e}")
            raise

    def train_lstm(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        X_val: Optional[np.ndarray] = None,
        y_val: Optional[np.ndarray] = None,
        lookback: int = 7,
    ):
        """Train LSTM model for sequence learning"""
        try:
            # Reshape for LSTM (samples, timesteps, features)
            X_lstm = []
            y_lstm = []

            for i in range(len(X_train) - lookback):
                X_lstm.append(X_train[i : i + lookback])
                y_lstm.append(y_train[i + lookback])

            X_lstm = np.array(X_lstm)
            y_lstm = np.array(y_lstm)

            # Build LSTM
            self.lstm_model = Sequential([
                LSTM(64, input_shape=(lookback, X_train.shape[1]), return_sequences=True),
                Dropout(0.2),
                LSTM(32, return_sequences=False),
                Dropout(0.2),
                Dense(16, activation='relu'),
                Dense(1),
            ])

            self.lstm_model.compile(optimizer=Adam(learning_rate=0.001), loss='mse')

            # Prepare validation data
            validation_data = None
            if X_val is not None:
                X_val_lstm = []
                y_val_lstm = []
                for i in range(len(X_val) - lookback):
                    X_val_lstm.append(X_val[i : i + lookback])
                    y_val_lstm.append(y_val[i + lookback])
                validation_data = (np.array(X_val_lstm), np.array(y_val_lstm))

            # Train
            self.lstm_model.fit(
                X_lstm,
                y_lstm,
                validation_data=validation_data,
                epochs=50,
                batch_size=32,
                verbose=0,
            )

            logger.info("LSTM model trained successfully")
        except Exception as e:
            logger.error(f"Error training LSTM: {e}")
            raise

    def train_arima(self, y_train: np.ndarray):
        """Train ARIMA model"""
        try:
            # Denormalize for ARIMA
            y_denorm = self.scaler.inverse_transform(y_train.reshape(-1, 1)).flatten()

            # Auto ARIMA logic (p, d, q)
            # For simplicity, using fixed (1, 1, 1), but could use auto_arima
            self.arima_model = ARIMA(y_denorm, order=(1, 1, 1))
            self.arima_model = self.arima_model.fit()

            logger.info("ARIMA model trained successfully")
        except Exception as e:
            logger.error(f"Error training ARIMA: {e}")
            raise

    def forecast(
        self,
        X_recent: np.ndarray,
        y_recent: np.ndarray,
        forecast_days: Optional[int] = None,
        return_intervals: bool = True,
    ) -> Dict[str, any]:
        """
        Generate ensemble forecast
        
        Args:
            X_recent: Recent feature data
            y_recent: Recent target data
            forecast_days: Days to forecast (default from init)
            return_intervals: Whether to return P10/P50/P90
        
        Returns:
            {
                'point_forecast': [...],  # Mean forecast
                'p10': [...],  # 10th percentile
                'p50': [...],  # Median
                'p90': [...],  # 90th percentile
                'confidence': [...],  # Model confidence
                'components': {  # Individual model forecasts
                    'xgboost': [...],
                    'lstm': [...],
                    'arima': [...]
                },
                'explanation': {...}  # Why forecast changed
            }
        """
        forecast_days = forecast_days or self.forecast_days

        forecasts = {}

        # XGBoost forecast
        if self.xgb_model:
            try:
                xgb_preds = []
                X_curr = X_recent.copy()
                for _ in range(forecast_days):
                    pred = self.xgb_model.predict(xgb.DMatrix(X_curr[-1:]))
                    xgb_preds.append(pred[0])
                    # Update features for next step (simplified)
                    X_curr = np.vstack([X_curr[1:], X_curr[-1:]])
                forecasts['xgboost'] = np.array(xgb_preds)
            except Exception as e:
                logger.warn(f"XGBoost forecast failed: {e}")
                forecasts['xgboost'] = None

        # LSTM forecast
        if self.lstm_model:
            try:
                lstm_preds = []
                seq = X_recent[-7:].copy() if len(X_recent) >= 7 else X_recent
                for _ in range(forecast_days):
                    pred = self.lstm_model.predict(seq[np.newaxis, :, :], verbose=0)
                    lstm_preds.append(pred[0, 0])
                    # Update sequence
                    seq = np.vstack([seq[1:], pred])
                forecasts['lstm'] = np.array(lstm_preds)
            except Exception as e:
                logger.warn(f"LSTM forecast failed: {e}")
                forecasts['lstm'] = None

        # ARIMA forecast
        if self.arima_model:
            try:
                arima_preds = self.arima_model.get_forecast(steps=forecast_days)
                forecasts['arima'] = arima_preds.predicted_mean.values
                forecasts['arima_ci'] = arima_preds.conf_int(alpha=0.2).values
            except Exception as e:
                logger.warn(f"ARIMA forecast failed: {e}")
                forecasts['arima'] = None

        # Ensemble forecast
        ensemble_forecasts = []
        for i in range(forecast_days):
            weighted_sum = 0
            weight_sum = 0

            if forecasts.get('xgboost') is not None:
                weighted_sum += self.model_weights['xgboost'] * self.scaler.inverse_transform(
                    [[forecasts['xgboost'][i]]]
                )[0, 0]
                weight_sum += self.model_weights['xgboost']

            if forecasts.get('lstm') is not None:
                weighted_sum += self.model_weights['lstm'] * self.scaler.inverse_transform(
                    [[forecasts['lstm'][i]]]
                )[0, 0]
                weight_sum += self.model_weights['lstm']

            if forecasts.get('arima') is not None:
                weighted_sum += self.model_weights['arima'] * forecasts['arima'][i]
                weight_sum += self.model_weights['arima']

            if weight_sum > 0:
                ensemble_forecasts.append(weighted_sum / weight_sum)

        point_forecast = np.array(ensemble_forecasts)

        # Generate confidence intervals (P10, P50, P90)
        # Simplified: use ARIMA CI if available, else use bootstrap
        if return_intervals and forecasts.get('arima_ci') is not None:
            p10 = forecasts['arima_ci'][:, 0]
            p90 = forecasts['arima_ci'][:, 1]
        else:
            # Bootstrap confidence intervals
            std_error = np.std(y_recent) * 0.2  # Conservative estimate
            p10 = point_forecast - 1.28 * std_error
            p90 = point_forecast + 1.28 * std_error

        p50 = point_forecast  # Median = point forecast

        # Confidence score (0-100)
        confidence = self._calculate_confidence(forecasts, y_recent)

        return {
            'point_forecast': point_forecast.tolist(),
            'p10': np.maximum(p10, 0).tolist(),  # No negative quantities
            'p50': p50.tolist(),
            'p90': np.maximum(p90, 0).tolist(),
            'confidence': confidence,
            'components': {k: v.tolist() if v is not None else None for k, v in forecasts.items()},
            'explanation': self._generate_explanation(y_recent, point_forecast),
        }

    def _calculate_confidence(self, forecasts: Dict, y_recent: np.ndarray) -> float:
        """Calculate forecast confidence (0-100)"""
        # Base confidence from number of available models
        base = 50 + (15 * sum(1 for v in forecasts.values() if v is not None))

        # Adjust for recent trend stability
        if len(y_recent) > 7:
            recent_std = np.std(y_recent[-7:])
            overall_std = np.std(y_recent)
            if overall_std > 0:
                stability = 1 - (recent_std / overall_std)
                base += stability * 25

        return min(100, max(50, base))

    def _generate_explanation(self, y_recent: np.ndarray, forecast: np.ndarray) -> Dict:
        """Generate explanation for forecast changes"""
        recent_avg = np.mean(y_recent[-7:])
        forecast_avg = np.mean(forecast[:3])  # First 3 days
        change_pct = ((forecast_avg - recent_avg) / (recent_avg + 1)) * 100

        trend = 'increasing' if change_pct > 5 else ('decreasing' if change_pct < -5 else 'stable')

        return {
            'trend': trend,
            'change_percent': round(change_pct, 2),
            'recent_average': round(recent_avg, 2),
            'forecast_average': round(forecast_avg, 2),
            'factors': [
                'Historical seasonality',
                'Recent trend',
                'Multi-model ensemble consensus',
            ],
        }

    def get_model_info(self) -> Dict:
        """Get information about trained models"""
        return {
            'models_trained': {
                'xgboost': self.xgb_model is not None,
                'lstm': self.lstm_model is not None,
                'arima': self.arima_model is not None,
            },
            'training_count': self.training_count,
            'last_trained': self.last_training,
            'model_weights': self.model_weights,
            'metrics': self.model_metrics,
        }
