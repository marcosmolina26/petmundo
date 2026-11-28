
/* =====================================
   PETMUNDO - AUTENTICAÇÃO
===================================== */

async function cadastrar(){
    const nome=document.getElementById("nomeCadastro").value.trim();
    const email=document.getElementById("emailCadastro").value.trim();
    const senha=document.getElementById("senhaCadastro").value;

    if(!nome||!email||!senha){
        mostrarMensagem("mensagemAcesso","Preencha todos os campos.");
        return;
    }

    if(senha.length<6){
        mostrarMensagem("mensagemAcesso","A senha precisa ter pelo menos 6 caracteres.");
        return;
    }

    try{
        const {data,error}=await supabaseClient.auth.signUp({
            email,
            password:senha,
            options:{data:{full_name:nome}}
        });

        if(error) throw error;

        mostrarMensagem(
            "mensagemAcesso",
            data.session
                ?"Cadastro realizado com sucesso!"
                :"Cadastro realizado! Verifique seu e-mail para confirmar a conta."
        );

        if(data.session){
            usuarioAtual=data.user;
            await atualizarAreaUsuario();
            await carregarMural();
            await carregarResgates();
        }
    }catch(erro){
        mostrarMensagem("mensagemAcesso","Erro no cadastro: "+erro.message);
    }
}

async function entrar(){
    const email=document.getElementById("emailLogin").value.trim();
    const senha=document.getElementById("senhaLogin").value;

    if(!email||!senha){
        mostrarMensagem("mensagemAcesso","Informe seu e-mail e sua senha.");
        return;
    }

    try{
        if(typeof supabaseClient==="undefined"){
            throw new Error("Serviço de login não carregado. Atualize a página.");
        }

        const {data,error}=await supabaseClient.auth.signInWithPassword({
            email,
            password:senha
        });

        if(error) throw error;

        usuarioAtual=data.user;

        await atualizarAreaUsuario();
        await carregarMural();
        await carregarResgates();

        mostrarMensagem("mensagemAcesso","Login realizado com sucesso!");
    }catch(erro){
        console.error("Erro no login PETMUNDO:",erro);

        mostrarMensagem(
            "mensagemAcesso",
            "Não foi possível entrar: "+(erro.message||"Erro inesperado.")
        );
    }
}

async function atualizarAreaUsuario(){
    const topo=document.getElementById("identificacaoTopo");
    const desconectado=document.getElementById("perfilDesconectado");
    const conectado=document.getElementById("perfilConectado");
    const publicacao=document.getElementById("publicarFoto");
    const area=document.getElementById("areaPublicacao");
    const formularioResgate=document.getElementById("formularioResgate");
    const avisoLoginResgate=document.getElementById("avisoLoginResgate");
    const areaPrivada=document.getElementById("meu-petmundo");
    const linkMeuPetmundo=document.querySelector('nav a[href="#meu-petmundo"]');

    if(!usuarioAtual){

        if(topo){
            topo.textContent="Entre ou crie sua conta";
        }

        if(areaPrivada){
            areaPrivada.classList.add("oculto");
        }

        if(linkMeuPetmundo){
            linkMeuPetmundo.classList.add("oculto");
        }

        if(desconectado){
            desconectado.classList.remove("oculto");
        }

        if(conectado){
            conectado.classList.add("oculto");
        }

        if(publicacao){
            publicacao.classList.add("oculto");
        }

        if(area){
            area.innerHTML="<p>Entre na sua conta para publicar fotos.</p>";
        }

        if(formularioResgate){
            formularioResgate.classList.add("oculto");
        }

        if(avisoLoginResgate){
            avisoLoginResgate.classList.remove("oculto");
        }

        const listaPets=document.getElementById("listaMeusPets");

        if(listaPets){
            listaPets.innerHTML="";
        }

        return;
    }

    const nome=obterNome(usuarioAtual);

    if(topo){
        topo.textContent="Conectado: "+nome;
    }

    if(areaPrivada){
        areaPrivada.classList.remove("oculto");
    }

    if(linkMeuPetmundo){
        linkMeuPetmundo.classList.remove("oculto");
    }

    document.getElementById("perfilNome").textContent=nome;
    document.getElementById("perfilEmail").textContent=usuarioAtual.email||"";
    document.getElementById("novoNome").value=nome;

    if(desconectado){
        desconectado.classList.add("oculto");
    }

    if(conectado){
        conectado.classList.remove("oculto");
    }

    if(publicacao){
        publicacao.classList.remove("oculto");
    }

    if(area){
        area.innerHTML="<p>Você está conectado. Publique sua foto abaixo!</p>";
    }

    if(formularioResgate){
        formularioResgate.classList.remove("oculto");
    }

    if(avisoLoginResgate){
        avisoLoginResgate.classList.add("oculto");
    }

    await carregarMeusPets();
}

async function atualizarNome(){
    if(!usuarioAtual) return;

    const nome=document.getElementById("novoNome").value.trim();

    if(!nome){
        mostrarMensagem("mensagemPerfil","Digite um nome.");
        return;
    }

    try{
        const {error}=await supabaseClient.auth.updateUser({
            data:{full_name:nome}
        });

        if(error) throw error;

        const {data}=await supabaseClient.auth.getUser();
        usuarioAtual=data.user;

        await atualizarAreaUsuario();

        mostrarMensagem("mensagemPerfil","Nome atualizado com sucesso!");
        await carregarMural();

    }catch(erro){
        mostrarMensagem("mensagemPerfil","Erro ao atualizar nome: "+erro.message);
    }
}

async function sair(){
    try{
        const {error}=await supabaseClient.auth.signOut();

        if(error) throw error;

        usuarioAtual=null;

        await atualizarAreaUsuario();
        await carregarMural();
        await carregarResgates();

        mostrarMensagem("mensagemAcesso","Você saiu da sua conta.");

    }catch(erro){
        mostrarMensagem("mensagemPerfil","Erro ao sair: "+erro.message);
    }
}
