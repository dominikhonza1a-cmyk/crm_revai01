import { z } from "zod";
import { and, eq, isNull, ilike, or, sql, desc } from "drizzle-orm";
import { router, protectedProcedure } from "@/api/trpc";
import { db } from "@/shared/db";
import { currentWorkspaceId } from "@/shared/tenant-context";
import { organizations } from "@/modules/organizations/organization.entity";
import { contacts } from "@/modules/contacts/contact.entity";
import { deals } from "@/modules/deals/deal.entity";
import { projects } from "@/modules/projects/project.entity";
import { tasks } from "@/modules/tasks/task.entity";
import { ideas } from "@/modules/ideas/idea.entity";

export type SearchHit = {
  type: "client" | "contact" | "deal" | "project" | "task" | "idea";
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
};

/** Globální hledání (Cmd+K): ILIKE napříč klienty, kontakty, dealy, projekty a úkoly. */
export const searchRouter = router({
  query: protectedProcedure
    .input(z.object({ q: z.string().trim().min(2).max(80) }))
    .query(async ({ input }): Promise<SearchHit[]> => {
      const ws = currentWorkspaceId();
      const p = `%${input.q}%`;
      const LIMIT = 5;

      const [orgs, cts, dls, prjs, tsks, ids] = await Promise.all([
        db().select({ id: organizations.id, name: organizations.name, website: organizations.website })
          .from(organizations)
          .where(and(eq(organizations.workspaceId, ws), isNull(organizations.deletedAt), ilike(organizations.name, p)))
          .orderBy(desc(organizations.updatedAt)).limit(LIMIT),

        db().select({ id: contacts.id, first: contacts.firstName, last: contacts.lastName, email: contacts.email, orgId: contacts.organizationId })
          .from(contacts)
          .where(and(eq(contacts.workspaceId, ws), isNull(contacts.deletedAt),
            or(ilike(sql`${contacts.firstName} || ' ' || ${contacts.lastName}`, p), ilike(contacts.email, p))))
          .orderBy(desc(contacts.updatedAt)).limit(LIMIT),

        db().select({ id: deals.id, title: deals.title, orgName: organizations.name })
          .from(deals).innerJoin(organizations, eq(deals.organizationId, organizations.id))
          .where(and(eq(deals.workspaceId, ws), isNull(deals.deletedAt), ilike(deals.title, p)))
          .orderBy(desc(deals.updatedAt)).limit(LIMIT),

        db().select({ id: projects.id, name: projects.name, code: projects.code })
          .from(projects)
          .where(and(eq(projects.workspaceId, ws), isNull(projects.deletedAt), ilike(projects.name, p)))
          .orderBy(desc(projects.updatedAt)).limit(LIMIT),

        db().select({ id: tasks.id, title: tasks.title, status: tasks.status, type: tasks.type })
          .from(tasks)
          .where(and(eq(tasks.workspaceId, ws), isNull(tasks.deletedAt), ilike(tasks.title, p)))
          .orderBy(desc(tasks.updatedAt)).limit(LIMIT),

        db().select({ id: ideas.id, title: ideas.title })
          .from(ideas)
          .where(and(eq(ideas.workspaceId, ws), isNull(ideas.deletedAt), or(ilike(ideas.title, p), ilike(ideas.content, p))))
          .orderBy(desc(ideas.updatedAt)).limit(LIMIT),
      ]);

      return [
        ...orgs.map((o): SearchHit => ({ type: "client", id: o.id, title: o.name, subtitle: o.website, href: `/clients/${o.id}` })),
        ...cts.map((c): SearchHit => ({ type: "contact", id: c.id, title: `${c.first} ${c.last}`, subtitle: c.email, href: c.orgId ? `/clients/${c.orgId}` : "/clients" })),
        ...dls.map((d): SearchHit => ({ type: "deal", id: d.id, title: d.title, subtitle: d.orgName, href: "/deals" })),
        ...prjs.map((pr): SearchHit => ({ type: "project", id: pr.id, title: pr.name, subtitle: pr.code, href: `/projects/${pr.id}` })),
        ...tsks.map((t): SearchHit => ({ type: "task", id: t.id, title: t.title, subtitle: t.type === "support" ? "ticket" : "úkol", href: "/tasks" })),
        ...ids.map((i): SearchHit => ({ type: "idea", id: i.id, title: i.title, subtitle: "nápad", href: `/ideas/${i.id}` })),
      ];
    }),
});
