import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Exposto no console para testes manuais de RLS (F12). Seguro: a anon key já é
// pública no bundle — qualquer um poderia instanciar o próprio cliente. O que
// protege os dados é o RLS no banco, não o segredo do cliente.
if (typeof window !== 'undefined') window.supabase = supabase
