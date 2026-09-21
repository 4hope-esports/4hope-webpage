"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { DayPicker, getDefaultClassNames, type DayButton } from "react-day-picker"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("group/calendar bg-ink-900 p-3 [--cell-size:2.25rem]", className)}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaultClassNames.nav),
        button_previous: cn(
          "flex size-(--cell-size) items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white select-none aria-disabled:opacity-40",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "flex size-(--cell-size) items-center justify-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white select-none aria-disabled:opacity-40",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size) font-display text-sm font-bold uppercase tracking-[0.04em] text-white",
          defaultClassNames.month_caption,
        ),
        caption_label: cn("select-none", defaultClassNames.caption_label),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "flex-1 select-none text-center font-mono text-[11px] uppercase tracking-[0.06em] text-white/40",
          defaultClassNames.weekday,
        ),
        week: cn("mt-1.5 flex w-full", defaultClassNames.week),
        day: cn(
          "group/day relative aspect-square h-full w-full p-0.5 text-center select-none",
          defaultClassNames.day,
        ),
        range_start: cn("rounded-l-lg bg-gold-500/20", defaultClassNames.range_start),
        range_middle: cn("rounded-none bg-gold-500/10", defaultClassNames.range_middle),
        range_end: cn("rounded-r-lg bg-gold-500/20", defaultClassNames.range_end),
        today: cn("rounded-lg text-gold-500", defaultClassNames.today),
        outside: cn("text-white/25 aria-selected:text-white/25", defaultClassNames.outside),
        disabled: cn("text-white/20 opacity-50", defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className={cn("size-4", chevronClassName)} />
          ) : (
            <ChevronRightIcon className={cn("size-4", chevronClassName)} />
          ),
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({ className, day, modifiers, ...props }: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <button
      type="button"
      ref={ref}
      data-day={day.date.toLocaleDateString()}
      className={cn(
        "flex aspect-square size-full min-w-(--cell-size) items-center justify-center rounded-lg text-[13px] font-semibold text-white/80 leading-none hover:bg-white/10",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-gold-500/40",
        modifiers.selected && "bg-gold-500 text-ink-1000 hover:bg-gold-500",
        modifiers.today && !modifiers.selected && "text-gold-500",
        modifiers.outside && "text-white/25",
        modifiers.disabled && "pointer-events-none text-white/20 opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Calendar }
