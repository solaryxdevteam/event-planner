export default function ApprovalsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approvals</h1>
        <p className="text-muted-foreground">Review and approve pending requests</p>
      </div>
      <div className="rounded-lg border bg-card p-8">
        <p className="text-center text-muted-foreground">Approval requests will be displayed here</p>
      </div>
    </div>
  );
}
