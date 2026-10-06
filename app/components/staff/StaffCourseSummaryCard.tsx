import { MapPin, Pencil, Route } from "lucide-react";
import { useTranslation } from "react-i18next";
import EventsMap from "@/components/events/EventsMap";
import { Button } from "@/components/ui/button";
import { parseCoord } from "@/lib/leafletSetup";
import { parseLineString } from "@/utils/courseMapUtils";
import type { StaffEventCoursePayload } from "@shared/api";

interface StaffCourseSummaryCardProps {
  course: StaffEventCoursePayload | null;
  onOpenWizard: () => void;
  startLat?: number | string | null;
  startLng?: number | string | null;
}

export default function StaffCourseSummaryCard({
  course,
  onOpenWizard,
  startLat,
  startLng,
}: StaffCourseSummaryCardProps) {
  const { t } = useTranslation();
  const routePoints = course ? parseLineString(course.routeGeojson).length : 0;
  const hasCourse = routePoints >= 2;
  const lat = parseCoord(startLat);
  const lng = parseCoord(startLng);

  return (
    <div className="space-y-3">
      {hasCourse && course ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {lat != null && lng != null ? (
              <div className="rounded-md border border-border bg-card/60 p-2.5 flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase text-muted-foreground leading-none">
                    {t("staffPortal.courseEditor.careerStart")}
                  </p>
                  <p className="text-[11px] font-mono font-semibold truncate mt-0.5">
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </p>
                </div>
              </div>
            ) : null}
            <div className="rounded-md border border-border bg-card/60 p-2.5 flex items-center gap-2.5">
              <Route className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground leading-none">
                  {t("staffPortal.courseEditor.distance")}
                </p>
                <p className="text-sm font-bold text-primary mt-0.5">
                  {course.distanceKm ?? "—"} km
                </p>
              </div>
            </div>
            <div className="rounded-md border border-border bg-card/60 p-2.5 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-[10px] uppercase text-muted-foreground leading-none">
                  {t("staffPortal.courseEditor.poiList")}
                </p>
                <p className="text-sm font-bold mt-0.5">{course.points?.length ?? 0}</p>
              </div>
            </div>
            <div className="rounded-md border border-border bg-card/60 p-2.5 flex items-center gap-2.5">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground leading-none">
                  {t("staffPortal.courseEditor.elevation")}
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {course.elevationGainM != null ? `${course.elevationGainM} m` : "—"}
                </p>
              </div>
            </div>
          </div>
          <EventsMap
            courseRoute={course.routeGeojson}
            coursePoints={course.points}
            interactive={false}
            height={220}
            className="rounded-lg opacity-90"
          />
        </>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-card/40 px-3 py-5 text-center">
          <Route className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-snug">
            {t("staffPortal.courseEditor.summaryEmpty")}
          </p>
        </div>
      )}

      <Button type="button" size="sm" onClick={onOpenWizard} className="w-full sm:w-auto">
        <Pencil className="w-3.5 h-3.5 mr-1.5" />
        {hasCourse ? t("staffPortal.courseEditor.editCourse") : t("staffPortal.courseEditor.createCourse")}
      </Button>
    </div>
  );
}
