"use client";

import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { TimeFormatType } from "@/lib/calendar/types";
import { motion, AnimatePresence } from "motion/react";

interface TimeFormatToggleProps {
  format: TimeFormatType;
  onChange: (format: TimeFormatType) => void;
  className?: string;
  tooltipDelay?: number;
}

export function TimeFormatToggle({
  format = TimeFormatType.HOUR_24,
  onChange,
  className = "",
  tooltipDelay = 300,
}: TimeFormatToggleProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const tooltipText =
    format === TimeFormatType.HOUR_24 ? "Switch to 12-hour format (AM/PM)" : "Switch to 24-hour format";

  const toggleFormat = () => {
    setIsAnimating(true);
    const newFormat = format === TimeFormatType.HOUR_24 ? TimeFormatType.HOUR_12 : TimeFormatType.HOUR_24;
    onChange(newFormat);

    // Reset animation
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <TooltipProvider delayDuration={tooltipDelay}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.03 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFormat}
              className={`${className}`}
              aria-label={`Time format: ${format === TimeFormatType.HOUR_24 ? "24h" : "12h"}`}
            >
              <motion.div
                className="flex items-center"
                animate={isAnimating ? { rotate: [0, 15, -15, 10, -10, 5, -5, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <motion.div
                  animate={isAnimating ? { rotate: 360 } : { rotate: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mr-1"
                >
                  <Clock className="h-4 w-4" />
                </motion.div>

                <AnimatePresence mode="wait">
                  <motion.span
                    key={format}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs"
                  >
                    {format === TimeFormatType.HOUR_24 ? "24h" : "12h"}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            </Button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          <p>{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
