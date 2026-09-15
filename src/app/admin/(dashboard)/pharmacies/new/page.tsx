import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/card";
import { ProviderForm } from "@/components/admin/provider-form";

export const metadata: Metadata = { title: "Add pharmacy", robots: { index: false, follow: false } };

export default function NewProviderPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Add a pharmacy</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter details from verified public evidence (regulator record, provider website).</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Provider details</CardTitle>
          <CardDescription>Regulator reference and website domain are used to detect duplicates.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProviderForm />
        </CardContent>
      </Card>
    </div>
  );
}
