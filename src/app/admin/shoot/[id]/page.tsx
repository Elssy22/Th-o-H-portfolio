import ShootEditor from "@/components/admin/ShootEditor";

export default async function ShootPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nouveau?: string }>;
}) {
  const { id } = await params;
  const { nouveau } = await searchParams;
  return <ShootEditor id={id} isNew={nouveau === "1"} />;
}
