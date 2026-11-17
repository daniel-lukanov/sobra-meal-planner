import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

type Crumb = { label: string; to?: "/" | "/recipe/$slug"; slug?: string };
/** Home › Recipe › Cook. The last crumb is the page you are on. */
export function Crumbs({ trail }: { trail: Crumb[] }) {
  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {trail.map((c, k) => (
          <Fragment key={c.label}>
            {k > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {k === trail.length - 1 || !c.to ? <BreadcrumbPage>{c.label}</BreadcrumbPage> : (
                <BreadcrumbLink asChild>{c.to === "/" ? <Link to="/">{c.label}</Link> : <Link to="/recipe/$slug" params={{ slug: c.slug ?? "" }}>{c.label}</Link>}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
