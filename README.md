# RPG Ficha

Sistema web para gerenciar fichas de personagem de RPG de mesa. Permite criar mesas, definir sistemas de regras personalizados, criar personagens com rolagem de dados animada, gerenciar equipamentos e galeria de imagens.

## Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- Conta gratuita no [Supabase](https://supabase.com)
- Conta gratuita no [Render](https://render.com) (apenas para deploy)

---

## 1. Configurar o Supabase

### 1.1 Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **New project** e aguarde o banco inicializar

### 1.2 Criar as tabelas e políticas de segurança

1. No painel do Supabase, vá em **SQL Editor**
2. Cole e execute todo o SQL abaixo:

```sql
-- Perfis (extensão do auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Mesas
CREATE TABLE mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  criador_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sistema_id UUID,
  codigo_convite TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membros das mesas
CREATE TABLE membros_mesa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id UUID REFERENCES mesas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('mestre', 'jogador')) DEFAULT 'jogador',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mesa_id, usuario_id)
);

-- Sistemas de regras
CREATE TABLE sistemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  criador_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mesa_id UUID REFERENCES mesas(id) ON DELETE CASCADE,
  is_publico BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atributos do sistema
CREATE TABLE atributos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema_id UUID REFERENCES sistemas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  regra_rolagem JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fichas de personagem
CREATE TABLE fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id UUID REFERENCES mesas(id) ON DELETE CASCADE,
  dono_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sistema_id UUID REFERENCES sistemas(id),
  nome_personagem TEXT NOT NULL,
  raca TEXT,
  classe TEXT,
  nivel INTEGER DEFAULT 1,
  hp_atual INTEGER,
  hp_maximo INTEGER,
  notas TEXT,
  imagem_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valores dos atributos por ficha
CREATE TABLE valores_atributos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  atributo_id UUID REFERENCES atributos(id) ON DELETE CASCADE,
  valor INTEGER NOT NULL,
  dados_rolados JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ficha_id, atributo_id)
);

-- Itens e equipamentos
CREATE TABLE itens_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT CHECK (tipo IN ('arma', 'armadura', 'item', 'magico', 'outro')) DEFAULT 'item',
  atributos_extras JSONB,
  imagem_url TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Galeria de imagens
CREATE TABLE imagens_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('retrato', 'aparencia', 'pet', 'montaria', 'familiar', 'npc', 'outro')) DEFAULT 'outro',
  legenda TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros_mesa ENABLE ROW LEVEL SECURITY;
ALTER TABLE sistemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE atributos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE valores_atributos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_ficha ENABLE ROW LEVEL SECURITY;
ALTER TABLE imagens_ficha ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "perfil próprio" ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "membros veem mesa" ON mesas FOR SELECT
  USING (id IN (SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid()));
CREATE POLICY "criador gerencia mesa" ON mesas FOR ALL USING (criador_id = auth.uid());

CREATE POLICY "ver membros da mesa" ON membros_mesa FOR SELECT
  USING (mesa_id IN (SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid()));
CREATE POLICY "mestre gerencia membros" ON membros_mesa FOR ALL
  USING (mesa_id IN (SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid() AND role = 'mestre'));
CREATE POLICY "jogador entra com convite" ON membros_mesa FOR INSERT WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "dono gerencia ficha" ON fichas FOR ALL USING (dono_id = auth.uid());
CREATE POLICY "membros veem fichas da mesa" ON fichas FOR SELECT
  USING (mesa_id IN (SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid()));

CREATE POLICY "membros veem sistema" ON sistemas FOR SELECT
  USING (mesa_id IN (SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid()));
CREATE POLICY "mestre gerencia sistema" ON sistemas FOR ALL USING (criador_id = auth.uid());

CREATE POLICY "ver atributos do sistema" ON atributos FOR SELECT
  USING (sistema_id IN (
    SELECT id FROM sistemas WHERE mesa_id IN (
      SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid()
    )
  ));
CREATE POLICY "mestre edita atributos" ON atributos FOR ALL
  USING (sistema_id IN (SELECT id FROM sistemas WHERE criador_id = auth.uid()));

CREATE POLICY "dono acessa valores" ON valores_atributos FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));
CREATE POLICY "membros veem valores" ON valores_atributos FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas WHERE mesa_id IN (
    SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid()
  )));

CREATE POLICY "dono acessa itens" ON itens_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));
CREATE POLICY "membros veem itens" ON itens_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas WHERE mesa_id IN (
    SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid()
  )));

CREATE POLICY "dono acessa imagens" ON imagens_ficha FOR ALL
  USING (ficha_id IN (SELECT id FROM fichas WHERE dono_id = auth.uid()));
CREATE POLICY "membros veem imagens" ON imagens_ficha FOR SELECT
  USING (ficha_id IN (SELECT id FROM fichas WHERE mesa_id IN (
    SELECT mesa_id FROM membros_mesa WHERE usuario_id = auth.uid()
  )));
```

### 1.3 Criar os buckets de armazenamento

1. No painel do Supabase, vá em **Storage**
2. Clique em **New bucket** e crie dois buckets (ambos marcados como **Public**):
   - `avatares`
   - `fichas-imagens`
3. No bucket `fichas-imagens`, vá em **Policies** e adicione:

```sql
CREATE POLICY "upload próprio" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fichas-imagens' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "leitura autenticada" ON storage.objects FOR SELECT
  USING (bucket_id = 'fichas-imagens' AND auth.role() = 'authenticated');
```

### 1.4 Pegar as credenciais

1. Vá em **Project Settings → API**
2. Copie a **Project URL** e a **anon/public key**

---

## 2. Rodar localmente

```bash
# Instalar dependências
npm install

# Criar o arquivo de variáveis de ambiente
cp .env.example .env.local
```

Abra `.env.local` e preencha com suas credenciais do Supabase:

```
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANONIMA_PUBLICA
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173)

---

## 3. Deploy no Render

Para que seus amigos acessem online (sem precisar do seu PC ligado):

1. Suba o código para um repositório no **GitHub**
2. Acesse [render.com](https://render.com), crie uma conta gratuita
3. Clique em **New → Static Site** e conecte o repositório
4. Configure o build:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
5. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Clique em **Create Static Site**

O Render gera uma URL pública (ex: `rpg-ficha.onrender.com`) acessível de qualquer dispositivo.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite |
| Estilização | Tailwind CSS v3 |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| Storage | Supabase Storage |
| Deploy | Render |
