import React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => <input ref={ref} {...props} className={["border rounded px-2 py-1", props.className].join(" ")} />
);

Input.displayName = "Input";

export default Input;
