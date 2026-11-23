
/* ==========================================
   PETMUNDO - MÓDULO DA COMUNIDADE
   Carregamento das fotos, curtidas e comentários
========================================== */

async function carregarMural(){
const mural=document.getElementById("mural");
mural.innerHTML="<p>Carregando fotos da comunidade...</p>";

const {data:pastas,error:erroPastas}=await supabaseClient.storage.from("petmundo-fotos").list("",{limit:1000});

if(erroPastas){
mural.textContent="Não foi possível carregar as fotos. Verifique a permissão de leitura pública no Supabase.";
console.error(erroPastas);
return;
}

const fotosEncontradas=[];

for(const pasta of(pastas||[])){
if(pasta.id||pasta.metadata)continue;

const {data:arquivos,error}=await supabaseClient.storage.from("petmundo-fotos").list(pasta.name,{limit:100,sortBy:{column:"name",order:"desc"}});

if(error){
console.error("Erro ao listar pasta:",pasta.name,error);
continue;
}

for(const arquivo of(arquivos||[])){
if(!arquivo.name||!arquivo.metadata)continue;

fotosEncontradas.push({
caminho:pasta.name+"/"+arquivo.name,
dono:pasta.name,
nomeArquivo:arquivo.name
});
}
}

fotosEncontradas.sort((a,b)=>b.nomeArquivo.localeCompare(a.nomeArquivo));
mural.innerHTML="";

if(fotosEncontradas.length===0){
mural.innerHTML="<p>Ainda não há fotos publicadas na comunidade.</p>";
return;
}

for(const foto of fotosEncontradas){
const caminho=foto.caminho;
const {data:urlData}=supabaseClient.storage.from("petmundo-fotos").getPublicUrl(caminho);

const nomeAutor=usuarioAtual&&foto.dono===usuarioAtual.id?obterNome(usuarioAtual):"Comunidade PETMUNDO";

const card=document.createElement("div");
card.className="foto-card";

const autor=document.createElement("div");
autor.className="foto-autor";
autor.textContent=nomeAutor;

const imagem=document.createElement("img");
imagem.src=urlData.publicUrl;
imagem.alt="Foto de animal publicada no PETMUNDO";
imagem.loading="lazy";

const legenda=document.createElement("p");
legenda.textContent=localStorage.getItem("petmundo_legenda_"+caminho)||"";

card.appendChild(autor);
card.appendChild(imagem);

if(legenda.textContent)card.appendChild(legenda);

if(usuarioAtual){
const acoes=document.createElement("div");
acoes.className="acoes-foto";

const botaoCurtir=document.createElement("button");
botaoCurtir.className="curtir";
botaoCurtir.textContent="♡ Curtir";

const contador=document.createElement("span");
contador.className="pequeno";

botaoCurtir.onclick=()=>alternarCurtida(caminho,botaoCurtir,contador);

acoes.appendChild(botaoCurtir);
acoes.appendChild(contador);
card.appendChild(acoes);

const tituloComentarios=document.createElement("h3");
tituloComentarios.textContent="Comentários";

const listaComentarios=document.createElement("div");

const campoComentario=document.createElement("input");
campoComentario.type="text";
campoComentario.placeholder="Escreva um comentário...";

const botaoComentar=document.createElement("button");
botaoComentar.textContent="Comentar";
botaoComentar.onclick=()=>publicarComentario(caminho,campoComentario,listaComentarios);

campoComentario.addEventListener("keydown",event=>{
if(event.key==="Enter")publicarComentario(caminho,campoComentario,listaComentarios);
});

card.appendChild(tituloComentarios);
card.appendChild(listaComentarios);
card.appendChild(campoComentario);
card.appendChild(botaoComentar);

await atualizarCurtidas(caminho,botaoCurtir,contador);
await carregarComentarios(caminho,listaComentarios);

}else{
const aviso=document.createElement("p");
aviso.className="pequeno";
aviso.textContent="Entre na sua conta para curtir e comentar.";
card.appendChild(aviso);
}

mural.appendChild(card);
}
}
/* CURTIDAS DAS FOTOS DA COMUNIDADE */

async function alternarCurtida(caminho,botao,contador){
if(!usuarioAtual){alert("Entre na sua conta para curtir fotos.");return;}

const {data:existente,error:erroBusca}=await supabaseClient.from("photo_likes").select("id").eq("photo_path",caminho).eq("user_id",usuarioAtual.id).maybeSingle();

if(erroBusca){alert("Não foi possível verificar a curtida: "+erroBusca.message);return;}

if(existente){
const {error}=await supabaseClient.from("photo_likes").delete().eq("id",existente.id);
if(error){alert("Erro ao retirar curtida: "+error.message);return;}
}else{
const {error}=await supabaseClient.from("photo_likes").insert({photo_path:caminho,user_id:usuarioAtual.id});
if(error){alert("Erro ao curtir: "+error.message);return;}
}

await atualizarCurtidas(caminho,botao,contador);
}

async function atualizarCurtidas(caminho,botao,contador){
const {data:curtidas,error}=await supabaseClient.from("photo_likes").select("id,user_id").eq("photo_path",caminho);

if(error){console.error(error);return;}

const total=curtidas?curtidas.length:0;
contador.textContent=total+(total===1?" curtida":" curtidas");

const curtiu=usuarioAtual&&curtidas.some(c=>c.user_id===usuarioAtual.id);

botao.classList.toggle("ativo",!!curtiu);
botao.textContent=curtiu?"♥ Curtido":"♡ Curtir";
}
