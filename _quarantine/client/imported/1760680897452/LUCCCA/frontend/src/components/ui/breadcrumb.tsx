import React from "react";

// Top-level breadcrumb container
export const Breadcrumb = React.forwardRef<any, any>(function Breadcrumb(props, ref) {
  return React.createElement(props?.as || "nav", { ref, ...props }, props?.children);
});

// Individual item
export const BreadcrumbItem = React.forwardRef<any, any>(function BreadcrumbItem(props, ref) {
  return React.createElement(props?.as || "span", { ref, ...props }, props?.children);
});

// Link inside breadcrumb
export const BreadcrumbLink = React.forwardRef<any, any>(function BreadcrumbLink(props, ref) {
  return React.createElement(props?.as || "a", { ref, ...props }, props?.children);
});

// List wrapper
export const BreadcrumbList = React.forwardRef<any, any>(function BreadcrumbList(props, ref) {
  return React.createElement(props?.as || "ol", { ref, ...props }, props?.children);
});

// Current/active page
export const BreadcrumbPage = React.forwardRef<any, any>(function BreadcrumbPage(props, ref) {
  return React.createElement(props?.as || "span", { ref, ...props }, props?.children);
});

// Separator (› or /)
export const BreadcrumbSeparator = React.forwardRef<any, any>(function BreadcrumbSeparator(props, ref) {
  return React.createElement(props?.as || "span", { ref, ...props }, props?.children);
});

// Fallback default
const DefaultShim = React.forwardRef<any, any>(function DefaultShim(props, ref) {
  return React.createElement("div", { ref, ...props }, props?.children);
});
export default DefaultShim;
