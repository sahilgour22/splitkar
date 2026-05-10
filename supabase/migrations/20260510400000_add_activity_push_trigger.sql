-- BEFORE APPLYING THIS MIGRATION:
--   1. Enable pg_net extension in Supabase Dashboard → Database → Extensions
--   2. Deploy the edge function:
--        supabase functions deploy send_push_on_activity --no-verify-jwt
--   3. Set the database settings (run once in SQL Editor):
--        ALTER DATABASE postgres
--          SET app.settings.edge_function_url =
--            'https://<project_ref>.supabase.co/functions/v1/send_push_on_activity';
--        ALTER DATABASE postgres
--          SET app.settings.service_role_key = '<service_role_key>';

CREATE OR REPLACE FUNCTION public.notify_activity_push()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _url  text;
  _key  text;
  _body jsonb;
BEGIN
  _url := current_setting('app.settings.edge_function_url', true);
  _key := current_setting('app.settings.service_role_key',  true);

  -- Skip gracefully when pg_net / edge function is not configured
  IF _url IS NULL OR _url = '' THEN
    RETURN NEW;
  END IF;

  _body := jsonb_build_object('activity', row_to_json(NEW)::jsonb);

  PERFORM net.http_post(
    url     := _url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body    := _body::text
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the activity INSERT on notification failure
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activities_after_insert_push ON public.activities;

CREATE TRIGGER activities_after_insert_push
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.notify_activity_push();
