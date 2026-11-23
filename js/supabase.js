
/* =====================================
   PETMUNDO - CONEXÃO SUPABASE
===================================== */

const SUPABASE_URL = "https://gvltggsagpiikmecyfyq.supabase.co";

const SUPABASE_KEY = "sb_publishable_rejBmiKDT6eXZ53ilpVEBw_niDpV8-P";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

let usuarioAtual = null;

