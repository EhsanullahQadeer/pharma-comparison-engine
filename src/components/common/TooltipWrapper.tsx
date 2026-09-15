import { cloneElement } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

import type { ReactElement } from "react";

interface TooltipWrapperProps {
  label: string;
  children: ReactElement;
  [key: string]: unknown;
}

const TooltipWrapper = ({ label, children, ...rest }: TooltipWrapperProps) => {
  const isDisabled = Boolean((children.props as { disabled?: boolean }).disabled);
  const child = cloneElement(children, rest);

  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger render={isDisabled ? (
          <span className="inline-flex cursor-not-allowed" tabIndex={0}>
            {child}
          </span>
        ) : child}
        />
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default TooltipWrapper;
