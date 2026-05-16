create or replace function public.get_invoice_full(in_id uuid)
returns json
language plpgsql stable
as $$
declare
  result json;
begin
  select json_build_object(
    'header', row_to_json(i),
    'lines', coalesce(
      (
        select json_agg(row_to_json(l))
        from invoice_lines l
        where l.invoice_id = i.id
      ),
      '[]'::json
    )
  )
  into result
  from invoices i
  where i.id = in_id;

  return result;
end;
$$;
