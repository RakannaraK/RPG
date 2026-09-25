-- Fase 40 — agenda da mesa (sessões no mundo real) + confirmação de presença.
-- Aditivo e idempotente. O calendário da F29 é o do MUNDO do jogo; este é o da
-- vida real: quando o grupo se encontra.

CREATE TABLE IF NOT EXISTS agenda_mesa (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id      uuid NOT NULL REFERENCES mesas(id) ON DELETE CASCADE,
  titulo       text CHECK (titulo IS NULL OR char_length(titulo) <= 80),
  inicio       timestamptz NOT NULL,
  duracao_min  integer NOT NULL DEFAULT 180 CHECK (duracao_min BETWEEN 15 AND 1440),
  recorrencia  text NOT NULL DEFAULT 'nenhuma'
               CHECK (recorrencia IN ('nenhuma', 'semanal', 'quinzenal', 'mensal')),
  ate          date,                                   -- fim da recorrência (opcional)
  criado_por   uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agenda_mesa_mesa_idx ON agenda_mesa (mesa_id);

-- Resposta por OCORRÊNCIA (o instante de início daquela sessão), para uma
-- agenda semanal ter "vou" desta semana sem valer para a próxima.
CREATE TABLE IF NOT EXISTS presencas_agenda (
  agenda_id    uuid NOT NULL REFERENCES agenda_mesa(id) ON DELETE CASCADE,
  ocorrencia   timestamptz NOT NULL,
  usuario_id   uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  resposta     text NOT NULL CHECK (resposta IN ('vou', 'talvez', 'nao')),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agenda_id, ocorrencia, usuario_id)
);

ALTER TABLE agenda_mesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE presencas_agenda ENABLE ROW LEVEL SECURITY;

-- agenda: membros veem; só quem gere a mesa (dono ou co-mestre) marca, muda e desmarca
DROP POLICY IF EXISTS agenda_select_membro ON agenda_mesa;
CREATE POLICY agenda_select_membro ON agenda_mesa FOR SELECT
  USING (mesa_id IN (SELECT minhas_mesas()));

DROP POLICY IF EXISTS agenda_gestor_insere ON agenda_mesa;
CREATE POLICY agenda_gestor_insere ON agenda_mesa FOR INSERT
  WITH CHECK (sou_gestor(mesa_id) AND criado_por = auth.uid());

DROP POLICY IF EXISTS agenda_gestor_altera ON agenda_mesa;
CREATE POLICY agenda_gestor_altera ON agenda_mesa FOR UPDATE
  USING (sou_gestor(mesa_id)) WITH CHECK (sou_gestor(mesa_id));

DROP POLICY IF EXISTS agenda_gestor_remove ON agenda_mesa;
CREATE POLICY agenda_gestor_remove ON agenda_mesa FOR DELETE
  USING (sou_gestor(mesa_id));

-- presença: todos da mesa veem as respostas; cada um só escreve a PRÓPRIA
-- (o subselect em agenda_mesa passa pela RLS dela: só agenda de mesa sua)
DROP POLICY IF EXISTS presenca_select_membro ON presencas_agenda;
CREATE POLICY presenca_select_membro ON presencas_agenda FOR SELECT
  USING (agenda_id IN (SELECT id FROM agenda_mesa));

DROP POLICY IF EXISTS presenca_propria_insere ON presencas_agenda;
CREATE POLICY presenca_propria_insere ON presencas_agenda FOR INSERT
  WITH CHECK (usuario_id = auth.uid() AND agenda_id IN (SELECT id FROM agenda_mesa));

DROP POLICY IF EXISTS presenca_propria_altera ON presencas_agenda;
CREATE POLICY presenca_propria_altera ON presencas_agenda FOR UPDATE
  USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS presenca_propria_remove ON presencas_agenda;
CREATE POLICY presenca_propria_remove ON presencas_agenda FOR DELETE
  USING (usuario_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON agenda_mesa, presencas_agenda TO authenticated;
REVOKE ALL ON agenda_mesa, presencas_agenda FROM anon;

-- tempo real: quem está com a mesa aberta vê a sessão marcada e as respostas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'agenda_mesa') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE agenda_mesa;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'presencas_agenda') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE presencas_agenda;
  END IF;
END $$;
