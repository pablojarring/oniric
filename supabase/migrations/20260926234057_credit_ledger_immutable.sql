-- El ledger de créditos es inmutable (CLAUDE.md §5): solo se insertan filas.
-- Las correcciones se hacen con movimientos nuevos, nunca editando o borrando.
CREATE FUNCTION public.prevent_credit_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'credit_transactions es inmutable: no se permite %', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER credit_transactions_immutable
BEFORE UPDATE OR DELETE ON public.credit_transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_credit_transaction_changes();
