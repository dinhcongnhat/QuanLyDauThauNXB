'use client';

export function WorkflowFormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs leading-5 text-gray-500">
            {description}
          </p>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export type WorkflowStageStatus = 'completed' | 'active' | 'pending';

export function WorkflowStageStepper({
  stages,
}: {
  stages: Array<{
    label: string;
    description: string;
    status: WorkflowStageStatus;
    number?: string | number;
  }>;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-3">
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative flex gap-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                stage.status === 'completed'
                  ? 'bg-green-600 text-white'
                  : stage.status === 'active'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {stage.status === 'completed'
                ? '✓'
                : stage.number ?? index + 1}
            </div>
            <div>
              <p
                className={`text-sm font-semibold ${
                  stage.status === 'pending'
                    ? 'text-gray-400'
                    : 'text-gray-900'
                }`}
              >
                {stage.label}
              </p>
              <p className="mt-0.5 text-xs leading-4 text-gray-500">
                {stage.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
