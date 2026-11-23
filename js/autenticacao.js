
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

    const {data,error}=await supabaseClient.auth.signUp({
        email,
        password:senha,
        options:{data:{full_name:nome}}
    });

    if(error){
        mostrarMensagem("mensagemAcesso",error.message);
        return;
    }

    mostrarMensagem(
        "mensagemAcesso",
        data.session
            ?"Cadastro realizado com sucesso!"
            :"Cadastro realizado! Verifique seu e-mail para confirmar a conta, caso seja solicitado."
    );

    if(data.session){
        usuarioAtual=data.user;
        await atualizarAreaUsuario();
        await carregarMural();
        await carregarResgates();
    }
}

async function entrar(){
    const email=document.getElementById("emailLogin").value.trim();
    const senha=document.getElementById("senhaLogin").value;

    if(!email||!senha){
        mostrarMensagem("mensagemAcesso","Informe seu e-mail e sua senha.");
        return;
    }

    const {data,error}=await supabaseClient.auth.signInWithPassword({
        email,
        password:senha
    });

    if(error){
        mostrarMensagem("mensagemAcesso","Não foi possível entrar: "+error.message);
        return;
    }

    usuarioAtual=data.user;
    await atualizarAreaUsuario();
    await carregarMural();
    await carregarResgates();

    mostrarMensagem("mensagemAcesso","Login realizado com sucesso!");
}

async function atualizarAreaUsuario(){
    const topo=document.getElementById("identificacaoTopo");
    const desconectado=document.getElementById("perfilDesconectado");
    const conectado=document.getElementById("perfilConectado");
    const publicacao=document.getElementById("publicarFoto");
    const area=document.getElementById("areaPublicacao");
    const formularioResgate=document.getElementById("formularioResgate");
    const avisoLoginResgate=document.getElementById("avisoLoginResgate");

    if(!usuarioAtual){
        topo.textContent="Entre ou crie sua conta";
        desconectado.classList.remove("oculto");
        conectado.classList.add("oculto");
        publicacao.classList.add("oculto");
        area.innerHTML="<p>Entre na sua conta para publicar fotos.</p>";
        formularioResgate.classList.add("oculto");
        avisoLoginResgate.classList.remove("oculto");
        document.getElementById("listaMeusPets").innerHTML="";
        return;
    }

    const nome=obterNome(usuarioAtual);

    topo.textContent="Conectado: "+nome;
    document.getElementById("perfilNome").textContent=nome;
    document.getElementById("perfilEmail").textContent=usuarioAtual.email||"";
    document.getElementById("novoNome").value=nome;

    desconectado.classList.add("oculto");
    conectado.classList.remove("oculto");
    publicacao.classList.remove("oculto");
    area.innerHTML="<p>Você está conectado. Publique sua foto abaixo!</p>";
    formularioResgate.classList.remove("oculto");
    avisoLoginResgate.classList.add("oculto");

    await carregarMeusPets();
}

async function atualizarNome(){
    if(!usuarioAtual)return;

    const nome=document.getElementById("novoNome").value.trim();

    if(!nome){
        mostrarMensagem("mensagemPerfil","Digite um nome.");
        return;
    }

    const {error}=await supabaseClient.auth.updateUser({
        data:{full_name:nome}
    });

    if(error){
        mostrarMensagem("mensagemPerfil",error.message);
        return;
    }

    const {data}=await supabaseClient.auth.getUser();
    usuarioAtual=data.user;

    await atualizarAreaUsuario();

    mostrarMensagem("mensagemPerfil","Nome atualizado com sucesso!");
    await carregarMural();
}

async function sair(){
    const {error}=await supabaseClient.auth.signOut();

    if(error){
        mostrarMensagem("mensagemPerfil",error.message);
        return;
    }

    usuarioAtual=null;

    await atualizarAreaUsuario();
    await carregarMural();
    await carregarResgates();

    mostrarMensagem("mensagemAcesso","Você saiu da sua conta.");
}
