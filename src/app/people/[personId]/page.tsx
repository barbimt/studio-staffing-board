import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { PersonDetailView } from "@/components/people/person-detail";
import { getPersonDetail } from "@/server/capacity/get-person-detail";
import {
  parsePersonId,
  personDetailHref,
  resolveYearMonth,
} from "@/server/capacity/month";
import { getDb } from "@/server/db";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/people/[personId]">) {
  await connection();

  const { personId: rawId } = await params;
  const { month: monthParam } = await searchParams;
  const personId = parsePersonId(rawId);

  if (personId === null) {
    return { title: "Person not found" };
  }

  const detail = await getPersonDetail(
    getDb(),
    personId,
    resolveYearMonth(monthParam),
  );

  if (!detail) {
    return { title: "Person not found" };
  }

  return {
    title: `${detail.person.firstName} ${detail.person.lastName} · Studio Staffing Board`,
  };
}

export default async function PersonDetailPage({
  params,
  searchParams,
}: PageProps<"/people/[personId]">) {
  await connection();

  const { personId: rawId } = await params;
  const { month: monthParam } = await searchParams;
  const month = resolveYearMonth(monthParam);
  const personId = parsePersonId(rawId);
  const requestedMonth = Array.isArray(monthParam) ? monthParam[0] : monthParam;

  if (personId === null) {
    notFound();
  }

  if (requestedMonth !== undefined && requestedMonth !== month) {
    redirect(personDetailHref(personId, month));
  }

  const detail = await getPersonDetail(getDb(), personId, month);

  if (!detail) {
    notFound();
  }

  return <PersonDetailView detail={detail} />;
}
