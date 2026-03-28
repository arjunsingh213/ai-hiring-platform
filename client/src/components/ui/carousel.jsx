import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ShareholderReports (Feature Carousel)
 * A horizontal scrolling carousel for showcasing reports, features, or highlights.
 */
export const ShareholderReports = React.forwardRef(
  ({ reports, title = "Platform Capabilities", subtitle = "Reimagining the technical hiring lifecycle", className, ...props }, ref) => {
    const scrollContainerRef = React.useRef(null);
    const [canScrollLeft, setCanScrollLeft] = React.useState(false);
    const [canScrollRight, setCanScrollRight] = React.useState(true);

    const checkScrollability = React.useCallback(() => {
      const container = scrollContainerRef.current;
      if (container) {
        const { scrollLeft, scrollWidth, clientWidth } = container;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
      }
    }, []);

    React.useEffect(() => {
      const container = scrollContainerRef.current;
      if (container) {
        checkScrollability();
        container.addEventListener("scroll", checkScrollability);
      }
      return () => {
        if (container) {
          container.removeEventListener("scroll", checkScrollability);
        }
      };
    }, [reports, checkScrollability]);

    const scroll = (direction) => {
      const container = scrollContainerRef.current;
      if (container) {
        const scrollAmount = container.clientWidth * 0.8;
        container.scrollBy({
          left: direction === "left" ? -scrollAmount : scrollAmount,
          behavior: "smooth",
        });
      }
    };

    return (
      <section
        ref={ref}
        className={cn("w-full max-w-7xl mx-auto py-12 px-4 sm:px-6 relative z-30", className)}
        aria-labelledby="reports-heading"
        {...props}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col gap-1">
            <h2 id="reports-heading" className="text-3xl font-heading italic text-white tracking-tight">
              {title}
            </h2>
            <p className="text-white/40 font-body text-sm uppercase tracking-widest">{subtitle}</p>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="p-3 rounded-full border border-white/10 bg-white/5 text-white transition-all disabled:opacity-20 hover:bg-white/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="p-3 rounded-full border border-white/10 bg-white/5 text-white transition-all disabled:opacity-20 hover:bg-white/10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide space-x-6 pb-4"
        >
          {reports.map((report) => (
            <div
              key={report.id}
              className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start"
            >
              <div className="group cursor-pointer">
                <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 mb-5 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:border-white/20 group-hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] group-hover:-translate-y-2">
                  <img
                    src={report.imageSrc}
                    alt={report.quarter}
                    className="w-full h-[400px] object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-6 flex flex-col justify-end">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-2">Capabilities</h3>
                      <p className="text-xl font-heading italic text-white leading-tight">
                        {report.quarter}
                      </p>
                      <p className="text-xs text-white/40 mt-3 font-body font-light line-clamp-2">
                        {report.period}
                      </p>
                    </div>
                  </div>
                  {report.isNew && (
                    <div className="absolute top-4 right-4">
                      <span className="text-[9px] font-bold bg-white text-black px-2 py-1 rounded-full tracking-tighter uppercase">
                        New
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
);

ShareholderReports.displayName = "ShareholderReports";
