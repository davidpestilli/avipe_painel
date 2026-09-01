type BaseFieldProps = {
  label: string;
  className?: string;
};

type TextFieldProps = BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
};

type SelectFieldProps = BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  options: string[];
};

type AnalysisSelectProps = Omit<SelectFieldProps, "options">;

type ToggleFieldProps = BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
};

type StatusSelectProps = BaseFieldProps & {
  value: string;
  onChange: (value: string) => void;
  includeNullOption?: boolean;
};

type DateFilterGroupProps = BaseFieldProps & {
  statusValue: string;
  startValue: string;
  endValue: string;
  onStatusChange: (value: string) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  includeNullOption?: boolean;
};

const FIELD_LABEL_CLASS = "mb-2 block text-center text-sm font-medium text-slate-300";
const FIELD_INPUT_CLASS =
  "h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15";

export function ToggleField({ label, value, options, onChange, className = "" }: ToggleFieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <div className="flex h-11 rounded-xl border border-slate-700 bg-slate-950/70 p-1">
        {options.map((option) => (
          <button
            key={option.value}
            className={`flex-1 rounded-lg px-3 text-sm font-semibold transition ${
              value === option.value
                ? "bg-[linear-gradient(135deg,#5b8cff_0%,#7c3aed_100%)] text-white shadow-lg shadow-indigo-500/20"
                : "text-slate-300 hover:bg-slate-900/80 hover:text-white"
            }`}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </label>
  );
}

export function Field({ label, value, onChange, className = "" }: TextFieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <input className={FIELD_INPUT_CLASS} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function DateField({ label, value, onChange, className = "" }: TextFieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <input className={FIELD_INPUT_CLASS} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export function ProcessamentoStatusSelect({ label, value, onChange, className = "", includeNullOption = false }: StatusSelectProps) {
  return (
    <label className={`block ${className}`}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <select className={FIELD_INPUT_CLASS} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        <option value="filled">Com data</option>
        {includeNullOption ? <option value="null">-</option> : null}
      </select>
    </label>
  );
}

export function DateFilterGroup({
  label,
  statusValue,
  startValue,
  endValue,
  onStatusChange,
  onStartChange,
  onEndChange,
  className = "",
  includeNullOption = false,
}: DateFilterGroupProps) {
  const showRange = statusValue === "filled";

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-950/35 p-3 ${className}`}>
      <div className="grid gap-3 md:grid-cols-3">
        <ProcessamentoStatusSelect label={label} value={statusValue} includeNullOption={includeNullOption} onChange={onStatusChange} />
        <DateField label={`${label} de`} value={startValue} onChange={onStartChange} className={showRange ? "" : "invisible pointer-events-none"} />
        <DateField label={`${label} até`} value={endValue} onChange={onEndChange} className={showRange ? "" : "invisible pointer-events-none"} />
      </div>
    </div>
  );
}

export function SelectField({ label, value, options, onChange, className = "" }: SelectFieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <select className={FIELD_INPUT_CLASS} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AnalysisSelect({ label, value, onChange, className = "" }: AnalysisSelectProps) {
  return (
    <label className={`block ${className}`}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <select className={FIELD_INPUT_CLASS} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        <option value="marked">Finalizados</option>
        <option value="pending">Pendentes</option>
      </select>
    </label>
  );
}

export function BinarySelect({ label, value, onChange, className = "", includeNullOption = false }: StatusSelectProps) {
  return (
    <label className={`block ${className}`}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <select className={FIELD_INPUT_CLASS} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        <option value="1">Sim</option>
        {includeNullOption ? <option value="pending">Não ou -</option> : null}
        {includeNullOption ? <option value="null">-</option> : null}
        <option value="0">Não</option>
      </select>
    </label>
  );
}
