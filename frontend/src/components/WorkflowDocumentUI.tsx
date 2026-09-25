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

export type WorkflowArrowStage = {
  label: string;
  description?: string;
  status: WorkflowStageStatus;
  number?: string | number;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  meta?: string;
};

/** A compact, horizontally scrollable workflow made from chevron-shaped steps. */
export function WorkflowArrowStepper({
  stages,
  title = 'Tiến trình xử lý',
}: {
  stages: WorkflowArrowStage[];
  title?: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      {title && <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max items-stretch gap-1">
          {stages.map((stage, index) => {
            const isDisabled = stage.disabled;
            const tone =
              stage.status === 'completed'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : stage.status === 'active'
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20 hover:bg-primary-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200';
            const content = (
              <>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black/10 text-[11px] font-bold">
                  {stage.status === 'completed' ? '✓' : stage.number ?? index + 1}
                </span>
                <span className="min-w-0 text-left">
                  <span className="block truncate text-xs font-semibold leading-5 sm:text-sm">{stage.label}</span>
                  {stage.description && <span className="block max-w-[150px] truncate text-[10px] leading-4 opacity-80">{stage.description}</span>}
                  {stage.meta && <span className="block max-w-[150px] truncate text-[10px] font-medium leading-4 opacity-80">{stage.meta}</span>}
                </span>
              </>
            );
            const className = `relative flex min-h-[52px] min-w-[148px] items-center gap-2 px-5 py-2.5 transition-colors first:pl-3 sm:min-w-[170px] sm:px-6 sm:first:pl-4 ${tone} ${stage.selected ? 'ring-2 ring-indigo-300 ring-offset-1' : ''} ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`;
            const style = { clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 14px 50%)' };
            return stage.onClick ? (
              <button key={`${stage.label}-${index}`} type="button" onClick={stage.onClick} disabled={isDisabled} className={className} style={style}>
                {content}
              </button>
            ) : (
              <div key={`${stage.label}-${index}`} aria-current={stage.status === 'active' ? 'step' : undefined} className={className} style={style}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

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
  return <WorkflowArrowStepper stages={stages} />;
}
