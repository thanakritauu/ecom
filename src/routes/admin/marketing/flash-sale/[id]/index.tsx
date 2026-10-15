import { Navigate, useParams } from "@solidjs/router";

/** A flash sale campaign opens in its form (the list row carries the summary). */
export default function AdminFlashSaleDetailRedirect() {
  const params = useParams<{ id: string }>();
  return <Navigate href={`/admin/marketing/flash-sale/${params.id}/edit`} />;
}
