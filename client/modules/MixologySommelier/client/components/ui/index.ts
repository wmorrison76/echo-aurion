import React from "react"; // Container - simple wrapper div
export const Container = ({ children, className = "" }: any) =>
  React.createElement(
    "div",
    { className: `container mx-auto ${className}` },
    children,
  ); // Card - wrapper with styling
export const Card = ({ children, className = "" }: any) =>
  React.createElement(
    "div",
    { className: `rounded-lg border ${className}` },
    children,
  ); // CardHeader - card section header
export const CardHeader = ({ children, className = "" }: any) =>
  React.createElement(
    "div",
    { className: `p-6 border-b ${className}` },
    children,
  ); // CardTitle - card title
export const CardTitle = ({ children, className = "" }: any) =>
  React.createElement(
    "h2",
    { className: `text-xl font-semibold ${className}` },
    children,
  ); // CardDescription - card subtitle
export const CardDescription = ({ children, className = "" }: any) =>
  React.createElement(
    "p",
    { className: `text-sm text-slate-400 mt-1 ${className}` },
    children,
  ); // CardContent - card body
export const CardContent = ({ children, className = "" }: any) =>
  React.createElement("div", { className: `p-6 ${className}` }, children);
