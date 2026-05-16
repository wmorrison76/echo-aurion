// ForecastChart.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

/**
 * Chart component for visualizing forecasts.
 */
const ForecastChart = ({ data }) => (
  <LineChart width={400} height={300} data={data}>
    <CartesianGrid stroke="#ccc" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="value" stroke="#8884d8" />
  </LineChart>
);

export default ForecastChart;
