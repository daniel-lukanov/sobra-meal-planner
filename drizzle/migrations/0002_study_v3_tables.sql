DELETE FROM public.experiment_sessions;
COMMENT ON TABLE public.experiment_sessions IS 'DEPRECATED: replaced by study_sessions';

CREATE TABLE public.study_sessions (
  session_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL
);
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.shared_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sharer_session_id uuid,
  store text NOT NULL,
  mode text NOT NULL,
  people integer NOT NULL,
  plan_json jsonb NOT NULL,
  total numeric(8,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.shared_plans TO service_role;
ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.spend_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spent_on date NOT NULL,
  channel text NOT NULL,
  amount numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.spend_log TO service_role;
ALTER TABLE public.spend_log ENABLE ROW LEVEL SECURITY;