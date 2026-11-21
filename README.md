# POCHOCLO | Pipocas Gourmet — ERP

Site estático (`index.html`) + função de sincronização (`api/data.js`) hospedados na Vercel.
Os dados ficam num banco Redis na nuvem e são sincronizados entre todos os aparelhos que entrarem com a senha.

## Como ativar a sincronização (uma vez só)

1. **Banco de dados:** na Vercel, abra o projeto → **Storage** → **Create Database** → escolha **Upstash (Redis)** → plano gratuito → conecte ao projeto (todos os ambientes).
   A Vercel cria sozinha as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`).
2. **Senha:** em **Settings → Environment Variables**, crie `APP_PASSWORD` com uma senha forte (todos os ambientes).
3. **Publicar de novo:** em **Deployments**, abra o último deploy → **Redeploy**.
4. **Primeiro acesso:** abra o site **no aparelho que tem os dados reais**, digite a senha e aguarde o selo "● Sincronizado". Só depois abra nos outros aparelhos e entre com a mesma senha.

## Como funciona

- O app salva sempre no aparelho (funciona offline) e envia para a nuvem poucos segundos depois de cada alteração.
- A cada ~20 s, e ao voltar para a aba, ele busca mudanças feitas em outros aparelhos.
- Se dois aparelhos mudarem coisas diferentes ao mesmo tempo, as alterações são combinadas. Se mudarem o mesmo registro, vale a do aparelho que sincronizou por último.
- A aba **Backup** mostra o estado e tem botões para sincronizar na hora, usar os dados da nuvem ou enviar os do aparelho.
- Continue baixando um backup (JSON) de vez em quando.
